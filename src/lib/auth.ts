import { config } from "./config";

const APPS_SCRIPT_URL = config.google.authUrl || "";
const isDev = import.meta.env.DEV;

/* ============================
   DEV LOGGING
============================ */
function devLog(...args: unknown[]) {
  if (isDev) console.log("[AUTH]", ...args);
}

function devError(...args: unknown[]) {
  if (isDev) console.error("[AUTH ERROR]", ...args);
}

/* ============================
   TYPES
============================ */
export interface GoogleCredentialResponse {
  credential: string; // Google JWT ID token
  clientId: string;
}

interface BackendAuthResponse {
  status: "AUTHORIZED" | "UNAUTHORIZED";
  email?: string;
  error?: string;
}

/* ============================
   TOKEN VERIFICATION
============================ */
export async function verifyTokenWithBackend(
  token: string
): Promise<{ authorized: boolean; error?: string }> {
  if (!APPS_SCRIPT_URL) {
    devLog("⚠️ Auth backend URL not configured - allowing in development mode");
    if (isDev) {
      return { authorized: true };
    }
    return { authorized: false, error: "Backend URL not configured." };
  }

  // Development bypass if using wrong URL
  if (APPS_SCRIPT_URL.includes("NOT_CONFIGURED") || APPS_SCRIPT_URL === "") {
    devLog("⚠️ Auth URL is NOT_CONFIGURED - bypassing in dev mode");
    if (isDev) {
      return { authorized: true };
    }
    return { authorized: false, error: "Authentication not configured." };
  }

  try {
    devLog("Verifying token with backend...");

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token }).toString(),
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const trimmed = text.trim();

    devLog("Backend raw response:", trimmed);

    // Check if we got a JSON error (wrong Apps Script endpoint)
    if (trimmed.includes('"error"') && trimmed.includes('token')) {
      devError("⚠️ Auth endpoint is returning data API response. Check VITE_APPS_SCRIPT_AUTH_URL");
      return {
        authorized: false,
        error: "Authentication not configured. Using Auth.gs URL instead of DashboardData.gs URL.",
      };
    }

    // Parse legacy format support
    if (trimmed.startsWith("UNAUTHORIZED|")) {
      const email = trimmed.split("|")[1];
      return {
        authorized: false,
        error: `Email "${email}" is not whitelisted.`,
      };
    }

    if (trimmed === "AUTHORIZED") {
      return { authorized: true };
    }

    return {
      authorized: false,
      error: trimmed || "Unknown backend response.",
    };
  } catch (err) {
    devError("Verification failed:", err);

    // Development bypass on auth failure
    if (isDev) {
      devLog("⚠️ Auth failed but allowing in development mode");
      return { authorized: true };
    }

    return {
      authorized: false,
      error:
        err instanceof Error
          ? err.message
          : "Unable to connect to backend.",
    };
  }
}

/* ============================
   TOKEN STORAGE
============================ */

const TOKEN_KEY = "auth_token";

export function storeAuthToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getStoredAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const token = getStoredAuthToken();
  return Boolean(token);
}

/* ============================
   LOGOUT
============================ */

export function logout(): void {
  clearAuthToken();
  window.location.replace("/");
}