import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ===============================
   CONFIG
================================= */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxV-IR3gzErbmmF6HLrCVkNsVFjoZ8VtJsRimFUnkpkwpBNbYF8TwaacRMPBUa32Zc1IA/exec";

const ALLOWED_ORIGIN = "*";

const ALLOWED_ACTIONS = [
  "getTrips",
  "getAll",
  "getOne",
  "create",
  "update",
  "delete",
] as const;

type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ===============================
   UTILS
================================= */

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function parseJSON(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 10000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/* ===============================
   SERVER
================================= */

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await parseJSON(req);

    if (!body || typeof body.action !== "string") {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    const action = body.action as AllowedAction;

    if (!ALLOWED_ACTIONS.includes(action)) {
      return jsonResponse({ error: "Unauthorized action" }, 403);
    }

    let appsScriptResponse: Response;

    /* ===============================
       READ ACTIONS (GET)
    ================================ */

    if (action === "getTrips") {
      const status = body.status || "ALL";
      const url = `${APPS_SCRIPT_URL}?action=getTrips&status=${encodeURIComponent(
        status
      )}`;

      appsScriptResponse = await fetchWithTimeout(
        url,
        { method: "GET" },
        10000
      );
    }

    else if (action === "getAll") {
      const url = `${APPS_SCRIPT_URL}?action=getAll`;

      appsScriptResponse = await fetchWithTimeout(
        url,
        { method: "GET" },
        10000
      );
    }

    else if (action === "getOne") {
      if (!body.id) {
        return jsonResponse({ error: "ID required" }, 400);
      }

      const url = `${APPS_SCRIPT_URL}?action=getOne&id=${encodeURIComponent(
        body.id
      )}`;

      appsScriptResponse = await fetchWithTimeout(
        url,
        { method: "GET" },
        10000
      );
    }

    /* ===============================
       WRITE ACTIONS (POST)
    ================================ */

    else if (action === "create") {
      appsScriptResponse = await fetchWithTimeout(
        APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            data: body.data || {},
          }),
        },
        10000
      );
    }

    else if (action === "update") {
      if (!body.id) {
        return jsonResponse({ error: "ID required" }, 400);
      }

      appsScriptResponse = await fetchWithTimeout(
        APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            id: body.id,
            data: body.data || {},
          }),
        },
        10000
      );
    }

    else if (action === "delete") {
      if (!body.id) {
        return jsonResponse({ error: "ID required" }, 400);
      }

      appsScriptResponse = await fetchWithTimeout(
        APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            id: body.id,
          }),
        },
        10000
      );
    }

    else {
      return jsonResponse({ error: "Invalid action" }, 400);
    }

    if (!appsScriptResponse.ok) {
      return jsonResponse(
        {
          error: "Apps Script request failed",
          status: appsScriptResponse.status,
        },
        502
      );
    }

    const raw = await appsScriptResponse.text();

    try {
      return jsonResponse(JSON.parse(raw));
    } catch {
      return jsonResponse({ raw });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error";

    return jsonResponse({ error: message }, 500);
  }
});
