# Centralized Configuration Guide

## 📋 Overview

All configuration values (Google Client IDs, API keys, sheet names, URLs, credentials) are now centralized in **environment variables** loaded through a single configuration file.

✅ **No hardcoded credentials anywhere in the codebase**  
✅ **Single source of truth for all configuration**  
✅ **Type-safe configuration access**  
✅ **Easy to manage and update**

---

## 🔧 Configuration Architecture

```
┌─────────────┐
│   .env      │  ← All sensitive values stored here
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│ src/lib/config.ts │  ← Centralized config loader
└──────┬───────────┘
       │
       ↓
┌─────────────────────────────────┐
│ All other files import from here │
└─────────────────────────────────┘
```

---

## 📁 File Structure

### 1. `.env` (Environment Variables)
Contains all configuration values:
```env
# Google Authentication
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_APPS_SCRIPT_AUTH_URL=https://script.google.com/macros/s/.../exec
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/.../exec

# Sheet Names
VITE_SHEET_DASHBOARD=Shahi Dashboard
VITE_SHEET_TRIP_DETAILS=Shahi Reverse PickupTrip Detail
VITE_SHEET_ALLOWED_USERS=AllowedUsers

# API Config
VITE_API_TIMEOUT=15000
VITE_DEBUG_MODE=false
```

### 2. `src/lib/config.ts` (Centralized Config)
Loads and validates all environment variables:
```typescript
export const config = {
  google: {
    clientId: getEnv("VITE_GOOGLE_CLIENT_ID"),
    authUrl: getEnv("VITE_APPS_SCRIPT_AUTH_URL"),
    sheetsApiUrl: getEnv("VITE_GOOGLE_SHEETS_API_URL"),
  },
  sheets: {
    dashboard: getEnv("VITE_SHEET_DASHBOARD", "Shahi Dashboard"),
    tripDetails: getEnv("VITE_SHEET_TRIP_DETAILS", "Shahi Reverse PickupTrip Detail"),
    allowedUsers: getEnv("VITE_SHEET_ALLOWED_USERS", "AllowedUsers"),
  },
  api: {
    timeout: getEnvNumber("VITE_API_TIMEOUT", 15000),
  },
  // ... more config sections
};
```

### 3. All Other Files
Import configuration from `config.ts`:
```typescript
import { config } from '@/lib/config';

// Use config values
const clientId = config.google.clientId;
const timeout = config.api.timeout;
```

---

## 🚀 How to Use

### Import Configuration
```typescript
import { config } from '@/lib/config';
```

### Access Configuration Values
```typescript
// Google Configuration
const clientId = config.google.clientId;
const authUrl = config.google.authUrl;
const sheetsApiUrl = config.google.sheetsApiUrl;

// Sheet Names
const dashboardSheet = config.sheets.dashboard;
const tripSheet = config.sheets.tripDetails;

// API Settings
const timeout = config.api.timeout;
const debugMode = config.app.debugMode;

// Supabase (optional)
const supabaseUrl = config.supabase.url;
```

### Configuration Validation
```typescript
import { validateConfig, isGoogleConfigured, logConfigStatus } from '@/lib/config';

// Check if Google is properly configured
if (!isGoogleConfigured()) {
  console.warn("Google Apps Script not configured");
}

// Validate all required config
const validation = validateConfig();
if (!validation.valid) {
  console.error("Missing configuration:", validation.missing);
}

// Log configuration status (only in debug mode)
logConfigStatus();
```

---

## 📝 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | `123456789-abc.apps.googleusercontent.com` |
| `VITE_APPS_SCRIPT_AUTH_URL` | Auth.gs deployment URL | `https://script.google.com/macros/s/.../exec` |
| `VITE_GOOGLE_SHEETS_API_URL` | DashboardData.gs deployment URL | `https://script.google.com/macros/s/.../exec` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SHEET_DASHBOARD` | `Shahi Dashboard` | Dashboard sheet name |
| `VITE_SHEET_TRIP_DETAILS` | `Shahi Reverse PickupTrip Detail` | Trip details sheet name |
| `VITE_SHEET_ALLOWED_USERS` | `AllowedUsers` | Allowed users sheet name |
| `VITE_API_TIMEOUT` | `15000` | API timeout in milliseconds |
| `VITE_DEBUG_MODE` | `false` | Enable debug logging |
| `VITE_SUPABASE_URL` | - | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | - | Supabase API key |

---

## 🔧 Setup Instructions

### Step 1: Copy .env.example
```bash
cp .env.example .env
```

### Step 2: Update .env with Your Values
```env
VITE_GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID
VITE_APPS_SCRIPT_AUTH_URL=YOUR_ACTUAL_AUTH_URL
VITE_GOOGLE_SHEETS_API_URL=YOUR_ACTUAL_DATA_URL
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

---

## 🧪 Debugging

### Enable Debug Mode
Set in `.env`:
```env
VITE_DEBUG_MODE=true
```

Then restart the server. You'll see configuration status in the console.

### Check Configuration Status
Open browser console and look for:
```
📋 Configuration Status
Google Client ID: ✅ Set
Auth URL: ✅ Set
Sheets API URL: ✅ Configured
Dashboard Sheet: Shahi Dashboard
...
```

### Common Issues

| Problem | Solution |
|---------|----------|
| "Config not working" | Restart dev server after .env changes |
| "Mock data showing" | Check `VITE_GOOGLE_SHEETS_API_URL` is set correctly |
| "Validation failed" | Run `validateConfig()` to see missing values |
| "Type errors" | Make sure to import from `@/lib/config` |

---

## 📦 Files Updated

All files now use centralized config:

✅ `src/lib/config.ts` - **NEW** Centralized configuration  
✅ `src/lib/sheetsApi.ts` - Uses `config` instead of `import.meta.env`  
✅ `src/lib/dashboardApi.ts` - Uses `config` instead of `import.meta.env`  
✅ `src/lib/auth.ts` - Uses `config` instead of `import.meta.env`  
✅ `src/components/Login.tsx` - Uses `config` instead of `import.meta.env`  
✅ `src/integrations/supabase/client.ts` - Uses `config` instead of `import.meta.env`  
✅ `.env` - Organized and documented  
✅ `.env.example` - Updated with all variables  

---

## 🎯 Benefits

### Before (Scattered Configuration)
```typescript
// Different files had different approaches
const url1 = import.meta.env.VITE_GOOGLE_SHEETS_API_URL;
const url2 = import.meta.env.VITE_APPS_SCRIPT_DATA_URL;
const url3 = import.meta.env.VITE_APPS_SCRIPT_AUTH_URL || "NOT_CONFIGURED";

// Sheet names hardcoded
const DASHBOARD_SHEET = "Shahi Dashboard";
```

### After (Centralized Configuration)
```typescript
// Single source of truth
import { config } from '@/lib/config';

const url = config.google.sheetsApiUrl;
const sheetName = config.sheets.dashboard;
```

✅ **Type-safe** - No typos in env variable names  
✅ **Consistent** - Same values everywhere  
✅ **Maintainable** - Update once, applies everywhere  
✅ **Validated** - Automatic validation on load  
✅ **Secure** - No hardcoded credentials  

---

## 🔐 Security Best Practices

1. ✅ **Never commit `.env`** - Already in `.gitignore`
2. ✅ **Keep `.env.example` updated** - For other developers
3. ✅ **Use environment-specific files**:
   - `.env` - Local development
   - `.env.production` - Production build
4. ✅ **Rotate keys regularly** - Update in `.env` only
5. ✅ **Validate configuration** - Use `validateConfig()`

---

## 📚 API Reference

### Main Config Object
```typescript
config.google.clientId: string
config.google.authUrl: string
config.google.sheetsApiUrl: string
config.sheets.dashboard: string
config.sheets.tripDetails: string
config.sheets.allowedUsers: string
config.api.timeout: number
config.app.debugMode: boolean
config.supabase.url: string
config.supabase.publishableKey: string
```

### Helper Functions
```typescript
isGoogleConfigured(): boolean
isSupabaseConfigured(): boolean
getAppsScriptUrl(): string
validateConfig(): { valid: boolean; missing: string[]; warnings: string[] }
logConfigStatus(): void
```

---

## ✅ Checklist

- [x] Created `src/lib/config.ts` with centralized configuration
- [x] Updated `.env` with all required variables
- [x] Updated `.env.example` for other developers
- [x] Migrated all `import.meta.env` usage to `config`
- [x] Added validation functions
- [x] Added debug logging
- [x] No hardcoded credentials remain in code
- [x] Type-safe configuration access

---

## 🆘 Need Help?

1. Check browser console for configuration status
2. Enable debug mode: `VITE_DEBUG_MODE=true`
3. Run validation: `import { validateConfig } from '@/lib/config'`
4. Check this documentation
5. Verify `.env` file exists and has correct values

---

**Last Updated:** February 22, 2026  
**Version:** 1.0.0
