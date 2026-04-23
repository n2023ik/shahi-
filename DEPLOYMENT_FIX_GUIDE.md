# 🚀 DEPLOYMENT & FIX GUIDE

## Issues You're Experiencing

### ❌ **Issue 1: Stock Data Error**
```
Failed to load stock data: getStockDataFast is not defined
```

**Root Cause:** The new Enhanced Audit Script wasn't deployed to Google Apps Script yet.

### ❌ **Issue 2: UPDATE Data Not in Audit Log**
```
Update operations not creating audit log entries
```

**Root Cause:** The frontend might still be using the OLD API endpoint URL, or the script wasn't deployed.

---

## ✅ **Solution: Deploy Enhanced Script**

### **Step 1: Go to Google Apps Script**

1. Open your Google Sheet
2. Click: **Extensions → Apps Script**
3. You'll see the current code

### **Step 2: Replace with Enhanced Version**

Copy ALL code from here: [ENHANCED_AUDIT_APPS_SCRIPT.gs](./ENHANCED_AUDIT_APPS_SCRIPT.gs)

Then:
1. Delete all existing code in Apps Script editor
2. Paste the new code
3. **Save** (Ctrl+S)

### **Step 3: Deploy New Version**

In Apps Script Editor:

1. Click **Deploy** button (top right)
2. Select **New deployment**
3. Choose type: **Web app**
4. Fill in:
   - Execute as: **Your Google Account**
   - Who has access: **Anyone**
5. Click **Deploy**
6. **Copy the new deployment URL** - यह बहुत important है!

Example URL format:
```
https://script.google.com/macros/s/AKfycbwXXXXXXXXXXXXXXXXXXXXX/exec
```

### **Step 4: Update Your .env File**

Update the `.env` file with your NEW deployment URL:

**File:** [.env](./.env)

```bash
# OLD (Remove this line)
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/AKfycbwLrj-_2jIkZh1352kC-YzbnLt8S6LEyZYCDxntiIaSg83Vp0IfUTuvNDaFivDRq7gE/exec

# NEW (Add this with YOUR new URL from Step 3)
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_NEW_URL_HERE/exec
```

### **Step 5: Verify AuditLog Sheet Exists**

Check your Google Sheet:
- Must have a sheet named: **AuditLog**
- Columns (A-F):
  - A: Timestamp
  - B: User Email  
  - C: Action
  - D: Sheet Name
  - E: Record ID
  - F: Details

If it doesn't exist, create it manually.

### **Step 6: Restart Your Application**

```bash
# Terminal में:
npm run dev
# या
bun dev
```

Clear browser cache (Ctrl+Shift+Delete) and reload.

---

## 🧪 **Test the Fix**

### **Test 1: Create New Entry**

1. Create a new trip
2. Check AuditLog sheet
3. Should see: CREATE entry with fields

**Expected:**
```
Timestamp: 06/03/2026 10:45:30
User: your@email.com
Action: CREATE
Sheet: Shahi Reverse Pickup/Trip Details
Record ID: TRIP-123
Details: {...field values...}
```

### **Test 2: Update an Entry**

1. Edit an existing trip (change Status)
2. Check AuditLog sheet
3. Should see: UPDATE entry with old→new values

**Expected:**
```
Timestamp: 06/03/2026 11:00:15
User: your@email.com
Action: UPDATE
Sheet: Shahi Reverse Pickup/Trip Details
Record ID: TRIP-123
Details: {
  "changes": {
    "Status": {
      "old": "Pending",
      "new": "Delivered"
    }
  },
  "fieldsChanged": ["Status"],
  "totalFieldsChanged": 1
}
```

### **Test 3: Stock Data API**

In browser console:

```javascript
// Test if stock data loads
fetch('YOUR_APPS_SCRIPT_URL?action=getStockData')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e));
```

Should return:
```json
{
  "stockData": [
    {
      "Location": "Delhi",
      "device in use": 45,
      "device avilable": 12
    }
  ]
}
```

---

## 🔍 **Troubleshooting**

### ✅ **Stock Still Not Loading?**

**Check 1:** Is `.env` updated with new URL?
```bash
# In terminal:
cat .env | grep VITE_GOOGLE_SHEETS_API_URL
```

Should show your NEW deployment URL (not old one)

**Check 2:** Is script deployed?
- Go to Google Apps Script
- Click Deploy button
- See if it shows "Active deployments"

**Check 3:** Is Dashboard sheet exists in Google Sheet?
- Should be named exactly: `Shahi Dashboard`
- Must have data in columns A-B or C onwards

### ✅ **Audit Log Still Not Showing?**

**Check 1:** Does AuditLog sheet exist?
```javascript
// In Apps Script, run this function:
function testAuditLog() {
  const result = listAllSheets();
  Logger.log(JSON.stringify(result, null, 2));
}

// Check logs (Ctrl+Enter) - should show AuditLog in list
```

**Check 2:** Is userEmail being passed?

Look at network request in browser DevTools when creating/updating:
- Should include: `userEmail` parameter
- Value should be visible in AuditLog sheet column B

**Check 3:** Is the new code deployed?
- Check Apps Script editor
- Should see new functions like: `getAuditLogs`, `getRecordAuditTrail`

---

## 📋 **Deployment Checklist**

- [ ] Copy new script code
- [ ] Paste in Google Apps Script editor
- [ ] Save the code
- [ ] Deploy new version (get new URL)
- [ ] Copy new deployment URL
- [ ] Update .env file with new URL
- [ ] Verify AuditLog sheet exists
- [ ] Restart application (npm run dev)
- [ ] Clear browser cache
- [ ] Test: Create new entry
- [ ] Test: Update entry
- [ ] Check AuditLog sheet for entries
- [ ] Check stock data loads

---

## 📝 **Before/After URLs**

**BEFORE (पुराना - Don't use):**
```
https://script.google.com/macros/s/AKfycbwLrj-_2jIkZh1352kC-YzbnLt8S6LEyZYCDxntiIaSg83Vp0IfUTuvNDaFivDRq7gE/exec
```

**AFTER (नया - Use this):**
```
Your new URL from Step 3 deployment
```

---

## 🚨 **Common Mistakes**

❌ Forgot to Deploy
- Just copy-pasting isn't enough!
- **Must Deploy** and get new URL

❌ Old URL in .env
- Even after deploying, if .env has old URL, won't work
- **Must update .env** with new URL

❌ AuditLog sheet missing
- Audit will fail silently
- **Must create** AuditLog sheet manually

❌ Frontend still using old endpoint
- Browser cache might show old version
- **Clear cache** Ctrl+Shift+Delete

---

## ✨ **After Deployment**

Once you deploy and test:
- ✅ Stock data loads without error
- ✅ CREATE operations log to audit
- ✅ UPDATE operations show old→new values
- ✅ Can query audit logs via API
- ✅ User attribution working

**You're all set!** 🎉

---

## 🆘 **Still Having Issues?**

1. **Check Apps Script Execution Logs:**
   - Open Apps Script editor
   - Click **Execution** on left side
   - See if there are error logs
   - Screenshot the error and share

2. **Verify Sheet IDs Match:**
   ```javascript
   // In Apps Script, run:
   function checkConfig() {
     const result = listAllSheets();
     Logger.log(JSON.stringify(result, null, 2));
   }
   ```
   - Check output
   - See if AUDIT_LOG_exists shows true

3. **Test API Directly:**
   ```javascript
   // In Apps Script, run:
   function testStockData() {
     const result = getStockDataFast();
     Logger.log(JSON.stringify(result, null, 2));
   }
   ```

---

## 📞 Next Steps

1. ✅ Deploy the script NOW
2. ✅ Update .env file
3. ✅ Restart application
4. ✅ Test CREATE/UPDATE operations
5. ✅ Share results

**Happy deploying!** 🚀
