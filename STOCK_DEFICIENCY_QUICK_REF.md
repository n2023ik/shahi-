# Stock Deficiency Feature - Quick Reference

## 📊 Feature Overview

The **Stock Deficiency Monitor** tracks device availability at each source location with an **80% capacity threshold**.

## 🔄 Data Flow

```
Google Sheets ("Shahi Dashboard" sheet)
         ↓ (Location, Available, Max Capacity)
Google Apps Script (getStockData() function)
         ↓ (JSON response)
sheetsApi.ts→fetchStockDeficiency()
         ↓ (StockDeficiency[] array)
AdvancedViewControl component
         ↓
Display table with status, progress bars, alerts
```

## 📈 Calculation Formula

For each location:

$$
\text{Utilization %} = \frac{\text{Available Devices}}{\text{Max Capacity}} \times 100
$$

$$
\text{Threshold (80\%)} = \text{Max Capacity} \times 0.80
$$

$$
\text{Devices Needed} = \max(0, \lceil \text{Threshold} - \text{Available Devices} \rceil)
$$

### Status Logic

| Utilization | Status | Color | Action |
|-------------|--------|-------|--------|
| **< 50%** | 🔴 Critical | Red | Immediate action needed |
| **50-79%** | 🟡 Warning | Amber | Monitor closely |
| **≥ 80%** | 🟢 Optimal | Green | Acceptable level |

## 💾 Google Sheets Setup

### Required Sheet: "Shahi Dashboard"

```
┌────────────────┬───────────┬──────────────┐
│ Location       │ Available │ Max Capacity │
├────────────────┼───────────┼──────────────┤
│ Bangalore, KA  │    45     │     100      │
│ Delhi, DL      │    72     │     100      │
│ Mumbai, MH     │    89     │     100      │
│ Hyderabad, TS  │    62     │     100      │
│ Chennai, TN    │    38     │     100      │
└────────────────┴───────────┴──────────────┘
```

### Alternative Column Names (System auto-detects)

**For Available:**
- `Available`
- `Available Devices`
- `Current Stock`

**For Capacity:**
- `Max Capacity`
- `Capacity`

**For Location:**
- `Location`
- `Source`

## 🔧 Google Apps Script Code

```javascript
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getStockData') {
    return getStockData();
  }
  
  // ... other handlers (getTrips, etc.)
}

function getStockData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Shahi Dashboard');
    
    if (!sheet) {
      throw new Error('Shahi Dashboard sheet not found');
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    const headers = values[0];
    
    // Convert rows to objects
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

## 🚀 Environment Configuration

Add to your `.env` file:

```bash
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercache
```

### How to get YOUR_DEPLOYMENT_ID:

1. Open your Google Apps Script project
2. Click **Deploy** → **New Deployment**
3. Select **Type: Web App**
4. Configure:
   - Execute as: Your Google Account
   - Who has access: Anyone
5. Click **Deploy**
6. Copy the Deployment ID from the URL:
   - Format: `https://script.google.com/macros/d/{DEPLOYMENT_ID}/usercache`

## 📊 Dashboard Display Components

### 1. Summary Header
- Shows count of critical locations
- Shows total devices needed across all locations

### 2. Data Table
Columns:
- **Location**: Source name
- **Current Stock**: Available devices
- **Max Capacity**: Maximum capacity
- **Utilization**: % with progress bar
- **Devices Needed**: Count needed to reach 80%
- **Status**: Critical/Warning/Optimal badge

### 3. Critical Alerts Banner
- Only shows if critical locations exist
- Lists affected locations and device counts

## 📋 Example Calculations

### Location 1: Bangalore, KA
```
Available: 45 devices
Max Capacity: 100 devices

Utilization = 45 ÷ 100 = 45%
Status = CRITICAL (< 50%)

80% Threshold = 100 × 0.80 = 80 devices
Devices Needed = 80 - 45 = 35 devices

Display: 45/100 (45%) - Need +35 - 🔴 Critical
```

### Location 2: Delhi, DL
```
Available: 72 devices
Max Capacity: 100 devices

Utilization = 72 ÷ 100 = 72%
Status = WARNING (50-79%)

80% Threshold = 100 × 0.80 = 80 devices
Devices Needed = 80 - 72 = 8 devices

Display: 72/100 (72%) - Need +8 - 🟡 Warning
```

### Location 3: Mumbai, MH
```
Available: 89 devices
Max Capacity: 100 devices

Utilization = 89 ÷ 100 = 89%
Status = OPTIMAL (≥ 80%)

80% Threshold = 100 × 0.80 = 80 devices
Devices Needed = max(0, 80 - 89) = 0 devices

Display: 89/100 (89%) - Need +0 - 🟢 Optimal
```

## 🎯 Key Features

✅ Real-time data from Google Sheets
✅ Automatic 80% threshold calculation
✅ Color-coded status indicators
✅ Visual progress bars for utilization
✅ Critical device count display
✅ Prominent alert banners
✅ Mock data fallback for testing
✅ Flexible column name detection
✅ Error handling and logging
✅ Parallel data fetching with trips

## 🔍 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No stock data showing | Google Sheets not connected | Check Apps Script configuration and `.env` file |
| Shows mock data | Apps Script URL not set | Add `VITE_GOOGLE_SHEETS_API_URL` to `.env` |
| Wrong calculations | Data type issues | Ensure Available and Max Capacity are numbers, not text |
| Sheet not found error | Wrong sheet name | Verify sheet is named exactly "Shahi Dashboard" |
| Permission error | Apps Script not public | Redeploy as "Anyone" access |

## 📝 File Modifications

1. **src/lib/types.ts** - Added `StockDeficiency` interface
2. **src/lib/sheetsApi.ts** - Added `fetchStockDeficiency()` and helper functions
3. **src/components/dashboard/AdvancedViewControl.tsx** - Added monitor section and critical alerts

## 🧪 Testing with Mock Data

The dashboard includes mock data for immediate testing:

```typescript
{
  source: "Bangalore, KA",
  availableDevices: 45,
  maxCapacity: 100,
  utilization: 45,
  deficiency: 35,
  status: "critical"
}
```

Replace with your actual Google Sheets data once configured.

## 📚 Related Documentation

- **STOCK_DEFICIENCY_SETUP.md** - Detailed setup guide
- **STOCK_DEFICIENCY_IMPLEMENTATION.md** - Implementation details
- See main **Advanced View Control** dashboard for trip data display

---

**Status**: ✅ Ready to use with Google Sheets integration
**Last Updated**: February 2026
