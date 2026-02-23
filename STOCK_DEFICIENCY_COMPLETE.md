# Stock Deficiency Monitor - Complete Implementation ✅

## What's New

You now have a **Stock Deficiency Monitor** on your Advanced View Control dashboard that:

1. **Tracks device availability** at each source location
2. **Calculates 80% threshold** automatically
3. **Shows devices needed** to reach optimal capacity
4. **Displays status indicators** (Critical/Warning/Optimal)
5. **Shows visual progress bars** for utilization
6. **Alerts you** when locations are critically low
7. **Fetches real data** from your Google Sheets

## ⚡ Quick Start (3 Steps)

### Step 1: Update Your Google Sheets

Add a sheet named **"Shahi Dashboard"** with these columns:

```
Location           Available  Max Capacity
Bangalore, KA      45         100
Delhi, DL          72         100
Mumbai, MH         89         100
(... more locations)
```

### Step 2: Add Google Apps Script Function

Add this to your Google Apps Script:

```javascript
function getStockData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Shahi Dashboard');
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];
  
  const data = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => { obj[header] = row[i]; });
    return obj;
  });
  
  return ContentService.createTextOutput(
    JSON.stringify({ stockData: data })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Also update your doGet function:
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getStockData') return getStockData();
  if (action === 'getTrips') return getTrips();
  // ... other handlers
}
```

### Step 3: Add Environment Variable

```env
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/{DEPLOYMENT_ID}/usercache
```

Replace `{DEPLOYMENT_ID}` with your Apps Script Web App deployment ID.

**Done!** The dashboard will now show real stock deficiency data.

## 📊 How It Works

### Data Calculation

For each location:

```
Current Utilization = (Available Devices / Max Capacity) × 100%
Optimal Threshold = 80% of Max Capacity
Devices Needed = Devices required to reach 80%

Status:
  🔴 Critical: < 50% capacity
  🟡 Warning:  50-79% capacity
  🟢 Optimal:  80%+ capacity
```

### Example

```
Bangalore, KA:
  Available: 45 / Max: 100
  Utilization: 45%
  Threshold: 80 devices (80% of 100)
  Devices Needed: 35 (to reach 80%)
  Status: 🔴 CRITICAL (45% < 50%)
```

## 📱 Dashboard Display

The dashboard now includes a new **Stock Deficiency Monitor** section showing:

### Summary
- Number of critical locations
- Total devices needed across all locations

### Data Table
| Location | Current | Max | Utilization | Needed | Status |
|----------|---------|-----|------------|--------|--------|
| Bangalore, KA | 45 | 100 | 45% ▓░░░░░░░░ | +35 | 🔴 Critical |
| Delhi, DL | 72 | 100 | 72% ▓▓▓▓░░░░░ | +8 | 🟡 Warning |
| Mumbai, MH | 89 | 100 | 89% ▓▓▓▓▓▓▓░░ | +0 | 🟢 Optimal |

### Critical Alert Banner
Displays when any location is below 50% capacity with specific device counts needed.

## 🔧 Technical Implementation

### New Files
- `STOCK_DEFICIENCY_SETUP.md` - Complete setup and troubleshooting guide
- `STOCK_DEFICIENCY_IMPLEMENTATION.md` - Technical implementation details
- `STOCK_DEFICIENCY_QUICK_REF.md` - Quick reference with examples

### Modified Files

1. **src/lib/types.ts**
   - Added `StockDeficiency` interface with fields: source, availableDevices, maxCapacity, utilization, deficiency, status

2. **src/lib/sheetsApi.ts**
   - Added `fetchStockDeficiency()` - fetches from Google Sheets
   - Added `mapStockDeficiency()` - maps sheet data to StockDeficiency objects
   - Added `generateMockStockDeficiency()` - provides sample data for testing

3. **src/components/dashboard/AdvancedViewControl.tsx**
   - Added `stockDeficiency` state
   - Updated `loadData()` to fetch both trips and stock data in parallel
   - Added Stock Deficiency Monitor section with table, progress bars, and alerts
   - Added critical alert banner component
   - Updated imports for new icons (AlertTriangle, TrendingDown)

## 🎯 Features

✅ **Real-time Data** - Fetches from Google Sheets via Apps Script
✅ **80% Threshold** - Automatic calculation for each location
✅ **Visual Indicators** - Color-coded status badges (Critical/Warning/Optimal)
✅ **Progress Bars** - Visual representation of utilization percentage
✅ **Device Calculation** - Shows exact count needed to reach 80%
✅ **Critical Alerts** - Prominent banner for locations below 50%
✅ **Flexible Columns** - Recognizes multiple column name variations
✅ **Error Handling** - Graceful fallback to mock data if connection fails
✅ **Parallel Loading** - Fetches trips and stock data simultaneously
✅ **Responsive Design** - Works on desktop and mobile devices

## 📚 Documentation

Three comprehensive guides are included:

1. **STOCK_DEFICIENCY_QUICK_REF.md**
   - Quick overview and formulas
   - Fast setup instructions
   - Example calculations
   - Troubleshooting table

2. **STOCK_DEFICIENCY_SETUP.md**
   - Detailed step-by-step setup
   - Google Sheets structure
   - Apps Script integration
   - Complete troubleshooting guide
   - Alternative column names

3. **STOCK_DEFICIENCY_IMPLEMENTATION.md**
   - Code structure and logic
   - Implementation details
   - File modifications list
   - Feature highlights
   - Display preview

## 🧪 Testing

The dashboard works **immediately** with mock data. You can:

1. See how the monitor works with sample data
2. Understand the layout and features
3. Test calculations and status indicators

Then connect your actual Google Sheets data by following the quick start steps.

## ✨ Status Summary

| Component | Status | Location |
|-----------|--------|----------|
| Type Definition | ✅ Complete | src/lib/types.ts |
| Data Fetching | ✅ Complete | src/lib/sheetsApi.ts |
| Dashboard UI | ✅ Complete | src/components/dashboard/AdvancedViewControl.tsx |
| Documentation | ✅ Complete | 3 markdown files |
| Compilation | ✅ No Errors | All files verified |
| Mock Data | ✅ Ready | Functional fallback included |

## 🚀 Next Steps

1. **Review the documentation**
   - Read STOCK_DEFICIENCY_QUICK_REF.md for overview
   - Check STOCK_DEFICIENCY_SETUP.md for detailed instructions

2. **Prepare your Google Sheets**
   - Add "Shahi Dashboard" sheet
   - Add columns: Location, Available, Max Capacity
   - Fill in your actual stock data

3. **Update Google Apps Script**
   - Add `getStockData()` function
   - Update `doGet()` to handle "getStockData" action
   - Deploy as Web App (anyone can access)

4. **Configure Environment**
   - Add `VITE_GOOGLE_SHEETS_API_URL` to `.env`
   - Use your Apps Script Web App deployment URL

5. **Test Dashboard**
   - Reload the application
   - Verify stock data loads correctly
   - Check that calculations match your data

## 📞 Support

If you encounter issues:

1. **Check the documentation** - Most answers are in the three setup guides
2. **Review troubleshooting section** - Common issues and solutions
3. **Check browser console** - Detailed error messages with solutions
4. **Verify configuration** - Ensure all setup steps were completed

## 🎓 Understanding the Monitor

### Why 80% Threshold?

The 80% threshold is designed to:
- Ensure adequate buffer for emergencies
- Prevent over-capacity utilization
- Allow for maintenance and repairs
- Maintain operational efficiency
- Trigger restocking before running critically low

### Status Meanings

- **🔴 Critical (< 50%)**: Immediate action needed - major restock required
- **🟡 Warning (50-79%)**: Monitor closely - plan for restocking soon
- **🟢 Optimal (≥ 80%)**: Healthy level - operations proceeding normally

### Device Count Interpretation

The "Devices Needed" column shows the **exact number** of devices required to bring that location to **exactly 80% capacity**.

Example: If you need +35 devices in Bangalore, adding 35 devices will bring it from 45 to 80 (80% of 100 capacity).

## 🎉 You're All Set!

The Stock Deficiency Monitor is now integrated into your Advanced View Control dashboard. Once you connect it to your Google Sheets, you'll have real-time visibility into device inventory across all locations with intelligent alerts for critical situations.

For questions or additional features, refer to the comprehensive documentation files included in your project.

**Happy Logistics Management!** 📦✈️🚚
