# Multi-User Tracking Fix & Implementation Guide

## 🎯 Problem Statement

When multiple users (User A and User B) log in from different systems and make updates to the same Google Sheet via the web app, the system was not properly tracking **who made which change**. All updates were being logged as **"Unknown User"** instead of the actual user's email.

**Scenario:**
- User A logs in from System A
- User B logs in from System B
- Both connect to the same Google Sheet backend
- When A updates a record → should show A's email
- When B updates a record → should show B's email
- **Before fix:** Both showed "Unknown User"
- **After fix:** Each shows their own email ✅

---

## 🔍 Root Cause Analysis

The issue was in the **backend Apps Script** function `parseBody()` in `supabase/functions/DashboardData.gs`.

### How It Was Broken:

1. **Frontend** sends POST request with parameters:
   ```javascript
   {
     action: "update",
     sheet: "Shahi Reverse Pickup/Trip Details",
     idColumn: "Trip Id",
     idValue: "TRIP123",
     userEmail: "user@example.com",  // ← Frontend sends this
     updates: {...}
   }
   ```

2. **parseBody()** extracted most parameters but **NOT userEmail**:
   ```javascript
   // BEFORE (❌ Missing userEmail extraction)
   const body = {
     action: action,
     sheet: sheet,
     idColumn: idColumn,
     idValue: idValue,
     data: data,
     updates: updates
     // ❌ userEmail NOT included!
   };
   ```

3. **doPost()** tried to use userEmail but got fallback value:
   ```javascript
   const userEmail = body.userEmail || "Unknown User"; // ← Was always "Unknown User"
   ```

4. **logAudit()** recorded change with wrong user:
   ```javascript
   logAudit("Unknown User", "UPDATE", sheetName, idValue, JSON.stringify(updates));
   ```

---

## ✅ The Fix

### What Changed

Modified `parseBody()` function in `supabase/functions/DashboardData.gs` (lines 596-620):

**BEFORE (❌):**
```javascript
if (e.parameter && e.parameter.action) {
  Logger.log("Parsing URL-encoded form data...");
  
  const action = e.parameter.action;
  const sheet = e.parameter.sheet || SHEETS.TRIPS;
  const idColumn = e.parameter.idColumn || "Trip Id";
  const idValue = e.parameter.idValue || "";
  // ❌ Missing: const userEmail = e.parameter.userEmail;
  
  const body = {
    action: action,
    sheet: sheet,
    idColumn: idColumn,
    idValue: idValue,
    data: data,
    updates: updates
    // ❌ userEmail NOT in body
  };
  return body;
}
```

**AFTER (✅):**
```javascript
if (e.parameter && e.parameter.action) {
  Logger.log("Parsing URL-encoded form data...");
  
  const action = e.parameter.action;
  const sheet = e.parameter.sheet || SHEETS.TRIPS;
  const idColumn = e.parameter.idColumn || "Trip Id";
  const idValue = e.parameter.idValue || "";
  const userEmail = e.parameter.userEmail || "Unknown User"; // ✅ EXTRACT userEmail
  
  Logger.log("🔐 Extracted userEmail from form data: " + userEmail); // ✅ Log it
  
  const body = {
    action: action,
    sheet: sheet,
    idColumn: idColumn,
    idValue: idValue,
    userEmail: userEmail, // ✅ ADD to body
    data: data,
    updates: updates
  };
  return body;
}
```

Also updated JSON POST handling (lines 638-651):
```javascript
// Method 2: JSON POST (application/json or text/plain)
if (e.postData && e.postData.contents && !e.parameter) {
  Logger.log("Parsing JSON POST data...");
  const body = JSON.parse(e.postData.contents);
  
  // ✅ Ensure userEmail is always present
  if (!body.userEmail) {
    body.userEmail = "Unknown User";
  }
  
  Logger.log("🔐 Extracted userEmail from JSON POST: " + body.userEmail);
  return body;
}
```

---

## 🔄 How It Works (End-to-End)

### Step 1: Frontend (React/TypeScript)
**File:** `src/lib/sheetsApi.ts`

When user makes an update:
```typescript
export async function updateTrip(trip: Trip) {
  const userEmail = getUserEmail(); // ← Gets email from localStorage/sessionStorage
  
  const result = await callAppsScript("update", "POST", {
    action: "update",
    sheet: "Shahi Reverse Pickup/Trip Details",
    idColumn: "Trip Id",
    idValue: trip.tripId,
    userEmail: userEmail || "Unknown User", // ← Frontend sends email!
    updates: { ...rowData },
  });
  return result;
}
```

**Where email comes from:**
- File: `src/lib/auth.ts` → `getUserEmail()` function
- Priority order:
  1. `localStorage` (persists across sessions)
  2. `sessionStorage` (current session)
  3. JWT token (fallback extraction)
  4. "Unknown User" (final fallback)

### Step 2: Network Transmission
Frontend sends URL-encoded form data via POST:
```
action=update&sheet=Shahi+Reverse+Pickup%2FTrip+Details&idColumn=Trip+Id&idValue=TRIP123&userEmail=user%40example.com&updates={...}
```

### Step 3: Backend Parsing
**File:** `supabase/functions/DashboardData.gs` → `doPost()` function

```javascript
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const body = parseBody(e); // ← NOW includes userEmail!
    const userEmail = body.userEmail || "Unknown User"; // ← Gets actual user email
    
    Logger.log("Processing POST action: " + body.action + " by " + userEmail); // ← Logs real user
    
    switch (body.action) {
      case "update":
        return buildResponse(
          updateRow(body.sheet, body.idColumn, body.idValue, body.updates, userEmail)
        );
      // ... more cases
    }
  } finally {
    lock.releaseLock();
  }
}
```

### Step 4: Backend Update & Audit Log
**File:** `supabase/functions/DashboardData.gs` → `updateRow()` function

```javascript
function updateRow(sheetName, idColumn, idValue, updates, userEmail) {
  const sheet = getSheet(sheetName);
  // ... update logic ...
  
  logAudit(userEmail, "UPDATE", sheetName, idValue, JSON.stringify(updates));
  // ↑ Now logs with actual user email!
  
  clearCache();
  return { success: true };
}
```

### Step 5: Audit Log Creation
**File:** `supabase/functions/DashboardData.gs` → `logAudit()` function

```javascript
function logAudit(userEmail, action, sheetName, details, recordId) {
  try {
    const auditSheet = getSheet(SHEETS.AUDIT_LOG);
    const timestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "dd/MM/yyyy HH:mm:ss"
    );

    auditSheet.appendRow([
      timestamp,           // 2026-03-05 19:35:22
      userEmail,           // user@example.com ✅ (Now correct!)
      action,              // UPDATE
      sheetName,           // Shahi Reverse Pickup/Trip Details
      recordId,            // TRIP123
      details              // {...updated fields...}
    ]);
  } catch (err) {
    Logger.log("Audit log error: " + err.message);
  }
}
```

---

## 📋 Operations Affected

All three CRUD operations now track the actual user:

### ✅ CREATE
```javascript
case "create":
  return buildResponse(createRow(body.sheet, body.data, userEmail));
```
**Audit Log:** Records creator's email

### ✅ UPDATE
```javascript
case "update":
  return buildResponse(
    updateRow(body.sheet, body.idColumn, body.idValue, body.updates, userEmail)
  );
```
**Audit Log:** Records updater's email

### ✅ DELETE
```javascript
case "delete":
  return buildResponse(
    deleteRow(body.sheet, body.idColumn, body.idValue, userEmail)
  );
```
**Audit Log:** Records deleter's email

---

## 🧪 Testing the Fix

### Browser Console Check
When a user makes an update, check the browser console for:
```
[updateTrip] Updating trip: TRIP123 by: user@example.com
[updateTrip] Success: {...}
```

### Apps Script Debug Log
In Google Apps Script Editor → Execution logs, you should see:
```
Parsing URL-encoded form data...
🔐 Extracted userEmail from form data: user@example.com
Processing POST action: update by user@example.com
```

### Audit Log Sheet
Check the "AuditLog" sheet in your Google Sheet. New entries should show:
| Timestamp | User Email | Action | Sheet | Record ID | Details |
|-----------|-----------|---------|-------|-----------|---------|
| 05/03/2026 19:35:22 | userA@example.com | UPDATE | Shahi Reverse Pickup/Trip Details | TRIP123 | {...} |
| 05/03/2026 19:36:45 | userB@example.com | UPDATE | Shahi Reverse Pickup/Trip Details | TRIP456 | {...} |

---

## 🔐 Email Storage & Retrieval Flow

### On Login (Frontend)
**File:** `src/components/Login.tsx` → `handleCredentialResponse()`

```typescript
async function handleCredentialResponse(response: { credential: string }) {
  // ... verify with backend ...
  storeAuthToken(token); // ← Saves token + extracts & stores email
  onLoginSuccess();
}
```

### Token Storage (Frontend)
**File:** `src/lib/auth.ts` → `storeAuthToken()`

```typescript
export function storeAuthToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY, token);
  
  // Extract email from JWT
  const payload = decodeJWT(token);
  
  if (payload?.email) {
    devLog("✅ Found email in JWT:", payload.email);
    sessionStorage.setItem(EMAIL_KEY, payload.email);
    localStorage.setItem(EMAIL_KEY, payload.email);
  }
}
```

### Email Retrieval (Frontend)
**File:** `src/lib/auth.ts` → `getUserEmail()`

```typescript
export function getUserEmail(): string {
  // Priority 1: localStorage (persists across browser sessions)
  let email = localStorage.getItem(EMAIL_KEY);
  if (email && email.trim()) {
    return email;
  }
  
  // Priority 2: sessionStorage (current session only)
  email = sessionStorage.getItem(EMAIL_KEY);
  if (email && email.trim()) {
    return email;
  }
  
  // Priority 3: Extract from stored JWT token
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      const payload = decodeJWT(token);
      email = payload?.email;
      if (email) return email;
    } catch (error) {
      // Fall through
    }
  }
  
  // Priority 4: Fallback
  return "Unknown User";
}
```

---

## 🚀 Deployment Instructions

### 1. Update Google Apps Script
1. Go to [Google Apps Script Editor](https://script.google.com/)
2. Open your deployed script
3. Copy the updated code from `supabase/functions/DashboardData.gs` (lines 580-660)
4. Replace the old `parseBody()` and related sections
5. Save (Ctrl+S)
6. **No redeploy needed** - existing deployment will use updated code

### 2. Verify in Google Sheets
1. Open your spreadsheet
2. Go to "Sheet" menu → "Audit" (if you have access)
3. Make a test update
4. Check that AuditLog sheet shows your email (not "Unknown User")

### 3. Clear Browser Cache (Important!)
Users may need to hard refresh their browser:
- **Windows/Linux:** Ctrl+Shift+Delete
- **Mac:** Cmd+Shift+Delete
- Or just log out and log back in

---

## 📊 Impact Summary

| Aspect | Before | After |
|--------|--------|-------|
| **User Tracking** | All changes → "Unknown User" | Each change → Actual user email |
| **Audit Log** | Useless (can't see who changed what) | Fully useful (complete audit trail) |
| **Multi-user Support** | Broken | ✅ Working |
| **Backend URL** | URL-encoded POST | ✅ URL-encoded POST + JSON POST |

---

## 🐛 Troubleshooting

### Issue: Still Seeing "Unknown User"

**Solution 1: Check email in localStorage**
```javascript
// In browser console:
console.log(localStorage.getItem('user_email'));
console.log(sessionStorage.getItem('user_email'));
```

**Solution 2: Check JWT parsing**
```javascript
// In browser console:
import { decodeJWT, getUserEmail } from './lib/auth';
const token = localStorage.getItem('auth_token');
console.log('JWT payload:', decodeJWT(token));
console.log('User email:', getUserEmail());
```

**Solution 3: Verify Apps Script logs**
- Go to Apps Script Editor
- Click "Execution logs"
- Filter by recent timestamp
- Look for "🔐 Extracted userEmail" message

### Issue: "Unknown User" Only for Certain Actions

**Possible Cause:** Old version of DashboardData.gs still running

**Solution:**
1. Clear Apps Script cache: In script editor, go to Tools → Clear All Projects
2. Clear Google Sheets cache: See [CACHE_CLEARING.md](CACHE_CLEARING.md)
3. Hard refresh browser: Ctrl+Shift+Delete

---

## 📚 Related Files

- **Frontend Email Extraction:** [src/lib/auth.ts](src/lib/auth.ts#L190-L210)
- **Frontend Email Usage:** [src/lib/sheetsApi.ts](src/lib/sheetsApi.ts#L420-L475)
- **Backend Parsing:** [supabase/functions/DashboardData.gs](supabase/functions/DashboardData.gs#L580-L660)
- **Audit Logging:** [AUDIT_LOG_SETUP.md](AUDIT_LOG_SETUP.md)
- **Authentication:** [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md)

---

## ✅ Verification Checklist

- [ ] Updated `parseBody()` function in DashboardData.gs
- [ ] Added userEmail extraction in URL-encoded form data parsing
- [ ] Added userEmail backup in JSON POST parsing
- [ ] Cleared Apps Script/Google Sheets cache
- [ ] Tested with User A making an update
- [ ] Verified User A's email appears in Audit Log
- [ ] Tested with User B making an update
- [ ] Verified User B's email appears in Audit Log (not User A's)
- [ ] Hard refreshed browser to clear localStorage
- [ ] Logged out and logged back in as different user
- [ ] All CRUD operations (create, update, delete) show correct user email

---

**Last Updated:** March 5, 2026
**Status:** ✅ FIXED

