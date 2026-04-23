# 🔧 Device Data Fix - Complete Guide

## Problem: सिर्फ 2 sources दिख रहे हैं

**अभी क्या दिख रहा है:** Krishnagiri - Unit 27, Faridabad F1  
**क्या होना चाहिए:** सभी sources (F1, F2, Noida - A7, Bangalore units, etc.)

---

## ✅ Solution: Step-by-Step Fix

### Step 1️⃣: Google Apps Script खोलें

1. Browser में जाएं: https://script.google.com
2. अपनी **Shahi Dashboard** project खोलें
3. `DashboardData.gs` file पर click करें

### Step 2️⃣: Updated Code Copy करें

1. इस project में `supabase/functions/DashboardData.gs` file को पूरा copy करें
2. Google Apps Script में पूरा code **replace** कर दें
3. **Ctrl+S** से save करें

### Step 3️⃣: Test Function Run करें

1. Top पर function dropdown में **`testStockDataParsing`** select करें
2. ▶️ **Run** button पर click करें
3. पहली बार authorization मांगेगा - **Review permissions → Allow** करें
4. नीचे **Execution log** देखें

**Execution log में ये दिखना चाहिए:**

```
📊 SHEET STRUCTURE ANALYSIS
========================================
Total rows: 150
Total columns: 2
========================================

📋 FIRST 200 ROWS:
========================================
Row  1: [Shahi Status] = [Count]
Row  2: [Total Shipment Count] = [64]
Row  5: [Faridabad F1] = []
Row  6: [Total Shipment Count] = [1]
Row  7: [In-Transit Trips] = [0]
Row  8: [device in use] = [2]
Row  9: [device avilable] = [8]
...
Row 25: [Faridabad F2] = []
Row 26: [device in use] = [0]
Row 27: [device avilable] = [0]
...
Row 45: [Noida - A7] = []
Row 46: [device in use] = [0]
...

========================================
🔍 NOW RUNNING getStockData()...
========================================
✓ Faridabad F1 → In Use: 2, Available: 8
✓ Faridabad F2 → In Use: 0, Available: 0
✓ Noida - A7 → In Use: 0, Available: 0
✓ Krishnagiri - Unit 27 → In Use: 8, Available: 2
...
========================================
Total locations found: 8
========================================
```

### Step 4️⃣: Deploy करें (नया version)

अगर test सही हो गया तो:

1. **Deploy** button पर click करें > **Manage deployments**
2. Active deployment के बगल में ⚙️ (gear icon) पर click करें
3. **Version:** को **"New version"** में change करें
4. **Description** में लिखें: "Fixed device data parsing for all sources"
5. **Deploy** button पर click करें
6. Deployment URL copy करें (अगर पहले से है तो same रहेगा)

### Step 5️⃣: Dashboard Refresh करें

1. अपना browser dashboard खोलें
2. **Hard refresh** करें:
   - **Windows:** Ctrl+Shift+R या Ctrl+F5
   - **Mac:** Cmd+Shift+R
3. या फिर dashboard के **Refresh button** (🔄) पर click करें

---

## 🧪 Direct API Test (Optional)

Browser में अपना Apps Script URL + `?action=getStockData` खोलें:

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getStockData
```

**Expected Response:**
```json
{
  "stockData": [
    {"Location": "Faridabad F1", "device in use": 2, "device avilable": 8},
    {"Location": "Faridabad F2", "device in use": 0, "device avilable": 0},
    {"Location": "Noida - A7", "device in use": 0, "device avilable": 0},
    {"Location": "Noida - F10", "device in use": 0, "device avilable": 0},
    {"Location": "Bangalore UNIT -46", "device in use": 0, "device avilable": 0},
    {"Location": "Bangalore UNIT -28", "device in use": 0, "device avilable": 0},
    {"Location": "Bangalore UNIT - 9", "device in use": 0, "device avilable": 0},
    {"Location": "Krishnagiri - Unit 27", "device in use": 8, "device avilable": 2},
    {"Location": "HYDRABAD - HYD", "device in use": 0, "device avilable": 0},
    {"Location": "ODISHA - BBSR", "device in use": 0, "device avilable": 0}
  ]
}
```

---

## ❌ अगर फिर भी Problem हो तो...

### Debug Info भेजें:

**Execution log से ये copy करें:**

1. Total rows: कितने?
2. First 50 rows की list (Row 1 से Row 50 तक)
3. "Total locations found:" कितने?

**मुझे screenshot भेजें:**

1. Google Apps Script का Execution log
2. Google Sheets की screenshot (columns A and B, first 50 rows)
3. Browser में API response (अगर direct test किया तो)

---

## 📝 Sheet Format Requirement

आपकी "Shahi Dashboard" sheet का format ऐसा होना चाहिए:

```
Column A                          | Column B
----------------------------------|----------
Shahi Status                      | Count
Total Shipment Count              | 64
...                               | ...
(blank)                           |
Faridabad F1                      | (empty)
Total Shipment Count              | 1
In-Transit Trips                  | 0
device in use                     | 2
device avilable                   | 8
...                               | ...
(blank or next source)            |
Faridabad F2                      | (empty)
Total Shipment Count              | 0
device in use                     | 0
device avilable                   | 0
...                               | ...
```

**Important:**
- Source name होना चाहिए column A में
- "device in use" exactly ऐसा ही spelling (lowercase)
- "device avilable" typo के साथ (original sheets में ऐसा ही है)

---

## ✅ Success Indicators

जब सब ठीक हो जाएगा तो dashboard में:

✅ **Device Utilization Overview** में सभी devices count सही  
✅ **Source-wise Device Breakdown** table में 8-10 locations  
✅ Krishnagiri - Unit 27 में **HIGH UTILIZATION** alert (80%)  
✅ **Critical Utilization Alert** banner नीचे दिखेगा

---

Need help? Share your execution log! 🚀

1. Google Apps Script Editor खोलें
2. **Run** > `getStockData` function select करें
3. **Run** button पर click करें  
4. **Execution log** में देखें कितने sources detect हो रहे हैं

## Expected Output in Logs:
```
Found source: Faridabad F1 | In Use: 2 | Available: 8
Found source: Faridabad F2 | In Use: 0 | Available: 0
Found source: Noida - A7 | In Use: 0 | Available: 0
...
Total extracted: X stock locations
```

## अगर सभी sources नहीं दिख रहे तो:

### Option 1: Sheet Structure Check करें
आपकी sheet इस format में होनी चाहिए:

```
| Column A                      | Column B (Count) |
|-------------------------------|------------------|
| Faridabad F1                  |                  |
| Total Shipment Count          | 1                |
| device in use                 | 2                |
| device avilable               | 8                |
| (more metrics...)             |                  |
| Faridabad F2                  |                  |
| Total Shipment Count          | 0                |
| device in use                 | 0                |
| device avilable               | 0                |
```

### Option 2: Manual Test करें

Apps Script में ये test function add करें:

```javascript
function testStockDataParsing() {
  const sheet = getSheet(SHEETS.DASHBOARD);
  const data = sheet.getDataRange().getValues();
  
  Logger.log("Total rows: " + data.length);
  
  // Print first 50 rows to see structure
  for (let i = 0; i < Math.min(50, data.length); i++) {
    Logger.log("Row " + i + ": [" + data[i][0] + "] = [" + data[i][1] + "]");
  }
}
```

Run करें और देखें sheet का exact structure कैसा है।

## Browser में Direct Test:

अपना Apps Script URL + `?action=getStockData` को browser में खोलें:
```
https://script.google.com/...../exec?action=getStockData
```

Response में देखें कितने sources आ रहे हैं।
