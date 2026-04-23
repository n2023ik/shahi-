# 🔧 QUICK FIX - AUDIT LOG NOT SHOWING + STOCK DATA ERROR

## The Problem (समस्या)

```
Frontend ✅ (sends data correctly with userEmail)
         ↓
Google Apps Script ❌ (OLD version - missing audit functions)
         ↓
Audit Log Sheet (empty)
Stock Data (error: getStockDataFast is not defined)
```

---

## The Solution (समाधान) - 3 Steps

### **STEP 1: Copy New Script → Google Apps Script**

1. Open your Google Sheet
2. **Extensions → Apps Script**
3. **Select ALL** code (Ctrl+A) → **Delete**
4. Copy this ENTIRE content: [ENHANCED_AUDIT_APPS_SCRIPT.gs](./ENHANCED_AUDIT_APPS_SCRIPT.gs)
5. **Paste** into Apps Script editor
6. **Save** (Ctrl+S)

**Verify in Apps Script:** Look for these functions:
- ✅ `getStockDataFast()` - Should be there
- ✅ `logAudit()` - Should be there
- ✅ `getAuditLogs()` - Should be there

---

### **STEP 2: Deploy → Get New URL**

In Google Apps Script editor:

1. **Click "Deploy" button** (top right, blue button)
2. Click **"New deployment"**
3. **Type**: Select "Web app"
4. **Execute as**: Your Google Account
5. **Who has access**: "Anyone"
6. Click **"Deploy"**
7. **COPY the new URL** (will look like):
```
https://script.google.com/macros/s/AKfycbwZZZZZZZZZZZZZZZZZZZZZZZ/exec
```

---

### **STEP 3: Update .env File**

Edit: [.env](./.env)

**Find this line:**
```bash
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/AKfycbwLrj-_2jIkZh1352kC-YzbnLt8S6LEyZYCDxntiIaSg83Vp0IfUTuvNDaFivDRq7gE/exec
```

**Replace with your NEW URL from STEP 2:**
```bash
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_NEW_URL_FROM_STEP_2/exec
```

**Save the file**

---

## ✅ Test It Works

### **Test 1: Restart App**
```bash
# Terminal
npm run dev
```

Wait for "ready on http://localhost:5173" or similar

### **Test 2: Create New Trip**

1. Open app in browser
2. Create a NEW trip
3. Submit

### **Test 3: Check Audit Log Sheet**

1. Go to Google Sheet
2. Click on **AuditLog** sheet (tab at bottom)
3. **You should see:**

| Timestamp | User | Action | Sheet | Record ID | Details |
|-----------|------|--------|-------|-----------|---------|
| 06/03/2026 14:30:45 | your@email.com | CREATE | Shahi Reverse Pickup/Trip Details | TRIP-XXX | {fields...} |

If nothing shows → Keep reading the troubleshooting section

### **Test 4: Update Existing Trip**

1. Edit an existing trip (change Status field)
2. Save

### **Test 5: Check Audit Log Again**

You should now see UPDATE entry:

| Timestamp | User | Action | Sheet | Record ID | Details |
|-----------|------|--------|-------|-----------|---------|
| ... | ... | UPDATE | Shahi Reverse Pickup/Trip Details | TRIP-XXX | {old: "Pending", new: "In Transit"} |

### **Test 6: Stock Data**

In browser console (F12 → Console tab):
```javascript
// Copy-paste this and press Enter:
fetch('YOUR_APP_SCRIPT_URL?action=getStockData')
  .then(r => r.json())
  .then(d => { console.log('Stock Data:', d); console.log('Status:', d.stockData ? '✅ OK' : '❌ ERROR'); })
```

**Should print:**
```
Stock Data: { stockData: [ { Location: "...", device in use: X, ... }, ... ] }
Status: ✅ OK
```

---

## 🔍 If Tests Fail

### ❌ **Stock Data Still Says "getStockDataFast is not defined"**

**Check 1: Did you deploy?**
```
Google Apps Script
  ↓ Top Right → "Deploy" button
  ↓ New deployment
  ↓ Web app
  ↓ Should see "Active deployments" section
```

**Check 2: Is new URL in .env?**
```bash
# In terminal:
cat .env | grep VITE_GOOGLE_SHEETS_API_URL
```

Should show the NEW URL (not old one starting with AKfycbwLrj...)

**Check 3: Did you restart the app?**
```bash
# Stop current (Ctrl+C)
# Restart:
npm run dev
```

**Check 4: Clear browser cache**
- Press: **Ctrl+Shift+Delete**
- Click "Cached images and files"
- Clear

---

### ❌ **Audit Log Still Empty**

**Check 1: Does AuditLog sheet exist?**
- Open Google Sheet
- Look at sheet tabs (bottom)
- Must have tab named: **AuditLog**
- If missing, create it manually:
  - Right-click sheet tab → Insert sheet
  - Name: AuditLog
  - Headers (row 1): Timestamp, User Email, Action, Sheet Name, Record ID, Details

**Check 2: Is userEmail being passed?**

In browser DevTools (F12 → Network):
1. Create a new trip
2. Look for request to apps script
3. In request body, search for: `userEmail`
4. Should be there

**Check 3: Open Apps Script Logs**

In Google Apps Script editor:
1. **Execution** (left sidebar)
2. See recent function executions
3. Look for errors

**Check 4: Run test function**

In Google Apps Script, create new function:

```javascript
function testAuditLog() {
  const logs = getAuditLogs();
  Logger.log("Total logs: " + logs.length);
  Logger.log(JSON.stringify(logs, null, 2));
}
```

Then click **Run** and check **Logs** (Ctrl+Enter)

---

## 📋 Checklist Before & After

### **BEFORE**
- [ ] Stock data error
- [ ] Audit log empty
- [ ] Can't track updates

### **AFTER (You Should Have)**
- [x] Stock data loads: ✅
- [x] Audit log shows: ✅
- [x] Update tracking: ✅
- [x] User attribution: ✅
- [x] Field-level changes: ✅

---

## 🎯 Expected Behavior After Fix

### **CREATE Trip**
```json
{
  "timestamp": "06/03/2026 14:30:45",
  "user": "your@email.com",
  "action": "CREATE",
  "fieldsCreated": ["Trip Id", "SR Number", "Status", "Source"],
  "details": {
    "Trip Id": "TRIP-123",
    "SR Number": "100",
    "Status": "Pending",
    "Source": "Delhi"
  }
}
```

### **UPDATE Trip (Status Changed)**
```json
{
  "timestamp": "06/03/2026 15:45:30",
  "user": "your@email.com",
  "action": "UPDATE",
  "whatChanged": "Status: Pending → In Transit",
  "fieldsChanged": 1,
  "details": {
    "changes": {
      "Status": {
        "old": "Pending",
        "new": "In Transit"
      }
    }
  }
}
```

---

## 🆘 Still Stuck?

### **Option 1: Check App Script Logs**
1. Apps Script editor
2. Click "Execution" (left)
3. Screenshot any errors
4. Share the error message

### **Option 2: Test API Directly**

In Apps Script, add and run:

```javascript
function testCreateUpdate() {
  // Simulate what frontend sends
  const body = {
    action: "update",
    sheet: "Shahi Reverse Pickup/Trip Details",
    idColumn: "Trip Id",
    idValue: "TRIP-001",
    userEmail: "test@email.com",
    updates: {
      Status: "Delivered",
      __rowNumber: 2
    }
  };
  
  Logger.log("Testing update with:");
  Logger.log(JSON.stringify(body, null, 2));
  
  try {
    const result = updateRow(
      body.sheet,
      body.idColumn,
      body.idValue,
      body.updates,
      body.userEmail
    );
    Logger.log("Result: " + JSON.stringify(result));
  } catch (e) {
    Logger.log("Error: " + e.message);
  }
}
```

Run it and check logs

### **Option 3: Message Me**

Share:
1. Screenshot of error
2. Contents of `.env` file (obscure the URLs)
3. Screenshot of AuditLog sheet
4. Screenshot of Apps Script logs

---

## ⏱️ Expected Time

- Deploy: **2-3 minutes**
- Update .env: **1 minute**
- Test: **3-5 minutes**

**Total: ~10 minutes to full fix** ✅

---

## 🎉 Final Step

After everything works:

1. Commit your changes:
```bash
git add .env ENHANCED_AUDIT_APPS_SCRIPT.gs
git commit -m "Fix: Deploy enhanced audit script and update API endpoint"
```

2. Share audit trail link with team:
```
To view audit history of a trip:
GET /apps-script?action=getRecordAuditTrail&recordId=TRIP-123&sheetName=Shahi Reverse Pickup/Trip Details
```

**You're done!** 🚀
