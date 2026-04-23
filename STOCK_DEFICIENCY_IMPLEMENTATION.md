# Stock Deficiency Feature - Implementation Summary

## What Was Added

### 1. **Stock Deficiency Interface** (`src/lib/types.ts`)
```typescript
export interface StockDeficiency {
  source: string;           // Location name
  availableDevices: number; // Current devices
  maxCapacity: number;      // Maximum capacity
  utilization: number;      // % utilization (0-100)
  deficiency: number;       // Devices needed to reach 80%
  status: "critical" | "warning" | "optimal";
}
```

### 2. **Stock Data API Functions** (`src/lib/sheetsApi.ts`)

#### `fetchStockDeficiency()`
- Fetches stock data from Google Sheets via Apps Script
- Falls back to mock data if not configured
- Calculates utilization and deficiency automatically
- Returns array of `StockDeficiency` objects

#### Mock Data Generator
- Provides sample stock data with realistic values
- Useful for testing before Google Sheets connection

### 3. **Dashboard Enhancement** (`src/components/dashboard/AdvancedViewControl.tsx`)

#### New State
```typescript
const [stockDeficiency, setStockDeficiency] = useState<StockDeficiency[]>([]);
```

#### Updated Data Loading
- Now fetches both trips AND stock deficiency data in parallel
- Handles errors gracefully with fallback

#### Stock Deficiency Monitor Section
Displays a comprehensive table with:
- **Location**: Source/facility name
- **Current Stock**: Number of available devices
- **Max Capacity**: Maximum capacity of location
- **Utilization %**: Visual progress bar showing current percentage
- **Devices Needed**: Exact count needed to reach 80% (with color coding)
- **Status Badge**: Critical/Warning/Optimal with icon

#### Critical Alerts
- Prominent red alert banner for any critical locations
- Lists all critical locations with device counts needed

---

## How It Works

### Calculation Logic

For each location:

```
Utilization = (Available Devices / Max Capacity) × 100%

Threshold = 80% of Max Capacity

Deficiency = max(0, ceil(Threshold - Available Devices))

Status:
  - Utilization < 50%    → Critical (🔴)
  - 50% ≤ Util < 80%     → Warning (🟡)
  - Utilization ≥ 80%    → Optimal (🟢)
```

### Example

```
Bangalore, KA:
  Available: 45 devices
  Max: 100 devices
  
  Utilization = 45/100 = 45% → CRITICAL
  Threshold = 80 devices needed
  Deficiency = 80 - 45 = 35 devices needed
```

---

## Google Sheets Setup Required

### Sheet Structure
Your Google Sheets needs a sheet called **"Shahi Dashboard"** with:

| Column | Type | Example |
|--------|------|---------|
| Location | Text | Bangalore, KA |
| Available | Number | 45 |
| Max Capacity | Number | 100 |

The system also recognizes:
- Alternative names: "Available Devices", "Current Stock"
- Alternative names: "Capacity"
- Alternative names: "Source"

### Google Apps Script Function

Add to your Apps Script:

```javascript
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getStockData') {
    return getStockData();
  }
  // ... other handlers
}

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
```

### Environment Configuration

Add to your `.env` file:
```
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/d/{DEPLOYMENT_ID}/usercache
```

Replace `{DEPLOYMENT_ID}` with your Web App deployment ID.

---

## Feature Highlights

✅ **80% Capacity Threshold** - Automatically calculated for each location
✅ **Three Status Levels** - Critical/Warning/Optimal with visual indicators
✅ **Real-time Data** - Fetches from Google Sheets automatically
✅ **Progress Bars** - Visual representation of current utilization
✅ **Device Calculation** - Shows exact count needed to reach 80%
✅ **Critical Alerts** - Banner alerts for any location below 50%
✅ **Fallback Data** - Works with mock data if not connected to Google Sheets
✅ **Responsive Design** - Works on desktop and mobile
✅ **Error Handling** - Graceful degradation if data fetch fails

---

## Files Modified

1. **src/lib/types.ts**
   - Added `StockDeficiency` interface

2. **src/lib/sheetsApi.ts**
   - Added `fetchStockDeficiency()` function
   - Added `mapStockDeficiency()` function
   - Added `generateMockStockDeficiency()` function
   - Updated imports to include `StockDeficiency`

3. **src/components/dashboard/AdvancedViewControl.tsx**
   - Added `stockDeficiency` state
   - Updated `loadData()` to fetch stock data in parallel
   - Added Stock Deficiency Monitor section to JSX
   - Added status badges and progress bars
   - Added critical alerts banner

4. **STOCK_DEFICIENCY_SETUP.md** (New)
   - Complete setup guide
   - Examples and calculations
   - Troubleshooting tips
   - Apps Script code samples

---

## Display Preview

```
STOCK DEFICIENCY MONITOR (80% THRESHOLD)
Devices needed at each location to reach 80% capacity

2 Critical | 85 total needed

┌─────────────────┬─────────┬──────┬──────────────┬─────────┬────────┐
│ Location        │ Current │ Max  │ Utilization  │ Needed  │ Status │
├─────────────────┼─────────┼──────┼──────────────┼─────────┼────────┤
│ Bangalore, KA   │   45    │ 100  │ 45% ▓░░░░░   │  +35    │ 🔴 Crit│
│ Delhi, DL       │   72    │ 100  │ 72% ▓▓▓▓░░░  │  +8     │ 🟡 Warn│
│ Mumbai, MH      │   89    │ 100  │ 89% ▓▓▓▓▓▓▓░ │  +0     │ 🟢 Opt │
│ Hyderabad, TS   │   62    │ 100  │ 62% ▓▓▓░░░░  │  +18    │ 🟡 Warn│
│ Chennai, TN     │   38    │ 100  │ 38% ▓░░░░░   │  +42    │ 🔴 Crit│
└─────────────────┴─────────┴──────┴──────────────┴─────────┴────────┘

⚠️  CRITICAL STOCK ALERT
Bangalore, KA: 35 devices needed, Chennai, TN: 42 devices needed
```

---

## Testing with Mock Data

The dashboard works immediately with mock data. To see real data:

1. Follow the setup steps in `STOCK_DEFICIENCY_SETUP.md`
2. Add your stock data to the "Shahi Dashboard" sheet
3. Deploy Google Apps Script
4. Add deployment URL to `.env`
5. Reload the dashboard

---

## Next Steps

1. **Update Google Sheets**
   - Add "Shahi Dashboard" sheet with Location, Available, Max Capacity columns
   - Fill in your actual stock data for each source location

2. **Update Google Apps Script**
   - Add `getStockData()` function
   - Deploy as Web App

3. **Configure Environment**
   - Add `VITE_GOOGLE_SHEETS_API_URL` to `.env`

4. **Test Dashboard**
   - Reload the application
   - Verify stock deficiency data appears
   - Check that calculations are correct

For detailed instructions, see **STOCK_DEFICIENCY_SETUP.md**
