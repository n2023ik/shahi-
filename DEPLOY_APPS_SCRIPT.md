# 🚀 Deploy Google Apps Script - Fix "Invalid GET action" Error

## Problem
Your app shows: **"Invalid GET action"** because the deployed Apps Script doesn't have stock data endpoints.

## Solution: Deploy DashboardData_v2.gs

### Step 1: Open Google Apps Script
1. Go to https://script.google.com
2. Find your project (or create new)
3. Open it

### Step 2: Replace Code
1. **Delete all existing code** in the editor
2. Copy ALL code from: `supabase/functions/DashboardData_v2.gs`
3. Paste it into the Apps Script editor
4. Update `SPREADSHEET_ID` on line 7 if needed:
   ```javascript
   const SPREADSHEET_ID = "1CNF8nj-T9xTkzyb7JW02R7rwUg1MqxhAzPuM_2_7QQs";
   ```

### Step 3: Deploy as Web App
1. Click **Deploy** button (top right)
2. Choose **New deployment**
3. Settings:
   - Type: **Web app**
   - Description: "Shahi Dashboard API v2"
   - Execute as: **Me** (your Google account)
   - Who has access: **Anyone**
4. Click **Deploy**
5. Authorize the script (you'll see Google's permission screen)
6. **Copy the Web App URL** (looks like: https://script.google.com/macros/s/AKfycby.../exec)

### Step 4: Update .env File
1. Open `.env` file in your project root
2. Update this line:
   ```env
   VITE_GOOGLE_SHEETS_API_URL=<paste-your-new-url-here>
   ```
3. Save the file

### Step 5: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

## Verification
After deployment, your app should:
- ✅ Load trip data (66 valid trips)
- ✅ Load stock deficiency data
- ✅ No more "Invalid GET action" errors

## What DashboardData_v2.gs Provides
- ✅ `getTrips` - Fetch trip data
- ✅ `getDashboard` - Fetch dashboard data  
- ✅ `getStockData` - Fetch stock deficiency (device counts)
- ✅ CRUD operations (create/update/delete rows)
- ✅ Caching for better performance
- ✅ CORS support

## Troubleshooting

### Still getting "Invalid GET action"?
- Make sure you deployed the **NEW** version (not old deployment)
- Copy the **NEW** URL from deployment dialog
- Update `.env` with the new URL
- Restart your dev server

### Authorization errors?
- Go to Apps Script → Deploy → Manage deployments
- Check "Execute as: Me" and "Who has access: Anyone"
- Redeploy if needed

### Can't see data?
- Run `debugStockData()` function in Apps Script editor to test
- Check Google Sheet has data in "Shahi Dashboard" sheet
- Verify SPREADSHEET_ID matches your Google Sheet
