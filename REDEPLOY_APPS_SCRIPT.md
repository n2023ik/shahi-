# 🔧 Redeploy Apps Script to Fix Update Issue

## Problem
The update operation was failing because the backend wasn't properly parsing URL-encoded form data from the frontend.

## Solution
I've updated the `parseBody` function in `DashboardData_v2.gs` to handle both JSON and URL-encoded form data.

## Steps to Fix

### 1. Open Google Apps Script
1. Go to https://script.google.com
2. Open your project that contains the Apps Script for this dashboard

### 2. Update the Code
Copy the updated `parseBody` function from `supabase/functions/DashboardData_v2.gs` (lines 476-510) to your Apps Script project.

**The updated function now handles:**
- ✅ JSON format (application/json)
- ✅ URL-encoded form data (application/x-www-form-urlencoded)
- ✅ Nested objects in form data

### 3. Redeploy as Web App
1. Click **Deploy** → **Manage Deployments**
2. Click the **Edit** icon (pencil) on your active deployment
3. Change **Version** to "New version"
4. Add description: "Fixed parseBody to handle URL-encoded form data"
5. Click **Deploy**

### 4. Test the Update
1. Go back to your dashboard
2. Try editing a trip
3. Make a change and click "Update"
4. ✅ It should now work without the JSON parsing error!

## What Was Fixed?

**Before:**
```javascript
function parseBody(e) {
  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);  // ❌ Only handles JSON
  }
  throw new Error("Invalid request body");
}
```

**After:**
```javascript
function parseBody(e) {
  // ... handles both JSON and URL-encoded form data
  // ✅ Properly decodes URL parameters
  // ✅ Parses nested JSON objects in form data
}
```

## Alternative: Use DashboardData.gs
If you want, you can also use `supabase/functions/DashboardData.gs` instead, which already had the correct parseBody function. Just make sure to deploy that version.

---

**Note:** After redeploying, you may need to refresh your browser to clear any cached errors.
