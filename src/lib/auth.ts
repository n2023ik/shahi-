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
const EMAIL_KEY = "user_email";

// Simple function to manually store email (fallback)
export function storeUserEmail(email: string): void {
  if (email) {
    localStorage.setItem(EMAIL_KEY, email); // Use localStorage for persistence
    sessionStorage.setItem(EMAIL_KEY, email);
    devLog("✅ Stored email in both storages:", email);
  }
}

/**
 * Decode JWT token without verification (client-side only)
 * For user display purposes - actual verification happens on backend
 */
export function decodeJWT(token: string): { email?: string; name?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    devLog("✅ JWT Decoded - ALL FIELDS:", Object.keys(payload));
    devLog("✅ Full JWT Payload:", payload);
    return payload;
  } catch (err) {
    devError("Failed to decode JWT:", err);
    return null;
  }
}

export function storeAuthToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY, token);
  
  // Extract and store email from JWT
  const payload = decodeJWT(token);
  
  if (payload?.email) {
    devLog("✅ Found email in JWT:", payload.email);
    sessionStorage.setItem(EMAIL_KEY, payload.email);
    localStorage.setItem(EMAIL_KEY, payload.email);
  } else {
    devError("❌ No 'email' field in JWT. Available fields:", Object.keys(payload || {}));
    // Try alternative field names
    const emailFromPayload = (payload as any)?.email || (payload as any)?.sub || (payload as any)?.preferred_email || "";
    if (emailFromPayload && emailFromPayload !== payload?.sub) {
      devLog("✅ Using fallback email field:", emailFromPayload);
      sessionStorage.setItem(EMAIL_KEY, emailFromPayload);
      localStorage.setItem(EMAIL_KEY, emailFromPayload);
    }
  }
}

export function getStoredAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getUserEmail(): string {
  // Try localStorage first (persists across sessions)
  let email = localStorage.getItem(EMAIL_KEY);
  if (email && email.trim()) {
    devLog("✅ Email from localStorage:", email);
    return email;
  }

  // Try sessionStorage (current session)
  email = sessionStorage.getItem(EMAIL_KEY);
  if (email && email.trim()) {
    devLog("✅ Email from sessionStorage:", email);
    return email;
  }

  // Try to extract from stored token if available
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      const payload = decodeJWT(token);
      email = payload?.email || (payload as any)?.sub;
      if (email) {
        devLog("✅ Email extracted from JWT:", email);
        return email;
      }
    } catch (error) {
      devError("Failed to extract email from JWT:", error);
    }
  }

  devLog("❌ No email found - returning 'Unknown User'");
  return "Unknown User";
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
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