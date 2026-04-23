# 📸 VISUAL STEP-BY-STEP DEPLOYMENT GUIDE

## Issue: Audit Log Not Showing + Stock Data Error

---

## 🚀 SIMPLIFIED 3-STEP FIX

### **STEP 1: Update Google Apps Script Code**

**Location:** Your Google Sheet → Extensions → Apps Script

```
┌─────────────────────────────────────────┐
│  Google Sheet                           │
├─────────────────────────────────────────┤
│  File  Edit  View  Insert  Format  ...  │
│                                         │
│  [1] Trip Details  [2] Stock  [+]       │
│      Extensions ← CLICK HERE            │
└─────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────┐
│  Extensions Menu                        │
├─────────────────────────────────────────┤
│  ☑ Apps Script    ← CLICK                │
│  ☐ Add-ons        │                     │
│  ☐ Macros         │                     │
│                                         │
└─────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────┐
│  Google Apps Script Editor              │
├─────────────────────────────────────────┤
│  Code.gs          📄                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ OLD CODE HERE (DELETE THIS)     │   │
│  │ function doGet(e) {             │   │
│  │   ...                           │   │
│  │ }                               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [✓ Save] [Deploy]                     │
└─────────────────────────────────────────┘
```

**What to do:**
1. **Ctrl+A** (Select All)
2. **Delete** (Remove old code)
3. Open: [ENHANCED_AUDIT_APPS_SCRIPT.gs](./ENHANCED_AUDIT_APPS_SCRIPT.gs)
4. **Copy ALL** the code
5. **Paste** into Apps Script editor
6. **Save** (Ctrl+S)

---

### **STEP 2: Deploy to Get New URL**

**In Google Apps Script:**

```
┌──────────────────────────────────────────┐
│  Google Apps Script Editor               │
├──────────────────────────────────────────┤
│  [✓ Save]  [Deploy ▼]  [Run]  [Help]     │  ← DEPLOY BUTTON
│                                          │
│  Code.gs                                 │
│  ┌────────────────────────────────────┐  │
│  │ Enhanced Audit Script              │  │
│  │ (your pasted code)                 │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Executions (0)                          │
│  Functions                               │
│                                          │
└──────────────────────────────────────────┘

                    ↓
            [Deploy] → [Deploy ▼]
                    ↓
        ┌────────────────────────────┐
        │ New deployment            │
        │                           │
        │ Select type:  [Web app ▼] │
        │                           │
        │ Execute as:   [Your Email ▼]
        │                           │
        │ Who has access:           │
        │ [Anyone ▼]                │
        │                           │
        │ [Cancel]  [Deploy]        │
        └────────────────────────────┘

                    ↓
        ┌────────────────────────────┐
        │ ✅ DEPLOYED!               │
        │                           │
        │ Deployment ID:            │
        │ AKfycbwZZZZZZZZZZZZZ...  │
        │                           │
        │ Your new URL:             │
        │ https://script.google.com │
        │ /macros/s/AKfycbwZZZ...  │
        │ /exec                     │
        │                           │
        │ 📋 [Copy URL]            │
        └────────────────────────────┘
```

**What you get:**
- New deployment URL (this is important!)
- Example: 
  ```
  https://script.google.com/macros/s/AKfycbwZZZZZZZZZZZZZZZZZZZZZZZ/exec
  ```

---

### **STEP 3: Update .env File**

**File to edit:** [.env](./.env)

```
BEFORE (OLD):
───────────────────────────────────────────
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/AKfycbwLrj-_2jIkZh1352kC-YzbnLt8S6LEyZYCDxntiIaSg83Vp0IfUTuvNDaFivDRq7gE/exec
───────────────────────────────────────────

AFTER (NEW):
───────────────────────────────────────────
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/AKfycbwZZZZZZZZZZZZZZZZZZZZZZZ/exec
                                          ↑
                          (Your NEW URL from Step 2)
───────────────────────────────────────────
```

**Steps:**
1. Open `.env` file in VS Code
2. Find `VITE_GOOGLE_SHEETS_API_URL=`
3. Replace the URL part with YOUR new URL from Step 2
4. **Save** (Ctrl+S)

---

## 🧪 Testing

### **Test 1: Restart App**

```bash
# Terminal
Ctrl+C  (stop current server)

npm run dev
# or
bun dev

# Wait for: ready on http://localhost:5173
```

### **Test 2: Create New Trip**

```
Browser → http://localhost:5173

┌──────────────────────────────┐
│ Create Trip                  │
├──────────────────────────────┤
│ Trip Id: TRIP-001           │
│ SR Number: 100              │
│ Source: Delhi               │
│ Status: Pending             │
│                              │
│ [Cancel]  [Save] ← CLICK    │
└──────────────────────────────┘

        ↓ (Check Audit Log Sheet)

   Google Sheet ← Go Back Here
```

### **Test 3: Check AuditLog Sheet**

```
Google Sheet Tabs:

┌─────────────────────────────────────────┐
│  [Dashboard]  [Trip Details]  [Audit]   │ ← CLICK "AuditLog"
│  ....         ....             Log  [+] │
├─────────────────────────────────────────┤
│ Timestamp | User | Action | Record ID   │
├─────────────────────────────────────────┤
│ 06/03 ... | user@.. | CREATE | TRIP-001│ ← SHOULD APPEAR
│           |         |        |          │
│ (if empty, jump to Troubleshooting)     │
└─────────────────────────────────────────┘
```

### **Test 4: Update Trip**

```
┌──────────────────────────────┐
│ Edit Trip TRIP-001           │
├──────────────────────────────┤
│ Status: Pending  ← CHANGE    │
│         ↓                    │
│         ✏️ In Transit        │
│                              │
│ [Cancel]  [Save] ← CLICK    │
└──────────────────────────────┘

        ↓ (Check Audit Log again)
```

### **Test 5: Verify Stock Data**

```javascript
// Browser Console (F12 → Console)

Paste & Run:
───────────────────────────────────────
fetch('YOUR_APP_SCRIPT_URL?action=getStockData')
  .then(r => r.json())
  .then(d => console.log(d))
───────────────────────────────────────

✅ Should see: 
{
  "stockData": [
    { "Location": "Delhi", "device in use": 23, ... }
  ]
}

❌ If Error: 
"getStockDataFast is not defined"
→ Go back to STEP 1-3
```

---

## 🎯 Expected Results

### **Screen 1: After CREATE**

```
AuditLog Sheet:
┌─────────────┬──────────┬─────────┬────────────────────────────┐
│ Timestamp   │ User     │ Action  │ Details                    │
├─────────────┼──────────┼─────────┼────────────────────────────┤
│ 06/03 14:30 │ user@... │ CREATE  │ {fieldsCreated: [...],    │
│             │          │         │  fieldValues: {...}}       │
└─────────────┴──────────┴─────────┴────────────────────────────┘

✅ Entry visible in AuditLog
```

### **Screen 2: After UPDATE**

```
AuditLog Sheet:
┌─────────────┬──────────┬─────────┬────────────────────────────┐
│ Timestamp   │ User     │ Action  │ Details                    │
├─────────────┼──────────┼─────────┼────────────────────────────┤
│ 06/03 14:30 │ user@... │ CREATE  │ {...}                      │
│ 06/03 15:00 │ user@... │ UPDATE  │ {changes: {Status: {old:   │
│             │          │         │  "Pending", new: "In      │
│             │          │         │  Transit"}}}               │
└─────────────┴──────────┴─────────┴────────────────────────────┘

✅ Both CREATE and UPDATE visible
✅ Shows what changed (old → new)
```

---

## ❌ Troubleshooting Visual

### **Problem: Audit Log Still Empty**

```
┌─────────────────────┐
│ Is Audit Log Visible │
│ when you CREATE?    │
└──────┬──────────────┘
       │
       ├─→ NO ─→ Check .env URL Updated? 
       │         │
       │         └─→ Did you restart? (npm run dev)
       │         
       │         └─→ Did you Deploy new script?
       │         
       │         └─→ AuditLog sheet exists?
       │
       └─→ YES ─→ ✅ ALL WORKING!
```

### **Problem: Stock Data Error**

```
┌──────────────────────┐
│ Error: getStockData  │
│ is not defined       │
└──────┬───────────────┘
       │
       └─→ OLD SCRIPT STILL DEPLOYED
           
           Fix:
           1️⃣ Paste NEW code in Apps Script
           2️⃣ Deploy new version
           3️⃣ Copy new URL
           4️⃣ Update .env
           5️⃣ Restart app
```

---

## 📋 Final Checklist

- [ ] Step 1: Pasted new code in Apps Script
- [ ] Step 1: Code saved (Ctrl+S)
- [ ] Step 2: Deployed (clicked Deploy button)
- [ ] Step 2: Copied new deployment URL
- [ ] Step 3: Updated .env with new URL
- [ ] Step 3: .env file saved
- [ ] Test 1: Restarted app (npm run dev)
- [ ] Test 2: Created new trip
- [ ] Test 3: Checked AuditLog sheet - entry visible ✅
- [ ] Test 4: Updated trip status
- [ ] Test 5: Stock data loads without error
- [ ] All working! 🎉

---

## 🆘 If Still Not Working

Send me:
1. Screenshot of error message
2. Contents of `.env` (can hide sensitive parts)
3. Screenshot of AuditLog sheet
4. Screenshot of Apps Script error logs

**Usually fixed in <10 minutes!** ⏱️
