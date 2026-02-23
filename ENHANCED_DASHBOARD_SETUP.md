# 🚀 Enhanced Dashboard Setup Guide

## Overview

The Enhanced Dashboard provides a comprehensive view of your Shahi Dashboard data with:

- ✅ **Success Rate Visualization** - See completion rates for each location
- ✅ **Delayed Pickups Alert** - Automatically identifies pickups delayed >3 days
- ✅ **Stock Utilization Alerts** - Highlights locations using ≥80% capacity
- ✅ **Location Comparison** - Compare metrics across all locations
- ✅ **Overall Metrics** - Global performance indicators

---

## 📋 Prerequisites

1. Google Sheets with "Shahi Dashboard" sheet
2. Google Apps Script access
3. Environment variables configured in `.env`

---

## 🔧 Setup Instructions

### Step 1: Configure Google Apps Script

1. Open your Google Sheet with the "Shahi Dashboard" tab
2. Go to **Extensions** → **Apps Script**
3. Create a new script or open existing one
4. Copy the code from `supabase/functions/DashboardData.gs`
5. Update the `SHEET_NAME` constant to match your sheet name:
   ```javascript
   const SHEET_NAME = "Shahi Dashboard"; // Your actual sheet name
   ```
6. Adjust the row/column indices in `extractGlobalSummary()` and `extractLocations()` functions based on your sheet structure
7. Save the script (Ctrl+S or Cmd+S)

### Step 2: Deploy Apps Script as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type" → Choose **Web app**
3. Configure:
   - **Description**: "Shahi Dashboard Data API"
   - **Execute as**: **Me** (your account)
   - **Who has access**: **Anyone** (or "Anyone with Google account" for more security)
4. Click **Deploy**
5. **Copy the Web App URL** - You'll need this for the next step

### Step 3: Update Environment Variables

Add the Apps Script URL to your `.env` file:

```env
VITE_APPS_SCRIPT_DATA_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

**Note**: If you're using the same Apps Script for both auth and data, you can use `VITE_APPS_SCRIPT_AUTH_URL` for both.

### Step 4: Update Apps Script URL in Code (if needed)

If your Apps Script URL is different from the one in `src/lib/dashboardApi.ts`, update it:

```typescript
// src/lib/dashboardApi.ts
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_DATA_URL || 
  "https://script.google.com/macros/s/YOUR_URL/exec";
```

---

## 📊 Understanding Your Sheet Structure

The Apps Script expects your "Shahi Dashboard" sheet to have:

### Global Summary Section (usually top rows)
- Completed Trips
- Total Pickup Raised (Internal)
- Total Pickup Completed
- Confirmation Pending
- RTO Shipments
- Delivered at Shahi Factory
- Available
- Stock(Damage+Offline)
- Total Quantity
- Lost
- Non-repairable Devices
- Offline Devices

### Location Data (rows below summary)
Each location row should have:
- Location Name (first column)
- All the metrics listed above

**Important**: You may need to adjust the row indices in `DashboardData.gs` based on your actual sheet layout.

---

## 🎨 Features Explained

### 1. Success Rate Cards
- Shows trip completion rate and pickup completion rate
- Color-coded: Green (≥80%), Yellow (60-79%), Red (<60%)
- Progress bars for visual feedback

### 2. Delayed Pickups Alert
- Automatically detects pickups delayed more than 3 days
- Shows location, days delayed, and pending count
- Red alert for delays >7 days, yellow for 4-7 days

### 3. Stock Utilization Alert
- Highlights locations using ≥80% of capacity
- Shows current stock vs. max capacity
- Breakdown of available vs. damage/offline stock

### 4. Location Comparison
- Compare locations by:
  - Success Rate (%)
  - Completed Trips
  - Pickups Completed
  - Total Quantity
- Bar charts for visual comparison

### 5. Overall Metrics
- Global performance indicators
- Average stock utilization
- Total shipments, pickups, and pending actions

---

## 🔄 Auto-Refresh

The dashboard automatically refreshes every 60 seconds. You can also manually refresh using the refresh button.

---

## 🐛 Troubleshooting

### "No data available" or empty dashboard

1. **Check Apps Script URL**
   - Verify the URL in `.env` matches your deployment URL
   - Make sure the script is deployed as Web App

2. **Check Sheet Name**
   - Verify `SHEET_NAME` in Apps Script matches your actual sheet name
   - Sheet name is case-sensitive

3. **Check Sheet Structure**
   - Verify your sheet has the expected column headers
   - Adjust row indices in `extractGlobalSummary()` and `extractLocations()` if needed

4. **Check Apps Script Execution**
   - Go to Apps Script → **Executions** tab
   - Check for any errors
   - Test the `getDashboardData()` function manually

### Data not matching

- The Apps Script uses column headers to find data
- If your headers are different, update the header names in `getValue()` calls
- Check for typos in header names (they're case-insensitive but must match)

### CORS Errors

- Make sure Apps Script is deployed with "Anyone" access
- Check browser console for specific error messages

---

## 📝 Customization

### Change Stock Threshold

In `StockUtilization.tsx`:
```typescript
<StockUtilization locations={locations} threshold={80} />
```
Change `80` to your desired percentage.

### Change Delay Threshold

In `DelayedPickups.tsx`, find:
```typescript
if (daysDelayed !== null && daysDelayed > 3) {
```
Change `3` to your desired number of days.

### Add More Comparison Metrics

In `LocationComparison.tsx`, add to the `metric` type:
```typescript
metric: "completedTrips" | "totalPickupCompleted" | "successRate" | "totalQuantity" | "yourNewMetric";
```

---

## 🎯 Next Steps

1. Test the dashboard with your actual data
2. Adjust Apps Script row/column indices if needed
3. Customize thresholds and metrics as required
4. Share the dashboard with your team!

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Apps Script execution logs
3. Verify environment variables are set correctly
4. Ensure sheet structure matches expected format

---

**Happy Dashboard Building! 🎉**
