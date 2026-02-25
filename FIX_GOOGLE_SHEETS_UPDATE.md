# 🔧 Fix: Google Sheets Data Not Updating from UI

## Problem
When you edit, update, or delete data from the UI, changes are not being saved to Google Sheets.

## Root Cause
The API communication between your frontend and Google Apps Script was using FormData which can have issues with complex nested objects. We've fixed this by switching to JSON POST.

---

## ✅ Solution Steps

### Step 1: Update Your Google Apps Script

Your Google Apps Script code has been updated in the file: `supabase/functions/DashboardData.gs`

**You need to redeploy it:**

1. **Open Google Apps Script**
   - Go to: https://script.google.com
   - Find your project: "DashboardData" or your deployment name

2. **Copy the Updated Code**
   - Open: `c:\shahi previes\shipment-hub-main\supabase\functions\DashboardData.gs`
   - Copy ALL the code (Ctrl+A, Ctrl+C)

3. **Paste in Apps Script**
   - Delete all existing code in the Apps Script editor
   - Paste the new code (Ctrl+V)
   - Click **Save** (💾 icon or Ctrl+S)

4. **Deploy as NEW Version**
   - Click **Deploy** → **New deployment**
   - Or: **Deploy** → **Manage deployments** → **Edit** → **New version**
   - Description: "Fixed POST data handling and logging"
   - Click **Deploy**

5. **Copy the NEW Deployment URL**
   - After deployment, copy the **Web app URL**
   - It should look like: `https://script.google.com/macros/s/AKfyc.../exec`

6. **Update Your .env File**
   - Open: `c:\shahi previes\shipment-hub-main\.env`
   - Update this line:
     ```env
     VITE_GOOGLE_SHEETS_API_URL=YOUR_NEW_DEPLOYMENT_URL_HERE
     ```
   - Save the file

### Step 2: Restart Your Development Server

```powershell
# Stop the current server (Ctrl+C if running)
# Then restart:
npm run dev
# or
bun dev
```

---

## 🧪 Test the Fix

### Option A: Automated Test Script

1. Open your browser (Chrome/Edge)
2. Go to your dashboard: http://localhost:5173
3. Press **F12** to open DevTools
4. Go to **Console** tab
5. Open file: `test-api.js`
6. **Replace** the API URL in line 10 with your actual deployment URL
7. Copy the entire script
8. Paste into the Console and press Enter
9. Watch the test results

### Option B: Manual Testing

1. **Test Create:**
   - Click "New Trip" button
   - Fill in the required fields
   - Click "Create"
   - Check browser console (F12) for logs
   - Verify the trip appears in Google Sheets

2. **Test Update:**
   - Click the ✏️ Edit icon on any trip
   - Modify some fields
   - Click "Update"
   - Check console for success messages
   - Verify changes in Google Sheets

3. **Test Delete:**
   - Click the 🗑️ Delete icon on a test trip
   - Confirm deletion
   - Check console for success
   - Verify trip is removed from Google Sheets

---

## 🔍 What Was Changed

### Frontend Changes (`src/lib/sheetsApi.ts`)

**Before:**
```typescript
// Used FormData which can cause issues
const formData = new FormData();
formData.append('action', 'create');
formData.append('data', JSON.stringify(trip));
init.body = formData;
```

**After:**
```typescript
// Uses JSON POST with text/plain content type (avoids CORS preflight)
init.headers = { "Content-Type": "text/plain;charset=utf-8" };
init.body = JSON.stringify({ action, ...data });
```

### Backend Changes (`DashboardData.gs`)

**Improvements:**
1. ✅ Better JSON parsing that checks `e.postData.contents` first
2. ✅ Enhanced error logging with `Logger.log()`
3. ✅ Proper lock release in `finally` block
4. ✅ Detailed error messages returned to frontend
5. ✅ Support for both JSON POST and FormData (backwards compatible)

---

## 📊 Debugging Tips

### Check Browser Console
Press **F12** and look for these logs:

```
✅ Good Signs:
[sheetsApi] Calling Apps Script: POST https://script.google.com...
[sheetsApi] POST data: {action: "create", sheet: "...", data: {...}}
[sheetsApi] Response: {success: true}
[createTrip] Success: {success: true}

❌ Bad Signs:
❌ Server returned error: Invalid request body
❌ Create trip failed: Error: Server error: ...
```

### Check Apps Script Logs

1. Go to: https://script.google.com
2. Open your project
3. Click **Executions** (left sidebar)
4. Look for recent executions
5. Click on any execution to see logs
6. Look for:
   ```
   Parsed JSON POST body: {...}
   Processing POST action: create
   Create result: {success: true}
   ```

### Common Issues and Fixes

#### Issue 1: "Network request failed"
- **Cause:** Wrong API URL or network issue
- **Fix:** Verify `.env` file has correct URL

#### Issue 2: "Invalid request body"
- **Cause:** Apps Script not updated
- **Fix:** Redeploy the updated Apps Script code

#### Issue 3: "Row not found" (for update/delete)
- **Cause:** Trip Id doesn't match exactly
- **Fix:** Check if Trip Id column in Google Sheets matches exactly (case-sensitive)

#### Issue 4: Changes not showing in Sheets
- **Cause:** Wrong sheet name
- **Fix:** Verify sheet name is exactly: `Shahi Reverse Pickup/Trip Details`

---

## 🔒 Deployment Checklist

Before testing, ensure:

- [ ] Apps Script code is updated with new `parseBody()` function
- [ ] Apps Script is deployed as **NEW version**
- [ ] .env file has the **NEW** deployment URL
- [ ] Dev server is **restarted** after .env change
- [ ] Apps Script "Execute as" = **Me**
- [ ] Apps Script "Who has access" = **Anyone**
- [ ] Sheet name matches exactly (case sensitive)
- [ ] Browser console is open to see logs
- [ ] Google Sheets is open to verify changes

---

## 📞 Still Having Issues?

### Check These Files:

1. **`.env`** - Correct API URL?
2. **Apps Script** - Latest code deployed?
3. **Sheet Name** - Exact match: "Shahi Reverse Pickup/Trip Details"?
4. **Browser Console** - Any error messages?
5. **Apps Script Executions** - Any errors logged?

### Collect Debug Info:

1. Open browser console (F12)
2. Try to create/update/delete
3. Copy ALL console logs
4. Check Apps Script Executions page
5. Copy the execution logs

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Browser console shows: `[createTrip] Success: {success: true}`
2. ✅ Toast notification: "Trip created successfully"
3. ✅ New row appears in Google Sheets immediately
4. ✅ Apps Script logs show: "Create result: {success: true}"
5. ✅ No errors in browser console or Apps Script logs

---

## 📋 Quick Command Reference

```powershell
# Restart dev server
npm run dev

# Clear browser cache
Ctrl + Shift + R (hard refresh)

# Check if API is configured
echo %VITE_GOOGLE_SHEETS_API_URL%
```

---

**Need more help?** Open the browser console (F12) and the Apps Script execution logs side by side while testing. This will show you exactly where the issue is occurring.
