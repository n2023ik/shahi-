/**
 * ============================================
 * CENTRALIZED APPLICATION CONFIGURATION
 * ============================================
 * 
 * All environment variables are loaded here.
 * No hardcoded credentials, API keys, or sheet IDs anywhere else.
 * 
 * Usage:
 *   import { config } from '@/lib/config';
 *   const clientId = config.google.clientId;
 */

/**
 * Type-safe environment variable getter
 */
function getEnv(key: string, defaultValue = ""): string {
  return import.meta.env[key] || defaultValue;
}

function getEnvBoolean(key: string, defaultValue = false): boolean {
  const value = import.meta.env[key]?.toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return defaultValue;
}

function getEnvNumber(key: string, defaultValue = 0): number {
  const value = import.meta.env[key];
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * ============================================
 * MAIN CONFIGURATION OBJECT
 * ============================================
 */
export const config = {
  /**
   * Google Authentication & API Configuration
   */
  google: {
    clientId: getEnv("VITE_GOOGLE_CLIENT_ID"),
    authUrl: getEnv("VITE_APPS_SCRIPT_AUTH_URL"),
    sheetsApiUrl: getEnv("VITE_GOOGLE_SHEETS_API_URL"),
    
    // Fallback URLs for backward compatibility
    dataUrl: getEnv("VITE_APPS_SCRIPT_DATA_URL"),
  },

  /**
   * Google Sheets Configuration
   */
  sheets: {
    dashboard: getEnv("VITE_SHEET_DASHBOARD", "Shahi Dashboard"),
    tripDetails: getEnv("VITE_SHEET_TRIP_DETAILS", "Shahi Reverse PickupTrip Detail"),
    allowedUsers: getEnv("VITE_SHEET_ALLOWED_USERS", "AllowedUsers"),
  },

  /**
   * API Configuration
   */
  api: {
    timeout: getEnvNumber("VITE_API_TIMEOUT", 15000),
    retryAttempts: getEnvNumber("VITE_API_RETRY_ATTEMPTS", 3),
  },

  /**
   * Application Settings
   */
  app: {
    debugMode: getEnvBoolean("VITE_DEBUG_MODE", false),
    environment: getEnv("VITE_ENVIRONMENT", "development"),
  },

  /**
   * Supabase Configuration (Optional)
   */
  supabase: {
    url: getEnv("VITE_SUPABASE_URL"),
    publishableKey: getEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  },
} as const;

/**
 * ============================================
 * CONFIGURATION VALIDATION
 * ============================================
 */

/**
 * Check if Google Apps Script is configured
 */
export function isGoogleConfigured(): boolean {
  return !!(
    config.google.clientId &&
    config.google.authUrl &&
    config.google.sheetsApiUrl &&
    config.google.sheetsApiUrl !== "YOUR_DEPLOYMENT_URL_HERE" &&
    !config.google.sheetsApiUrl.includes("YOUR_")
  );
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(config.supabase.url && config.supabase.publishableKey);
}

/**
 * Get the primary Apps Script URL (tries multiple sources)
 */
export function getAppsScriptUrl(): string {
  return (
    config.google.sheetsApiUrl ||
    config.google.dataUrl ||
    config.google.authUrl ||
    "NOT_CONFIGURED"
  );
}

/**
 * Validate required configuration
 */
export function validateConfig(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!config.google.clientId) {
    missing.push("VITE_GOOGLE_CLIENT_ID");
  }

  if (!config.google.authUrl) {
    warnings.push("VITE_APPS_SCRIPT_AUTH_URL (authentication may not work)");
  }

  if (!isGoogleConfigured()) {
    missing.push("VITE_GOOGLE_SHEETS_API_URL (using mock data)");
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * ============================================
 * DEBUG UTILITIES
 * ============================================
 */

/**
 * Log configuration status (safe - no sensitive data)
 */
export function logConfigStatus(): void {
  if (!config.app.debugMode) return;

  console.group("📋 Configuration Status");
  console.log("Google Client ID:", config.google.clientId ? "✅ Set" : "❌ Missing");
  console.log("Auth URL:", config.google.authUrl ? "✅ Set" : "❌ Missing");
  console.log("Sheets API URL:", isGoogleConfigured() ? "✅ Configured" : "❌ Not configured");
  console.log("Dashboard Sheet:", config.sheets.dashboard);
  console.log("Trip Details Sheet:", config.sheets.tripDetails);
  console.log("Debug Mode:", config.app.debugMode ? "🔍 Enabled" : "Disabled");
  
  const validation = validateConfig();
  if (validation.missing.length > 0) {
    console.warn("⚠️ Missing configuration:", validation.missing);
  }
  if (validation.warnings.length > 0) {
    console.warn("⚠️ Warnings:", validation.warnings);
  }
  console.groupEnd();
}

// Auto-log on module load if debug mode is enabled
if (config.app.debugMode) {
  logConfigStatus();
}

/**
 * ============================================
 * TYPE EXPORTS
 * ============================================
 */
export type Config = typeof config;
export type SheetNames = typeof config.sheets;
