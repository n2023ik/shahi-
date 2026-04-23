# Google Sheets API - Centralized Configuration Setup

## 📋 Overview

All sheet names/IDs are now centralized in one place for easy management and consistency across all Google Apps Script functions.

## 🔧 Setup Instructions

### Step 1: Open Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**

### Step 2: Add Config.gs File

1. In Apps Script editor, click **+ (Add File) → Script**
2. Name it `Config.gs`
3. Copy the entire content from [`supabase/functions/Config.gs`](../supabase/functions/Config.gs)
4. Paste it into the new file
5. Click **Save** (Ctrl+S)

### Step 3: Update DashboardData.gs

1. Click on `DashboardData.gs` file (or create it if it doesn't exist)
2. Copy the content from [`supabase/functions/DashboardData.gs`](../supabase/functions/DashboardData.gs)
3. Paste and **Save**

### Step 4: Update Auth.gs (Optional)

1. Click on `Auth.gs` file (or create it if it doesn't exist)
2. Update the hardcoded sheet names to use `SHEET_CONFIG`
3. Save the file

### Step 5: Deploy as Web App

1. Click **Deploy → New deployment**
2. Select type: **Web app**
3. Configuration:
   - Description: `Dashboard Data API v1`
   - Execute as: **Me (your email)**
   - Who has access: **Anyone** (or **Anyone with Google account**)
4. Click **Deploy**
5. **Copy the Web App URL**

### Step 6: Update .env File

Add the deployment URL to your `.env` file:

```env
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### Step 7: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## 📊 Available Sheet Configuration

All sheet names are defined in `SHEET_CONFIG`:

```javascript
const SHEET_CONFIG = {
  DASHBOARD: "Shahi Dashboard",
  TRIP_DETAILS: "Shahi Reverse PickupTrip Detail",
  ALLOWED_USERS: "AllowedUsers",
};
```

## 🔌 API Endpoints

### 1. Get Dashboard Data
```
GET ?action=getDashboard
```

### 2. Get Trips Data
```
GET ?action=getTrips
```

### 3. Get All Data (Dashboard + Trips)
```
GET ?action=getAll
```

### 4. **NEW:** Get All Sheets Data
```
GET ?action=getAllSheets
```
Returns data from all configured sheets in one API call.

### 5. **NEW:** Get Sheet Names
```
GET ?action=getSheetNames
```
Returns list of all configured sheet names.

## 📝 Adding New Sheets

To add a new sheet to fetch data from:

1. **Update Config.gs:**
   ```javascript
   const SHEET_CONFIG = {
     DASHBOARD: "Shahi Dashboard",
     TRIP_DETAILS: "Shahi Reverse PickupTrip Detail",
     ALLOWED_USERS: "AllowedUsers",
     // Add your new sheet here:
     INVENTORY: "Inventory Management",
     REPORTS: "Monthly Reports",
   };
   ```

2. **Save and redeploy** the Apps Script

3. **No frontend changes needed!** The `getAllSheets` endpoint will automatically include the new sheet.

## 🧪 Testing

### Test in Apps Script Editor

1. Click **▶ Run** dropdown
2. Select `fetchAllSheets`
3. Click **Run**
4. Check **Execution log** for results

### Test via URL

Open in browser:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getAllSheets
```

### Test in Browser Console

```javascript
fetch('YOUR_DEPLOYMENT_URL?action=getAllSheets')
  .then(r => r.json())
  .then(data => console.log(data));
```

## 🔍 Response Format

### getAllSheets Response:

```json
{
  "sheetNames": ["DASHBOARD", "TRIP_DETAILS", "ALLOWED_USERS"],
  "sheets": {
    "DASHBOARD": {
      "sheetName": "Shahi Dashboard",
      "rowCount": 150,
      "data": [...]
    },
    "TRIP_DETAILS": {
      "sheetName": "Shahi Reverse PickupTrip Detail",
      "rowCount": 47,
      "data": [...]
    },
    "ALLOWED_USERS": {
      "sheetName": "AllowedUsers",
      "rowCount": 5,
      "data": [...]
    }
  }
}
```

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Sheet not found" error | Check sheet name in `SHEET_CONFIG` matches exactly |
| Shows mock data | Verify `VITE_GOOGLE_SHEETS_API_URL` is set in `.env` |
| CORS error | Ensure deployment "Who has access" is set to "Anyone" |
| Empty data | Check sheet has headers in row 1 and data in subsequent rows |
| Timeout | Reduce data size or optimize sheet formulas |

## 📚 Helper Functions

Use these helper functions in your Apps Script:

```javascript
// Get sheet by config key
const dashboardSheet = getSheetByConfig("DASHBOARD");

// Check if sheet exists
if (sheetExists("INVENTORY")) {
  // Handle inventory data
}

// Get all sheet names
const allSheets = getAllSheetNames();
```

## 🎯 Benefits

✅ **Single source of truth** - All sheet names in one place  
✅ **Easy maintenance** - Update once, applies everywhere  
✅ **Type safety** - Use constants instead of strings  
✅ **Scalable** - Add new sheets without code changes  
✅ **Fetch all data** - One API call gets all sheets  

## 🔄 Next Steps

1. ✅ Copy Config.gs to Apps Script
2. ✅ Update DashboardData.gs with new code
3. ✅ Deploy as Web App
4. ✅ Add URL to .env
5. ✅ Restart dev server
6. ✅ Verify data loads in UI

---

**Need help?** Check the console (F12) for detailed error messages.
