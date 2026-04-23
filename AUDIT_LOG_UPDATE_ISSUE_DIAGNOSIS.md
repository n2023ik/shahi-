# Audit Log & Update Issue Diagnosis

## Problem Summary
- ✅ **CREATE** operations: Show in audit log ✓
- ✅ **DELETE** operations: Show in audit log ✓
- ❌ **UPDATE** operations: Data NOT updating in **Vercel** 
- ✅ **UPDATE** operations: Data UPDATES correctly on **localhost**
- ✅ Audit log records are being created (CREATE/DELETE show up)

## Root Cause Analysis

### What This Tells Us
1. **Audit logging IS working** → The three CRUD operations reach the backend and execute `logAudit()`
2. **Update fails on Vercel only** → Something is different between environments
3. **Create/Delete work fine** → Suggests the update logic specifically has an issue

### Probable Causes

#### Hypothesis 1: Different Apps Script Deployment URLs 🔍
**Localhost** might be using an older/newer version than **Vercel**

**Check:** Are both environments using the same `VITE_GOOGLE_SHEETS_API_URL`?

**Current Config (.env):**
```
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/AKfycbxyC-oxN7dJ0uPJwe3uQy8j3hC7QdmiObpsTwpgrDN8Sb8iSK_MTXdyY70BR-PYfnxi/exec
```

---

#### Hypothesis 2: Update Logic Issue - Row Lookup 🔍
The `updateRow()` function has TWO ways to find a row:

**Option A: Using `__rowNumber` (faster)**
```gs
const targetRowNumber = Number(updates && updates.__rowNumber);
if (targetRowNumber && targetRowNumber >= 2 && targetRowNumber <= data.length) {
  // Update by direct row index
  sheet.getRange(targetRowNumber, colIndex + 1).setValue(updates[key]);
}
```

**Option B: Using ID lookup (fallback)**
```gs
for (let i = 1; i < data.length; i++) {
  if (data[i][idIndex] == idValue) {
    // Update by finding ID in column
    sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
  }
}
```

**Problem:** If `__rowNumber` is not being passed correctly, it tries Option B which might fail if data structure changed.

---

#### Hypothesis 3: Different Cached Data Between Env 🔍
- **localhost**: Might have cleared cache manually or via browser refresh
- **Vercel**: Might be using stale cached row numbers from previous session

Cache key format: `"Shahi Reverse Pickup/Trip Details"_100_0`

---

#### Hypothesis 4: POST Data Format Issue 🔍
Frontend sends URL-encoded form data with `__rowNumber` in updates object, but Vercel might be receiving it differently.

---

## Diagnostic Checklist

### ✅ Step 1: Verify Both Environments Use Same Apps Script URL

**On localhost (F12 Console):**
```javascript
fetch('YOUR_VITE_GOOGLE_SHEETS_API_URL?action=whoami').then(r => r.text()).then(console.log)
```

**On Vercel (F12 Console):**
```javascript
fetch('YOUR_VITE_GOOGLE_SHEETS_API_URL?action=whoami').then(r => r.text()).then(console.log)
```

Compare the URLs. If different = **PROBLEM FOUND** ❌

### ✅ Step 2: Check Apps Script Logs

In Google Apps Script (Extensions → Apps Script):
1. Go to **Execution log** (clock icon)
2. Filter by "update" action
3. Look at the `Logger.log()` outputs:

**Expected for UPDATE on Vercel:**
```
Content-Type: application/x-www-form-urlencoded
Parsing URL-encoded form data...
🔐 Extracted userEmail from form data: your.email@example.com
Parsed form data body: {...__rowNumber: 5, ...}
Processing POST action: update by your.email@example.com
```

**If you see:**
- ❌ `__rowNumber: undefined` → Frontend not sending it
- ❌ No log entry → Apps Script URL wrong
- ❌ `userEmail: Unknown User` → But CREATE/DELETE show real email = parsing issue

### ✅ Step 3: Test Raw API Call (Vercel Only)

In Vercel deployed site, open F12 Console and run:

```javascript
const url = 'YOUR_VITE_GOOGLE_SHEETS_API_URL';
const formData = new URLSearchParams({
  action: 'update',
  sheet: 'Shahi Reverse Pickup/Trip Details',
  idColumn: 'Trip Id',
  idValue: 'LY1234567',  // Use a real Trip ID from your sheet
  userEmail: 'test@example.com',
  updates: JSON.stringify({
    'Vehicle No.': 'TEST123',
    __rowNumber: 5  // Try a known row number
  })
});

fetch(url, {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Success Response:** `{success: true, updatedRow: 5}`
**Failure Response:** `{error: "..."}`

---

## Quick Fixes to Try

### Fix 1: Force Redeployment of Apps Script
This ensures latest code is live:

1. Google Sheets → Extensions → Apps Script
2. Delete ALL existing deployments (Manage deployments)
3. Create NEW deployment:
   - Type: "New deployment"
   - Select type: "Web app"
   - Execute as: "Me" (your Google account)
   - Who has access: "Anyone"
4. Copy the NEW URL → add to `.env` as `VITE_GOOGLE_SHEETS_API_URL`
5. Redeploy Vercel

---

### Fix 2: Test with Explicit Row Number
If `__rowNumber` is missing, manually add it temporarily in `Index.tsx`:

```tsx
const handleSave = useCallback(async (trip: Trip) => {
  if (editingTrip) {
    // For debugging: add explicit row number
    console.log("Trip row number:", trip.sheetRowNumber);
    if (!trip.sheetRowNumber) {
      console.warn("⚠️ WARNING: sheetRowNumber is missing!");
    }
  }
  // ... rest of handleSave
}, [editingTrip]);
```

---

### Fix 3: Check Cache is Being Cleared
Add this to Vercel logs:

In `DashboardData.gs`, the `clearCache()` function should be:
```gs
function clearCache() {
  const cache = CacheService.getScriptCache();
  cache.removeAll([
    'Shahi Reverse Pickup/Trip Details_100_0',
    'Shahi Reverse Pickup/Trip Details_100_1',
    // ... etc
  ]);
  Logger.log("Cache cleared after update");
}
```

---

## What's Working vs Not Working

| Operation | Local | Vercel | Audit Log | Status |
|-----------|:-----:|:------:|:---------:|--------|
| CREATE    |  ✅   |   ✅   |    ✅     | Working |
| DELETE    |  ✅   |   ✅   |    ✅     | Working |
| UPDATE    |  ✅   |   ❌   |    ✅     | **BROKEN on Vercel** |

For **UPDATE to fail but audit log to succeed** means:
- ✅ API call reached backend
- ✅ `logAudit()` executed
- ❌ `sheet.getRange().setValue()` either didn't execute or failed

---

## Next Steps

1. **Run Diagnostic Checklist above** (Steps 1-3)
2. **Check Apps Script Execution Log** for UPDATE logs with `__rowNumber`
3. **Test Raw API Call** from Vercel console
4. **Try Force Redeployment of Apps Script**
5. **Share findings** + execution logs + API test results

---

*Last Updated: 2026-03-05*
