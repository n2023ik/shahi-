# ✅ Deployment Checklist - Enhanced Audit Log with Change Tracking

Use this checklist to make sure the update tracking is deployed correctly.

---

## Phase 1: Update Google Apps Script

### Step 1.1: Get the Updated Code
- [x] You have the new `updateRow()` function with change tracking
- [x] File location: `supabase/functions/DashboardData.gs` (lines 308-413)

### Step 1.2: Deploy in Google Apps Script
1. Open Google Sheets
2. Click **Extensions** → **Apps Script**
3. Open the **DashboardData.gs** file
4. Replace the `updateRow()` function with the new version (copy from your repo)
5. Click **Save**

### Step 1.3: Create New Deployment
1. Click **Deploy** → **Manage deployments**
2. Find existing deployment, click **🗑️ Delete**
3. Click **+ Create Deployment**
   - Type: **Web App**
   - Execute as: **Your Email** (important!)
   - Who has access: **Anyone**
4. Click **Deploy**
5. **Copy the NEW URL** - it will look like:
   ```
   https://script.google.com/macros/s/AKfycb...../exec
   ```

---

## Phase 2: Update Environment Variables

### Step 2.1: Update .env File

Open `.env` in your project and update:

```env
# Dashboard Data Script: Deploy DashboardData.gs as Web App
VITE_GOOGLE_SHEETS_API_URL=<PASTE_NEW_URL_HERE>
```

Replace `<PASTE_NEW_URL_HERE>` with the URL you copied in Step 1.3

### Step 2.2: Verify AuditLog Sheet Exists

Go to Google Sheets and check:
- [ ] Sheet named **"AuditLog"** exists
- [ ] Has columns: Timestamp | User Email | Action | Sheet | Record ID | Details
- [ ] First row has headers

If missing, create it with these columns:
```
A: Timestamp
B: User Email
C: Action
D: Sheet
E: Record ID
F: Details
```

---

## Phase 3: Deploy to Production

### Step 3.1: Commit Changes
```bash
git add .env
git commit -m "Update Apps Script URL for enhanced audit logging"
git push
```

### Step 3.2: Trigger Vercel Deployment
- Push to GitHub (done above)
- Vercel will auto-deploy
- [x] Watch https://vercel.com/dashboard for deployment status
- [x] Wait for "Ready" status (usually 2-5 minutes)

### Step 3.3: Verify Deployment
1. Go to your Vercel site (e.g., https://shipment-hub.vercel.app)
2. Check console (F12) for any errors
3. Try to login

---

## Phase 4: Test Enhanced Audit Logging

### Test 4.1: Create a Test Trip

1. Click **+ New Trip**
2. Fill in some fields:
   ```
   Trip Id: TEST001
   Vehicle No.: TEST_VEH_001
   Source: Test Location A
   Destination: Test Location B
   Status: Not Created
   ```
3. Click **Save**
4. Wait for success message

**Check Audit Log:**
- [ ] New row appeared in AuditLog sheet
- [ ] User Email shows correctly
- [ ] Action = "CREATE"
- [ ] Record ID = "TEST001"
- [ ] Details shows all created fields

---

### Test 4.2: Update the Trip (The Main Test!)

1. Find **TEST001** trip in the list
2. Click **Edit**
3. Change these fields:
   ```
   Vehicle No.: TEST_VEH_002 (changed from TEST_VEH_001)
   Status: In Progress (changed from Not Created)
   ```
4. Click **Save**
5. Wait for success message
6. Check the browser console (F12)

**Check Audit Log:**
- [ ] New row appeared  
- [ ] Action = "UPDATE"
- [ ] Record ID = "TEST001"
- [ ] **Details contains:**
  ```json
  {
    "entity": "TEST001",
    "totalFields": 2,
    "fieldsChanged": ["Vehicle No.", "Trip Status"],
    "changes": {
      "Vehicle No.": {
        "old": "TEST_VEH_001",
        "new": "TEST_VEH_002"
      },
      "Trip Status": {
        "old": "Not Created",
        "new": "In Progress"
      }
    }
  }
  ```

---

### Test 4.3: Delete the Trip

1. Find **TEST001** trip
2. Click **Delete**
3. Confirm deletion
4. Wait for success message

**Check Audit Log:**
- [ ] New row appeared
- [ ] Action = "DELETE"
- [ ] Record ID = "TEST001"
- [ ] Details shows the deleted trip info

---

## Phase 5: Verify with Real Data

### Test 5.1: Edit a Real Trip

1. Pick an existing trip from your actual data
2. Edit ONE field only (e.g., change Vehicle No.)
3. Save
4. Check Audit Log:
   - [ ] Only that ONE field appears in `changes`
   - [ ] Old value is shown correctly
   - [ ] New value is shown correctly
   - [ ] `totalFields` = 1

### Test 5.2: Edit Multiple Fields

1. Edit a trip with changes to 3+ fields
2. Save
3. Check Audit Log:
   - [ ] All changed fields appear
   - [ ] No unchanged fields are listed
   - [ ] `totalFields` shows the correct count

---

## Phase 6: Verify Functionality

### Check 6.1: Filter by Trip ID

1. Go to AuditLog sheet
2. Click **Data** → **Create a filter**
3. Filter **Record ID** = specific trip ID
4. Should see timeline of all changes to that trip

### Check 6.2: Filter by User

1. Filter **User Email** = your email
2. Should see all changes you made

### Check 6.3: Filter by Action

1. Filter **Action** = "UPDATE"
2. Should see only updates (no creates/deletes)
3. Each update should show what changed

---

## Phase 7: Common Issues & Fixes

### Issue: Details column is empty
**Fix:**
- [ ] Verify new Apps Script deployment is live (not old version)
- [ ] Try creating a NEW trip and updating it
- [ ] Check Apps Script execution logs for errors

### Issue: Old/new values show same value
**Fix:**
- This is actually correct if you didn't change the field
- Unchanged fields won't appear in the audit log

### Issue: Audit log not appearing at all
**Fix:**
- [ ] Verify AuditLog sheet exists and is named correctly (case-sensitive)
- [ ] Check Apps Script → Executions view for errors
- [ ] Try redeploying Apps Script again

### Issue: UPDATE isn't working (from earlier issue)
**Fix:**
- [ ] This should be fixed by deploying the new code
- [ ] If still broken, follow `UPDATE_NOT_WORKING_VERCEL_FIX.md` guide

---

## Phase 8: Team Communication

Once everything is verified:

📧 **Tell your team:**
- "We've deployed enhanced audit logging"
- "Changes are now tracked with before/after values"
- "All changes go to the AuditLog sheet with details"
- "You can see what changed, who changed it, and when"

📄 **Share these guides:**
- `HOW_TO_READ_AUDIT_LOG_CHANGES.md` - How to interpret changes
- `ENHANCED_AUDIT_LOG_CHANGES.md` - Technical details

---

## Final Checklist

Before marking complete, verify:

- [ ] New Apps Script URL in .env
- [ ] Deployed to Vercel (watch status)
- [ ] AuditLog sheet exists
- [ ] TEST001 trip was created → appears in audit log
- [ ] TEST001 trip was updated → shows old/new values
- [ ] TEST001 trip was deleted → appears in audit log
- [ ] Filtering by trip ID works
- [ ] Filtering by user email works
- [ ] Filtering by action works

---

## Success Indicators ✅

You'll know it's working when:
1. ✅ Every update shows in the Audit Log
2. ✅ Audit Log shows ONLY fields that actually changed
3. ✅ Old and new values are visible for each field
4. ✅ Trip ID/entity is clearly shown
5. ✅ User email and timestamp are correct
6. ✅ Team can filter and understand what changed

---

## Questions?

Refer to:
- `HOW_TO_READ_AUDIT_LOG_CHANGES.md` - How to read the changes
- `ENHANCED_AUDIT_LOG_CHANGES.md` - Technical details
- `AUDIT_LOG_SETUP.md` - Original audit log setup

---

**You're now ready to track every change with full visibility!** 🎉
