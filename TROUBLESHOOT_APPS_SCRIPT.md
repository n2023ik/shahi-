# Google Apps Script Deployment Troubleshooting

## Current Issue
❌ **Error:** "Failed to load trip data: Could not connect to server - please verify your Apps Script deployment"

## Root Causes & Solutions

### 1. **Apps Script Deployment URLs Expired or Incorrect**

When you redeploy Apps Script, old deployment URLs become invalid. Check your current deployment:

#### Step 1: Verify Apps Script Deployment
1. Go to your Google Sheet
2. Click **Extensions → Apps Script**
3. Click the **Deploy** button (top right)
4. Look for existing deployments

#### Step 2: Check Deployment Status
- If you see deployments, note the **Web app URL** (ends with `/exec`)
- The URL format should be: `https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec`

#### Step 3: Redeploy if Needed
If the current deployment is old (from months ago), create a new one:

1. Click **Deploy → New deployment**
2. Configuration:
   - **Type:** Web app
   - **Description:** Dashboard API v2
   - **Execute as:** Your email address
   - **Who has access:** Anyone
3. Click **Deploy**
4. **Copy the new deployment URL exactly**

#### Step 4: Update .env File
Replace the URL in your `.env` file with the NEW deployment URL:

```env
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/[NEW_DEPLOYMENT_ID]/exec
```

#### Step 5: Restart Development Server
```bash
# Stop current dev server (Ctrl+C)
npm run dev
```

---

### 2. **Verify Apps Script Code**

Make sure your Apps Script has the `getDashboard` and `getTrips` functions:

#### Check DashboardData.gs
```javascript
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === "getTrips") {
    // ✓ This function MUST exist
    const limit = parseInt(e.parameter.limit) || 100;
    const offset = parseInt(e.parameter.offset) || 0;
    return buildResponse(getAllRows(SHEETS.TRIPS, limit, offset));
  }
  
  if (action === "getDashboard") {
    // ✓ This function MUST exist
    return buildResponse(getAllRows(SHEETS.DASHBOARD));
  }
}
```

If these functions are missing, update your Apps Script files:
1. Copy latest code from `supabase/functions/DashboardData.gs`
2. Paste into your Apps Script editor
3. Click **Save**
4. **Redeploy as Web App** (Step 3 above)

---

### 3. **Test the Deployment**

Test if your Apps Script is accessible using this test file:

1. Open `test-deployment.html` in your VS Code
2. Update the URL in the file:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/[YOUR_ID]/exec';
   ```
3. Open in browser and test

---

### 4. **Common URLs to Verify**

Check your `.env` file has BOTH URLs configured:

```env
# Auth Script (optional but recommended)
VITE_APPS_SCRIPT_AUTH_URL=https://script.google.com/macros/s/[DEPLOYMENT_ID_1]/exec

# Dashboard Data Script (REQUIRED - this is what loads trip data)
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/[DEPLOYMENT_ID_2]/exec
```

**Note:** These can be the same URL if both functions are in the same Apps Script project.

---

### 5. **Network & CORS Issues**

If URLs are correct but still getting connection errors:

#### Check Browser Console
1. Press **F12** to open Developer Tools
2. Go to **Network** tab
3. Reload the page
4. Look for failed requests to your Apps Script URL

#### Verify CORS Headers
Your Apps Script should return proper CORS headers. Check `supabase/functions/DashboardData.gs`:

```javascript
function doOptions(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```

---

### 6. **Quick Checklist**

Run through this checklist:

- [ ] Apps Script deployed as **Web App**
- [ ] Deployment URL in `.env` file is **current** (not old)
- [ ] `.env` file has `VITE_GOOGLE_SHEETS_API_URL` **exactly** set
- [ ] Dev server **restarted** after updating `.env`
- [ ] Sheet names in Apps Script match your actual sheets
- [ ] Google account has permission to the Sheet
- [ ] Apps Script functions `doGet()` and `doPost()` are defined
- [ ] `getAllRows()` function exists in Apps Script

---

### 7. **Debug Mode**

Enable debug logging to see detailed error messages:

In your `.env` file, set:
```env
VITE_DEBUG_MODE=true
```

Then check browser console (F12 → Console) for detailed error messages.

---

## Still Having Issues?

If you've completed all steps above, try:

1. **Disable the Apps Script (use mock data):**
   - Remove or comment out the `VITE_GOOGLE_SHEETS_API_URL` in `.env`
   - This will load mock data instead
   - Helps verify if it's an Apps Script issue or UI issue

2. **Check Google Apps Script Logs:**
   - In Apps Script editor: **View → Logs** (or Ctrl+Space, then search "Logs")
   - Run the functions manually via Apps Script editor to see errors

3. **Verify Spreadsheet ID:**
   - The `SPREADSHEET_ID` in `DashboardData.gs` should match your actual Google Sheet's ID
   - Find it in the Sheet URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

---

## Quick Redeploy Steps (Summary)

```
1. Go to Extensions → Apps Script
2. Click Deploy → Manage deployments
3. Note the current deployment ID or create a new one
4. Copy the Web App URL
5. Update .env: VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/[ID]/exec
6. Stop & restart: npm run dev
7. Test in browser (F12 → Network tab)
```

---
