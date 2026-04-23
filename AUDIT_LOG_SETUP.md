# Audit Log Setup Guide

## Overview
An **Audit Log** system has been added to track who makes changes through the web app. This solves the issue where Google Sheets version history only shows the script owner's account.

## What Was Changed

### Backend (Google Apps Script)
✅ Added `AUDIT_LOG` sheet constant  
✅ Created `logAudit()` function to record all changes  
✅ Modified `createRow()`, `updateRow()`, `deleteRow()` to log changes  
✅ Added `userEmail` parameter extraction from requests  

### Frontend (React/TypeScript)
✅ Added JWT token decoding in [auth.ts](src/lib/auth.ts)  
✅ Automatic email extraction when user logs in  
✅ Added `getUserEmail()` function  
✅ Modified [sheetsApi.ts](src/lib/sheetsApi.ts) to send userEmail with all create/update/delete operations  

---

## Setup Instructions

### Step 1: Create AuditLog Sheet in Google Sheets

1. Open your Google Sheets: `https://docs.google.com/spreadsheets/d/1CNF8nj-T9xTkzyb7JW02R7rwUg1MqxhAzPuM_2_7QQs`

2. Create a new sheet named **exactly** `AuditLog` (case-sensitive)

3. Add these column headers in row 1:

   | A | B | C | D | E | F |
   |---|---|---|---|---|---|
   | Timestamp | User Email | Action | Sheet | Record ID | Details |

4. Optional: Format the sheet for better readability
   - Bold the header row
   - Freeze the header row (View → Freeze → 1 row)
   - Set column widths:
     - Timestamp: 150px
     - User Email: 200px
     - Action: 100px
     - Sheet: 200px
     - Record ID: 150px
     - Details: 400px (or auto-width)

### Step 2: Redeploy Apps Script

1. Open Apps Script Editor:
   - In Google Sheets: Extensions → Apps Script

2. Copy the updated [DashboardData.gs](supabase/functions/DashboardData.gs) code

3. Replace the entire code in your Apps Script project

4. **Redeploy the web app:**
   - Click **Deploy** → **Manage deployments**
   - Click the **Edit** (pencil) icon on your existing deployment
   - Under "Version", select **New version**
   - Add description: "Added audit log functionality"
   - Click **Deploy**

⚠️ **Important:** You MUST create a new version. Simply saving the code is not enough!

### Step 3: Test the Audit Log

1. Open your web app dashboard

2. Make a test change:
   - Create a new trip, OR
   - Edit an existing trip, OR
   - Delete a trip

3. Check the AuditLog sheet - you should see a new entry with:
   - Current timestamp (dd/MM/yyyy HH:mm:ss format)
   - Your email address
   - Action type (CREATE, UPDATE, or DELETE)
   - Sheet name ("Shahi Reverse Pickup/Trip Details")
   - Record ID (the Trip Id)
   - JSON details of what was changed

---

## How It Works

### When You Create a Trip:
```
Timestamp: 04/03/2026 19:30:45
User Email: yourname@example.com
Action: CREATE
Sheet: Shahi Reverse Pickup/Trip Details
Record ID: LY1234567
Details: {"Trip Id":"LY1234567","Vehicle No.":"MH12AB1234",...}
```

### When You Update a Trip:
```
Timestamp: 04/03/2026 19:35:22
User Email: yourname@example.com
Action: UPDATE
Sheet: Shahi Reverse Pickup/Trip Details
Record ID: Trip Id=LY1234567
Details: {"Vehicle No.":"MH12CD5678","Status":"Completed"}
```

### When You Delete a Trip:
```
Timestamp: 04/03/2026 19:40:10
User Email: yourname@example.com
Action: DELETE
Sheet: Shahi Reverse Pickup/Trip Details
Record ID: Trip Id=LY1234567
Details: {"Trip Id":"LY1234567","Vehicle No.":"MH12CD5678",...}
```

---

## Benefits

✅ **Complete Audit Trail:** Know exactly who changed what and when  
✅ **Accountability:** Track all modifications by actual user, not just script owner  
✅ **Compliance:** Meet audit requirements for data changes  
✅ **Troubleshooting:** Easily investigate when data issues occur  
✅ **Non-Intrusive:** Doesn't modify your existing data sheets  

---

## Troubleshooting

### Email Shows as "Unknown User"
**Cause:** User's email wasn't extracted from login token  
**Fix:** 
1. Log out completely
2. Clear browser cache/session storage
3. Log in again with Google

### AuditLog Sheet Not Found Error
**Cause:** Sheet name mismatch or sheet doesn't exist  
**Fix:**
1. Verify sheet is named exactly `AuditLog` (case-sensitive)
2. Make sure it's in the same spreadsheet
3. Redeploy the Apps Script

### No Entries Appearing in AuditLog
**Cause:** Old Apps Script version still running  
**Fix:**
1. Go to Apps Script: **Deploy** → **Manage deployments**
2. Click **Edit** (pencil icon)
3. Select **New version** (not current version)
4. Click **Deploy**
5. Wait 1-2 minutes for Google to update
6. Try making a change again

### Audit Logging Doesn't Stop Main Operations
The `logAudit()` function is wrapped in try-catch, so:
- ✅ If audit logging fails, your create/update/delete still succeeds
- ✅ Errors are logged but don't break functionality
- ✅ You can check Apps Script execution logs if needed

---

## Security Note

The user email is extracted from the Google JWT token payload on the frontend. Since the token is already verified by your backend (Auth.gs), this email is trustworthy and reflects the actual logged-in user.

---

## Next Steps

After setup, you can:
- Create filters/views in the AuditLog sheet to see specific users' actions
- Set up email notifications for certain actions (using Apps Script triggers)
- Export audit logs for compliance reporting
- Add more detailed logging if needed (e.g., old vs new values)

---

## Need Help?

If you encounter issues:
1. Check Apps Script execution logs (View → Executions)
2. Check browser console for errors
3. Verify all steps above were completed
4. Ensure the sheet name is exactly `AuditLog`
