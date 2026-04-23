# 🔧 Quick Action Plan: Fix UPDATE Not Working on Vercel

**Status:** ✅ Audit log recording works | ❌ Data not updating on Vercel | ✅ Works on localhost

---

## What's Happening

1. **CREATE** → Creates row + Saves audit log ✅
2. **DELETE** → Deletes row + Saves audit log ✅  
3. **UPDATE** → Saves audit log BUT doesn't update data ❌ (Vercel only)

This means the update request is reaching Google Sheets but isn't actually updating the cells.

---

## Immediate Action: 3-Step Fix

### STEP 1: Verify Current Situation (5 min)

Open **F12 → Console** on your **Vercel site** and try to update a trip:

What to look for in console:
```javascript
// You should see these logs:
[updateTrip] Updating trip: LY1234567 by: yourname@gmail.com

// If you see this, STOP - there's a problem:
[updateTrip] Updating trip: LY1234567 by: yourname@gmail.com undefined
```

**If shows "undefined"** → Go directly to **STEP 3**  
**If looks normal** → Continue to **STEP 2**

---

### STEP 2: Redeploy Apps Script (Most Likely Fix)

This is the #1 cause of local working vs Vercel not working.

#### A. Deploy New Version
1. Open Google Sheets
2. **Extensions → Apps Script**
3. Click **Deploy** → **Manage deployments**
4. Click **🗑️ Delete** on existing deployment
5. Click **+ Create Deployment**
   - Type: **Web App**
   - Execute as: **Your Email** (must be YOUR account)
   - Accessible to: **Anyone**
   - Click **Deploy**
6. **Copy the NEW URL** (it starts with `https://script.google.com/macros/s/...`)

#### B. Update Environment
1. Open `.env` in your code
2. Update this line with the NEW URL you copied:
   ```env
   VITE_GOOGLE_SHEETS_API_URL=<PASTE_NEW_URL_HERE>
   ```
   - Keep everything else the same
   - Do NOT add `/exec` - it should already be at the end

3. **Commit and push to GitHub**
4. **Wait for Vercel to redeploy** (watch the deployment status)

#### C. Test Update
- Go to Vercel site
- Try to update a trip
- Check Google Sheet - should see updated value ✅

---

### STEP 3: If Still Not Working - Enable Debug Logging

Add this to see exactly what's being sent:

Edit `src/lib/sheetsApi.ts` around line 458, change:

```typescript
// BEFORE:
const result = await callAppsScript("update", "POST", {

// AFTER: Add logging
console.log("[DEBUG] About to call update API with trip:", {
  tripId: trip.tripId,
  sheetRowNumber: trip.sheetRowNumber,
  rowData: rowData,
});
const result = await callAppsScript("update", "POST", {
```

Then:
1. Commit & push  
2. Wait for Vercel redeploy
3. Open Vercel site, **F12 → Console**
4. Try to update a trip
5. **Screenshot the console output**
6. **Check Audit Log in Google Sheets** - what does it say under "Details"?

---

## Alternative: Test API Directly

If you want to test without UI:

**Open F12 in Vercel site, paste this in Console:**

```javascript
const apiUrl = 'YOUR_VITE_GOOGLE_SHEETS_API_URL';
const fd = new URLSearchParams({
  action: 'update',
  sheet: 'Shahi Reverse Pickup/Trip Details',
  idColumn: 'Trip Id',
  idValue: 'LY1234567',  // REPLACE WITH REAL TRIP ID
  userEmail: 'test@example.com',
  updates: JSON.stringify({
    'Vehicle No.': 'DIRECT_TEST_999',
    '__rowNumber': 2
  })
});

fetch(apiUrl, { method: 'POST', body: fd })
  .then(r => r.json())
  .then(d => console.log('Result:', d));
```

Replace `YOUR_VITE_GOOGLE_SHEETS_API_URL` with value from `.env`

**Result:**
- ✅ `{success: true}` → API works, issue is elsewhere
- ❌ `{error: "..."}` → Apps Script issue  
- ❌ Network error → Wrong URL

---

## Most Likely Root Cause

**The Apps Script hasn't been redeployed since you added update functionality.**

Old deployment might:
- Not have the latest code
- Have permission issues
- Have cached settings

**Fix:** Follow STEP 2 above (takes 5 minutes)

---

## Files to Check (if needed)

- `.env` → Has `VITE_GOOGLE_SHEETS_API_URL`
- `src/lib/sheetsApi.ts` → UPDATE code (lines 453-475)
- `supabase/functions/DashboardData.gs` → Backend UPDATE code (lines 310-350)

---

## Summary

| Issue | Fix | Time |
|-------|-----|------|
| Update not working on Vercel | Redeploy Apps Script | 5 min |
| sheetRowNumber undefined | Check browser logs | 5 min |
| Still broken | Enable debug logging + test API | 10 min |

---

**Do you want me to help with any of these steps?**

Just let me know:
1. Have you redeployed Apps Script yet?
2. What does the browser console show when you try to update?
3. Can you run the direct API test above and share the result?
