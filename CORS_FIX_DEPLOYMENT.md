# CORS Error Fix - Deployment Instructions

## Problem
Google Apps Script was returning **405 Method Not Allowed** on CORS preflight (OPTIONS) requests.

## Solution
We've implemented a **CORS preflight workaround** by using FormData for POST requests instead of JSON.

## What Changed

### 1. Frontend (sheetsApi.ts)
- GET requests: No custom headers (avoids preflight)
- POST requests: Using FormData instead of JSON (avoids preflight)

### 2. Google Apps Script (DashboardData.gs)
- Updated `doPost()` to handle both FormData and JSON
- Removed explicit CORS header attempts (Google's infrastructure handles this)

## Deployment Steps

### Step 1: Update Google Apps Script

1. Open [Google Apps Script](https://script.google.com/)
2. Select your **DashboardData** project
3. In the Editor, select ALL and DELETE
4. Copy entire contents from: `supabase/functions/DashboardData.gs`
5. Paste into Google Apps Script editor
6. **Save** (Ctrl+S)

### Step 2: Create New Deployment

1. Click **Deploy** → **New Deployment** (top right)
2. Select type: **Web app**
3. **Execute as**: Your Google account email
4. **Who has access**: **Anyone**
5. Click **Deploy**
6. **Copy the new Deployment ID** (it will be shown)

### Step 3: Update .env (if URL changed)

If Google provided a new deployment URL:

```env
VITE_GOOGLE_SHEETS_API_URL=<your-new-deployment-url>
```

The new URL is shown in the deployment dialog. Format:
```
https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec
```

### Step 4: Test

1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart dev server: `npm run dev`
3. Try updating a trip in the dashboard
4. Check Network tab - should see:
   - ✅ NO 405 errors
   - ✅ POST request completing successfully
   - ✅ Response with success message

## Troubleshooting

### Still getting 405 errors?
- Wait 1-2 minutes for deployment to propagate
- Try in an incognito window (no cache)
- Verify "Anyone" has access to the Web App

### Still getting CORS errors?
- Check exact deployment URL in .env
- Verify URL starts with `https://script.google.com/macros/s/`
- Confirm it's the LATEST deployment (not an old one)

### Getting invalid JSON response?
- Check that DashboardData.gs was fully copied
- Verify all the functions are present (doGet, doPost, fetchTrips, updateTrip, etc.)

## Expected Result
After deployment, your trip updates should work without CORS errors. The workaround allows:
- ✅ GET requests (fetchTrips)
- ✅ POST requests (updateTrip, addTrip)
- ✅ No browser preflight delays
- ✅ Full CORS compatibility
