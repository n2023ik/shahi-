# Google Apps Script Data Issue - Complete Troubleshooting

## Problem
Your Google Apps Script is returning **HTML instead of JSON**, which means:
- The script has a **syntax error** OR
- The script **hasn't been redeployed** with the latest code OR
- The **sheets don't exist** in your Google Sheet

## Quick Diagnosis - Test This First

1. Go to: `https://script.google.com/macros/s/AKfycbzb0qJs6gQaH7uGlVcfW6oUYK-X9js4bjrhGUmpa5h4xDnSIlH11-oTu90MlgzpbaVN/exec?action=test`
2. You should see JSON like: `{"status":"ok","message":"Google Apps Script is working"}`
3. **If you see HTML or an error**, the script has problems - see below.

## Step 1: Check Google Apps Script Logs

1. Open [Google Apps Script](https://script.google.com)
2. Select your **DashboardData** project
3. Click **Execution** tab (left sidebar, looks like a clock icon)
4. Look for **failed executions** (red X marks)
5. Click on a failed one to see the error message
6. **Share the error message** - it will tell us exactly what's wrong

## Step 2: Verify Sheet Names Exist

Your script is looking for these exact sheet names:
- **"Shahi Dashboard"**
- **"Shahi Reverse PickupTrip Detail"**

**In your Google Sheet:**
1. Look at the sheet tabs at the bottom
2. Verify the names match EXACTLY (including spaces and capitalization)
3. If they're different, update `.env`:
   ```env
   VITE_SHEET_DASHBOARD=Your Actual Dashboard Sheet Name
   VITE_SHEET_TRIP_DETAILS=Your Actual Trip Sheet Name
   ```

## Step 3: Full Redeploy (MUST DO)

If the test endpoint works but `getTrips` fails:

1. **In Google Apps Script Editor:**
   - Click **Deploy** → **Manage Deployments** (top right)
   - Delete the OLD deployment (click trash icon)
   - Click **+ New Deployment**
   - Select **Web app**
   - **Execute as**: Your email
   - **Who has access**: **Anyone**
   - Click **Deploy**
   - **Copy the NEW URL** from the dialog

2. **Update your `.env` file:**
   ```env
   VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/[NEW-DEPLOYMENT-ID]/exec
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

## Step 4: Test Simple Endpoint First

Test each endpoint individually via browser:

```
Test endpoint:
https://[YOUR_URL]/exec?action=test

Expected response: {"status":"ok","message":"Google Apps Script is working"}
```

```
Get Trips endpoint:
https://[YOUR_URL]/exec?action=getTrips

Should return JSON array like: [{"Trip Id":"LY123","Trip Creation Date":"07/02/2026",...},...]
```

```
Get Dashboard endpoint:
https://[YOUR_URL]/exec?action=getDashboard

Should return JSON with locations and summary
```

## Step 5: Check Sheet Data Format

Your trip sheet (`Shahi Reverse PickupTrip Detail`) must have these columns:
- `Trip Id`
- `Trip Creation Date` (or `tripCreationDate`)
- `Trip Completion Date` (or `tripCompletionDate`)
- `Trip status` (or `tripStatus`)
- `Vehicle No.` (or `vehicleNo`)
- And other trip details...

**Important:** Headers must match column A/B convention in the script OR be named exactly as shown above.

## Step 6: Check Browser Console

After redeploying and restarting dev server:

1. Open dashboard
2. Press F12 → **Console** tab
3. Look for logs starting with `[fetchTrips]`
4. They should show:
   ```
   [fetchTrips] Calling Google Apps Script...
   [fetchTrips] Raw API response: [...]
   [fetchTrips] Got XX raw trip records from API
   ```

**If you see errors, copy them and share them!**

## Common Issues & Fixes

### Issue: Getting "Sheet not found" error
- Your sheet names don't match
- Check the exact sheet names and update `.env` 

### Issue: Getting HTML response (not JSON)
- Google Apps Script didn't deploy properly
- Syntax error in the script
- Delete deployment and create new one

### Issue: Getting empty array `[]`
- Your trip sheet has no data
- Headers don't match what the script expects
- All rows are being filtered out

### Issue: Dates showing as "NaN" or "0002"
- The sheet has corrupt date cells
- Delete bad date values and re-enter them as proper dates
- Or use format: DD/MM/YYYY (e.g., "23/02/2026")

## Final Check: CORS Headers

If you're still getting CORS errors:

1. Make sure the deployment uses:
   - **Execute as**: Your Google Account
   - **Who has access**: **Anyone** (not just me)

2. The script adds CORS headers automatically, but if you get 405 errors:
   - Try clearing browser cache (Ctrl+Shift+Delete)
   - Wait 2-3 minutes for deployment to fully propagate
   - Try in Incognito window

## Need More Help?

If the error persists:

1. **Paste the error message** from Apps Script Logs (Execution tab)
2. **Tell me:**
   - Are you using real Google Sheets or is this a test?
   - What's the exact sheet name (copy-paste from sheet tab)
   - What does the browser console show when you visit the endpoints?
   - Does `?action=test` endpoint work?

