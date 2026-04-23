# UPDATE Not Working on Vercel - Complete Fix Guide

## Issue Summary
- ✅ CREATE, DELETE, and Audit Logging work on both **localhost** and **Vercel**
- ❌ UPDATE operations fail on **Vercel** only  
- ✅ UPDATE operations work on **localhost**

This suggests a **data consistency or environment-specific issue**, not a code logic problem.

---

## Root Cause: Most Likely Scenario

### The Problem
In `updateRow()` function in `DashboardData.gs`, there are TWO ways to find and update a row:

**Method 1: Direct Row Number (if `__rowNumber` is provided)**
```gs
const targetRowNumber = Number(updates && updates.__rowNumber);
if (targetRowNumber && targetRowNumber >= 2 && targetRowNumber <= data.length) {
  // Successfully found and updated
  return { success: true, updatedRow: targetRowNumber };
}
```

**Method 2: ID Lookup (fallback)**
```gs
for (let i = 1; i < data.length; i++) {
  if (data[i][idIndex] == idValue) {
    // Successfully found and updated
    return { success: true };
  }
}
```

### Why This Works on Localhost but Not Vercel

**Scenario A: `__rowNumber` is Not Being Sent**
- ❌ Vercel environment: Fresh page load → `sheetRowNumber` might be `undefined` → Falls back to Method 2
- ✅ Localhost: Browser keeps cached row numbers across sessions

**Scenario B: Row Number Mismatch**
- Cache from different session might have stale row numbers
- New row inserted → All subsequent row numbers shifted
- Update tries to use old row number → Finds nothing or updates wrong row

**Scenario C: Different Apps Script URL**
- Localhost using OLD deployment (without latest code)
- Vercel using NEW deployment (with strict row number checks)
- Or vice versa

---

## Diagnostic Steps (REQUIRED TO RESOLVE)

### Step 1: Check Browser Console on Vercel

When you try to UPDATE a trip, open **F12 → Console** and look for these logs:

```javascript
// You should see:
[updateTrip] Updating trip: LY1234567 by: your.email@gmail.com {rowData...}
[updateTrip] Success: { success: true, updatedRow: 5 }
```

**If you see instead:**
```javascript
[updateTrip] Updating trip: LY1234567 by: your.email@gmail.com undefined  // ← __rowNumber missing!
```

**Then the issue is: `trip.sheetRowNumber` is undefined**

---

### Step 2: Check Apps Script Logs for What Was Actually Sent

1. Open **Google Sheets**
2. Go to **Extensions → Apps Script**
3. Look at **Execution Log** (the clock icon)
4. Find recent UPDATE entries
5. Click **Expand** on an UPDATE log

Look for:
```
Parsed form data body: {
  action: "update",
  sheet: "Shahi Reverse Pickup/Trip Details",
  idValue: "LY1234567",
  updates: {"Vehicle No.":"TEST123","__rowNumber":5}    ← Is __rowNumber here?
}
```

**If `__rowNumber` is missing from `updates`, that's the problem!**

---

### Step 3: Test Update with Console (Vercel Only)

Open Vercel site, **F12 → Console**, run this:

```javascript
const apiUrl = 'https://script.google.com/macros/s/AKfycbxyC-oxN7dJ0uPJwe3uQy8j3hC7QdmiObpsTwpgrDN8Sb8iSK_MTXdyY70BR-PYfnxi/exec';

const formData = new URLSearchParams({
  action: 'update',
  sheet: 'Shahi Reverse Pickup/Trip Details',
  idColumn: 'Trip Id',
  idValue: 'LY1234567',  // Use real Trip ID from your sheet
  userEmail: 'test@example.com',
  updates: JSON.stringify({
    'Vehicle No.': 'VERCEL_TEST_123',
    '__rowNumber': 3  // Try row 3
  })
});

fetch(apiUrl, {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(resp => {
  console.log('Response:', resp);
  if (resp.success) {
    console.log('✅ UPDATE WORKED! Check your Sheet.');
  } else {
    console.log('❌ UPDATE FAILED:', resp.error);
  }
})
.catch(e => console.error('Error:', e));
```

**Results:**
- ✅ `{success: true}` → Update API works, issue is with how row number is being sent
- ❌ `{error: "..."}`  → Problem with Apps Script or row lookup
- ❌ Network error → Apps Script URL is wrong

---

## Solutions to Try (in order)

### Solution 1: Force Redeployment (Most Likely to Fix)

Google Apps Script probably needs a fresh deployment:

1. Open Google Sheets → **Extensions → Apps Script**
2. Click **Deploy** → **Manage Deployments**
3. **DELETE** the current deployment (click trash icon)
4. Click **Create Deployment**
5. Select type: **Web App**
6. Execute as: **Your Email** (must be you)
7. Who has access: **Anyone**
8. Click **Deploy**
9. **Copy the NEW URL** (it will be different)
10. Update `.env` file:
    ```env
    VITE_GOOGLE_SHEETS_API_URL=<THE_NEW_URL_YOU_COPIED>
    ```
11. Commit and deploy to Vercel
12. Test UPDATE again

**Why this fixes it:** Old deployment might have cached code or permissions issue

---

### Solution 2: Add Logging to Identify Missing `sheetRowNumber`

In `src/pages/Index.tsx`, add this debug code in `handleSave`:

```typescript
const handleSave = useCallback(async (trip: Trip) => {
  console.log("[DEBUG] Trip being saved:", {
    tripId: trip.tripId,
    sheetRowNumber: trip.sheetRowNumber,
    isEdit: !!editingTrip,
  });

  if (editingTrip && !trip.sheetRowNumber) {
    console.warn("⚠️ WARNING: sheetRowNumber is missing! This might cause update to fail.");
    // Don't prevent save, but make it obvious
  }

  // ... rest of handleSave
}, [editingTrip, toast]);
```

Then test on Vercel and check the console output. This will tell us if the row number is missing.

---

### Solution 3: Fallback ID-Based Update

If `__rowNumber` is consistently missing, update the Apps Script to prefer ID-based lookup:

Modify `DashboardData.gs` line 310-328:

```gs
function updateRow(sheetName, idColumn, idValue, updates, userEmail) {

  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // ✅ CHANGE: Always use ID-based lookup (more reliable)
  const idIndex = headers.indexOf(idColumn);
  if (idIndex === -1) throw new Error("ID column not found");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {
      Object.keys(updates).forEach(key => {
        if (key === "__rowNumber") return;
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1)
               .setValue(updates[key]);
        }
      });

      logAudit(userEmail, "UPDATE", sheetName, idValue, JSON.stringify(updates));
      clearCache();
      return { success: true, updatedRow: i + 1 };
    }
  }

  return { error: "Row ID not found: " + idValue };
}
```

Then redeploy.

---

### Solution 4: Check Cache Isn't Stale

The row numbers might be cached. Force clear it:

In `DashboardData.gs`, modify `clearCache()`:

```gs
function clearCache() {
  const cache = CacheService.getScriptCache();
  cache.removeAll([
    'Shahi Reverse Pickup/Trip Details_100_0',
    'Shahi Reverse Pickup/Trip Details_100_1',
    'Shahi Reverse Pickup/Trip Details_100_2',
    'Shahi Reverse Pickup/Trip Details_100_3',
  ]);
  Logger.log("🧹 Cache cleared after operation");
}
```

---

## Quick Checklist

Before contacting support, verify:

- [ ] Check `sheetRowNumber` in browser console (Step 1)
- [ ] Check Apps Script logs for `__rowNumber` in `updates` (Step 2)  
- [ ] Run the test API call from Vercel console (Step 3)
- [ ] Try force Apps Script redeployment (Solution 1)
- [ ] Check if CREATE/DELETE still work after redeployment
- [ ] Look for any Vercel environment variable differences

---

## Expected Outcome

After **Solution 1 (Redeployment)**:
- ✅ UPDATE should work on Vercel
- ✅ Audit log should show UPDATE entries
- ✅ Data should be updated in Google Sheets immediately

If still not working → Follow **Solutions 2-4** in order

---

## Testing the Fix

1. Create a test trip
2. Edit it (change any field)
3. Save it
4. Check Google Sheets - value should be updated ✅
5. Check Audit Log sheet - new UPDATE entry should appear ✅

---

## Still Not Working?

If after following all steps the update still fails, collect:

1. Full browser console output when trying to update
2. Apps Script execution log for the UPDATE attempt
3. Screenshot of the Audit Log sheet
4. Current `.env` file (VITE_GOOGLE_SHEETS_API_URL value)
5. Error message shown to user (if any)

Then we can diagnose deeper issues.
