# Stock Deficiency Monitor Setup Guide

## Overview

The **Stock Deficiency Monitor** on the Advanced View Control dashboard tracks device availability at each source location with an **80% capacity threshold**. It helps you identify locations that need more devices to meet operational requirements.

## Features

- **80% Threshold Monitoring**: Automatically calculates how many devices are needed at each location to reach 80% capacity
- **Three Status Levels**:
  - 🔴 **Critical**: Less than 50% utilization
  - 🟡 **Warning**: 50-79% utilization  
  - 🟢 **Optimal**: 80%+ utilization
- **Real-time Progress Bars**: Visual representation of current capacity
- **Critical Alerts**: Prominent alerts for locations below critical threshold
- **Device Calculation**: Shows exact number of devices needed to reach 80%

## Google Sheets Setup

### 1. Create a "Shahi Dashboard" Sheet (or use existing one)

Add the following columns to your Google Sheets:

| Column Name | Type | Example | Notes |
|------------|------|---------|-------|
| Location | Text | Bangalore, KA | Source location name |
| Available | Number | 45 | Current available devices at location |
| Max Capacity | Number | 100 | Maximum capacity of location |

### 2. Example Data Structure

```
Location           | Available | Max Capacity
Bangalore, KA      | 45        | 100
Delhi, DL          | 72        | 100
Mumbai, MH         | 89        | 100
Hyderabad, TS      | 62        | 100
Chennai, TN        | 38        | 100
Pune, MH           | 95        | 100
Kolkata, WB        | 55        | 100
Ahmedabad, GJ      | 81        | 100
```

### 3. Alternative Column Names

The system is flexible and supports these alternative names:

**For Available Devices:**
- `Available`
- `Available Devices`
- `Current Stock`

**For Max Capacity:**
- `Max Capacity`
- `Capacity`

**For Location:**
- `Location`
- `Source`
- `sourceAddress`

## Deficiency Calculation Logic

For each location, the dashboard calculates:

```
Utilization % = (Available Devices / Max Capacity) × 100

Devices Needed = Max(0, Ceiling(80% of Max Capacity - Available Devices))

Status:
  - Critical: Utilization < 50%
  - Warning:  50% ≤ Utilization < 80%
  - Optimal:  Utilization ≥ 80%
```

### Example Calculations

| Location | Available | Capacity | Utilization | Threshold 80% | Needed |
|----------|-----------|----------|-------------|---------------|--------|
| Bangalore | 45 | 100 | 45% | 80 | **35 devices** |
| Delhi | 72 | 100 | 72% | 80 | **8 devices** |
| Mumbai | 89 | 100 | 89% | 80 | **0 devices** (Optimal) |

## Google Apps Script Integration

### 1. Add Handler in Your Apps Script

Add this function to your Google Apps Script deployment to handle stock data requests:

```javascript
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getStockData') {
    return getStockData();
  }
  
  // ... other handlers
}

function getStockData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Shahi Dashboard');
    
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Shahi Dashboard sheet not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    const headers = values[0];
    
    // Convert to array of objects
    const data = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
    
    return ContentService.createTextOutput(
      JSON.stringify({ stockData: data })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 2. Deploy as Web App

1. In Google Apps Script editor, click **Deploy** → **New Deployment**
2. Select **Type**: Web App
3. Configure:
   - Execute as: Your email
   - Who has access: Anyone
4. Copy the deployment URL
5. Add to your `.env` file:
   ```
   VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/{DEPLOYMENT_ID}/usercache
   ```

## Dashboard Display

The Stock Deficiency Monitor displays:

1. **Summary Header**
   - Number of critical locations
   - Total devices needed across all locations

2. **Data Table** with columns:
   - Location name
   - Current stock count
   - Maximum capacity
   - Utilization percentage with visual progress bar
   - Devices needed (to reach 80%)
   - Status badge (Critical/Warning/Optimal)

3. **Critical Alerts**
   - Prominent alert banner for any critical locations
   - Lists specific locations and device counts needed

## Example Dashboard Display

```
Stock Deficiency Monitor (80% Threshold)
Devices needed at each location to reach 80% capacity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2 Critical | 85 total needed

Location        Current  Max  Utilization  Needed  Status
────────────────────────────────────────────────────
Bangalore, KA     45     100   45%  ▓░░░░░░░░   +35   🔴 Critical
Delhi, DL         72     100   72%  ▓▓▓▓░░░░░    +8   🟡 Warning
Mumbai, MH        89     100   89%  ▓▓▓▓▓▓▓▓░    +0   🟢 Optimal

⚠️  Critical Stock Alert
Bangalore, KA: 35 devices needed, Chennai, TN: 42 devices needed
```

## Features & Alerts

### Automatic Status Calculation

- **Critical (🔴)**: Immediate action required - below 50% capacity
- **Warning (🟡)**: Attention needed - 50-79% capacity
- **Optimal (🟢)**: Healthy stock level - 80%+ capacity

### Real-time Updates

- Stock data refreshes every time the dashboard loads
- Use the "Refresh" button to update stock information manually
- Timestamps show last update time

### Flexible Capacity Planning

You can adjust:
- Individual location capacities based on physical space
- Threshold values if your operations require different levels
- Device counts as inventory changes

## Troubleshooting

### Stock data not showing?

1. **Check sheet name**: Must be exactly "Shahi Dashboard"
2. **Verify columns**: Must have Location, Available, and Max Capacity
3. **Check Apps Script**: Verify `getStockData()` function exists
4. **Verify deployment**: Ensure deployment URL is in `.env` file
5. **Check permissions**: Web app must be accessible to "Anyone"

### Incorrect calculations?

- Verify Available and Max Capacity are numeric values
- Check for empty rows in the sheet
- Ensure no text mixed with numbers in capacity columns

### Falls back to mock data?

- Mock data appears if Google Sheets connection fails
- Check browser console for error messages
- Verify VITE_GOOGLE_SHEETS_API_URL in `.env` file

## Mock Data

If the Google Apps Script is not configured, the dashboard uses mock stock data:

```
Bangalore, KA: 45 available / 100 capacity (Critical)
Delhi, DL: 72 available / 100 capacity (Warning)
Mumbai, MH: 89 available / 100 capacity (Optimal)
Hyderabad, TS: 62 available / 100 capacity (Warning)
Chennai, TN: 38 available / 100 capacity (Critical)
```

Replace this with your actual data from Google Sheets.

## Next Steps

1. ✅ Set up "Shahi Dashboard" sheet with stock data columns
2. ✅ Add the `getStockData()` function to your Apps Script
3. ✅ Deploy Apps Script as a Web App
4. ✅ Add deployment URL to `.env` as `VITE_GOOGLE_SHEETS_API_URL`
5. ✅ Refresh the dashboard to see live stock deficiency data

For questions or issues, check your browser console for detailed error messages.
