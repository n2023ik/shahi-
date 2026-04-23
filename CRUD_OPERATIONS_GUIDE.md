# 🎯 CRUD Operations Guide - Edit, Update & Delete Data via UI

## Overview
Your Shipment Hub dashboard now has full **CRUD (Create, Read, Update, Delete)** functionality with an enhanced user experience including confirmation dialogs, loading states, and comprehensive error handling.

---

## ✨ Features Implemented

### 1. **Create New Trips** ➕
- Click the **"New Trip"** button in the dashboard header
- Fill in the trip form with all required details:
  - Vehicle Number (Required)
  - Source Address (Required)
  - Destination Address (Required)
  - Transporter Name (Required)
  - Trip Status, Dates, Task IDs, etc.
- Click **"Create"** to save
- The system will:
  - Show a loading spinner on the button
  - Display "Creating trip..." notification
  - Save to Google Sheets via API
  - Show "Trip created successfully" on completion
  - Auto-refresh the data from the server

### 2. **Edit/Update Trips** ✏️
- Find the trip you want to edit in the table
- Click the **✏️ Edit** button (pencil icon) in the Actions column
- The form will open pre-filled with existing data
- Modify any fields as needed
- Click **"Update"** to save changes
- The system will:
  - Show loading state with "Updating..." text
  - Display "Updating trip..." notification
  - Update the record in Google Sheets
  - Show "Trip updated successfully" on completion
  - Refresh data to reflect server state

### 3. **Delete Trips** 🗑️
- Find the trip you want to delete
- Click the **🗑️ Delete** button (trash icon) in the Actions column
- A **confirmation dialog** will appear:
  - Shows trip ID you're about to delete
  - Warns that this action is permanent and cannot be undone
  - Provides "Cancel" or "Delete" options
- Click **"Delete"** to confirm
- The system will:
  - Show loading spinner with "Deleting..." text
  - Remove trip from UI immediately (optimistic update)
  - Delete from Google Sheets via API
  - Show "Trip deleted successfully" notification
  - On error: reverts the deletion and shows error message

### 4. **View Trip Details** 👁️
- Click the **👁️ View** button (eye icon) to see full trip details
- Opens a read-only modal with all trip information
- Perfect for reviewing data without accidentally editing

---

## 🎨 User Experience Enhancements

### 1. **Confirmation Dialogs**
- **Delete operations** now require confirmation
- Prevents accidental deletions
- Shows exactly what will be deleted

### 2. **Loading States**
- All buttons show loading spinners during operations
- Clear feedback: "Creating...", "Updating...", "Deleting..."
- Buttons are disabled during operations to prevent duplicate submissions

### 3. **Toast Notifications**
- **Progress notifications**: "Creating trip...", "Updating trip..."
- **Success notifications**: "Trip created successfully", "Trip updated successfully"
- **Error notifications**: "Create failed", "Delete failed" with retry suggestions
- Notifications appear in the bottom-right corner

### 4. **Optimistic Updates**
- UI updates immediately for snappy user experience
- Changes show instantly, then sync with server
- Automatic rollback if server operation fails

### 5. **Automatic Data Refresh**
- After successful operations, data refreshes from Google Sheets
- Ensures UI always shows the latest server state
- Background refresh every 30 seconds

---

## 🔧 Technical Implementation

### Frontend Components
- **Index.tsx**: Main logic with `handleDeleteClick`, `handleDeleteConfirm`, `handleSave`
- **TripTable.tsx**: Action buttons (Edit, Delete, View)
- **TripFormModal.tsx**: Form for create/edit with validation and loading states
- **AlertDialog**: Confirmation dialog for destructive operations

### API Layer (sheetsApi.ts)
```typescript
// Create a new trip
await createTrip(trip);

// Update existing trip
await updateTrip(trip);

// Delete trip by ID
await deleteTrip(tripId);

// Fetch all trips
await fetchTrips();
```

### Backend (Google Apps Script)
- **doPost()** handles create, update, delete actions
- **Endpoints**:
  - `action=create` + `data={...}` → Creates new row
  - `action=update` + `idColumn` + `idValue` + `updates={...}` → Updates row
  - `action=delete` + `idColumn` + `idValue` → Deletes row

---

## 📊 Data Flow

### Create Flow
```
User clicks "New Trip" 
  → Opens form modal
  → User fills data + clicks "Create"
  → UI shows loading
  → API call to Google Sheets
  → Success: shows notification + refreshes data
  → Error: shows error + reverts optimistic update
```

### Update Flow
```
User clicks Edit button on a trip
  → Form opens with pre-filled data
  → User modifies + clicks "Update"
  → Optimistic update in UI
  → API call to Google Sheets
  → Success: notification + refresh
  → Error: revert + error notification
```

### Delete Flow
```
User clicks Delete button
  → Confirmation dialog appears
  → User confirms deletion
  → Trip removed from UI (optimistic)
  → API call to delete from Google Sheets
  → Success: "Deleted successfully"
  → Error: restore trip + show error
```

---

## 🔒 Data Validation

### Required Fields
- Vehicle Number
- Source Address
- Destination Address
- Transporter Name

### Date Validations
- Trip Completion Date cannot be before Trip Creation Date
- Actual Pickup Date cannot be before Pickup Raised On date
- Trip Completion Date required when status is "Trip Completed"

### Form Errors
- Red error messages appear below invalid fields
- Form cannot be submitted until all validations pass

---

## 🚀 How to Use

### Creating Your First Trip
1. Click **"New Trip"** in the top navigation
2. Fill in at minimum:
   - Vehicle Number (e.g., "MH-12-AB-1234")
   - Source Address (e.g., "Bangalore, KA")
   - Destination Address (e.g., "Mumbai, MH")
   - Transporter Name (e.g., "XYZ Logistics")
3. Optionally add dates, status, remarks
4. Click **"Create"**
5. Watch for success notification

### Editing an Existing Trip
1. Use search/filters to find the trip
2. Click the ✏️ **Edit** icon
3. Update any fields
4. Click **"Update"**
5. Changes are saved to Google Sheets

### Deleting a Trip
1. Find the trip in the table
2. Click the 🗑️ **Delete** icon
3. Read the confirmation carefully
4. Click **"Delete"** to confirm
5. Trip is permanently removed

---

## 🛡️ Error Handling

### Network Errors
- If internet is down, shows: "Network request failed"
- Operations automatically retry when connection restored

### API Errors
- If Google Sheets API fails, shows: "Create/Update/Delete failed"
- UI automatically reverts to previous state
- User can retry the operation

### Validation Errors
- Form shows inline error messages
- Submit button remains enabled
- User can fix errors and resubmit

---

## 💡 Tips & Best Practices

1. **Before Deleting**: Always double-check the Trip ID in the confirmation dialog
2. **Batch Operations**: Edit multiple trips one by one (bulk operations not yet supported)
3. **Search First**: Use the search bar to find trips quickly before editing
4. **Filter by Status**: Filter trips by status for easier management
5. **Check Notifications**: Pay attention to success/error notifications in the bottom-right
6. **Wait for Loading**: Don't close the form while "Creating..." or "Updating..." is shown

---

## 🐛 Troubleshooting

### "Create failed" Error
- **Check**: Google Apps Script deployment URL in `.env`
- **Verify**: Internet connection is stable
- **Try**: Wait a few seconds and try again

### Changes Not Showing
- **Wait**: Data auto-refreshes every 30 seconds
- **Manual Refresh**: Reload the page (Ctrl+R / Cmd+R)
- **Check**: Google Sheets to verify data was saved

### Delete Not Working
- **Verify**: You confirmed the deletion in the dialog
- **Check**: Trip actually exists in Google Sheets
- **Look**: For error notifications in the bottom-right

---

## 📝 Summary

Your dashboard now provides a **complete and user-friendly interface** for managing trip data:

✅ **Create** new trips with a guided form  
✅ **Read/View** trip details in a modal  
✅ **Update/Edit** existing trips easily  
✅ **Delete** trips with safety confirmation  
✅ **Real-time feedback** with loading states  
✅ **Error handling** with automatic rollback  
✅ **Automatic syncing** with Google Sheets  

All operations are **safe, reversible (except delete)**, and provide clear feedback at every step!

---

## 🔗 Related Files

- `src/pages/Index.tsx` - Main CRUD logic
- `src/components/dashboard/TripTable.tsx` - Action buttons
- `src/components/dashboard/TripFormModal.tsx` - Create/Edit form
- `src/lib/sheetsApi.ts` - API functions
- `supabase/functions/DashboardData.gs` - Backend handlers

---

**Need help?** Check the console logs (F12) for detailed error messages during operations.
