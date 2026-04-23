# ⚡ Frontend Integration Guide - Audit Log API

## Quick Reference - How to Display Audit Logs in Your UI

---

## 1️⃣ **Fetch Audit Log for a Specific Record**

### Code Example (JavaScript/React):

```javascript
// किसी entry के audit history fetch करो
async function fetchRecordAuditTrail(tripId, sheetName) {
  const apiUrl = "YOUR_APPS_SCRIPT_URL";
  
  try {
    const response = await fetch(
      `${apiUrl}?action=getRecordAuditTrail&recordId=${tripId}&sheetName=${encodeURIComponent(sheetName)}`
    );
    const data = await response.json();
    
    console.log("Audit Trail:", data.auditTrail);
    return data.auditTrail;
  } catch (error) {
    console.error("Error fetching audit trail:", error);
  }
}

// Usage:
const trail = await fetchRecordAuditTrail("TRIP-001", "Shahi Reverse Pickup/Trip Details");
console.log(trail); // मिलेगा formatted audit history
```

---

## 2️⃣ **Filter Audit Logs by Multiple Criteria**

```javascript
// किसी specific user के सभी changes
async function getUserAuditLogs(userEmail) {
  const apiUrl = "YOUR_APPS_SCRIPT_URL";
  
  const response = await fetch(
    `${apiUrl}?action=getAuditLog&userEmail=${encodeURIComponent(userEmail)}`
  );
  const data = await response.json();
  return data.auditLogs;
}

// किसी specific action (CREATE/UPDATE) के सभी logs
async function getActionAuditLogs(action) {
  const apiUrl = "YOUR_APPS_SCRIPT_URL";
  
  const response = await fetch(
    `${apiUrl}?action=getAuditLog&action=${encodeURIComponent(action)}`
  );
  const data = await response.json();
  return data.auditLogs;
}

// सभी parameters के साथ filter करो
async function getFilteredAuditLogs(filters) {
  const apiUrl = "YOUR_APPS_SCRIPT_URL";
  const params = new URLSearchParams(filters).toString();
  
  const response = await fetch(`${apiUrl}?action=getAuditLog&${params}`);
  const data = await response.json();
  return data.auditLogs;
}

// Usage example:
const trilogs = await getFilteredAuditLogs({
  recordId: "TRIP-001",
  action: "UPDATE",
  sheetName: "Shahi Reverse Pickup/Trip Details"
});
```

---

## 3️⃣ **Display Audit Trail in React Component**

```jsx
import React, { useState, useEffect } from 'react';

function AuditTrailViewer({ tripId, sheetName }) {
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAuditTrail();
  }, [tripId, sheetName]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_APPS_SCRIPT_URL;
      
      const response = await fetch(
        `${apiUrl}?action=getRecordAuditTrail&recordId=${tripId}&sheetName=${encodeURIComponent(sheetName)}`
      );
      
      if (!response.ok) throw new Error("Failed to fetch audit trail");
      
      const data = await response.json();
      setAuditTrail(data.auditTrail || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading audit history...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (auditTrail.length === 0) return <div>No changes yet</div>;

  return (
    <div className="audit-trail">
      <h3>📋 Change History for {tripId}</h3>
      
      <div className="timeline">
        {auditTrail.map((entry, idx) => (
          <div key={idx} className="timeline-entry">
            <div className="timestamp">🕐 {entry.Timestamp}</div>
            <div className="user">👤 {entry.User}</div>
            <div className={`action action-${entry.Action.toLowerCase()}`}>
              {entry.Action}
            </div>
            
            {entry.Action === 'UPDATE' && entry['What Changed'] && (
              <div className="changes">
                <h5>What Changed:</h5>
                <pre>{entry['What Changed']}</pre>
                <p>Fields Modified: {entry['Fields Modified']}</p>
              </div>
            )}
            
            {entry.Action === 'CREATE' && entry['Fields Created'] && (
              <div className="changes">
                <h5>Fields Created:</h5>
                <pre>{entry['Fields Created']}</pre>
                <p>Total: {entry['Total Fields']} fields</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuditTrailViewer;
```

---

## 4️⃣ **CSS Styling for Audit Trail**

```css
.audit-trail {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
}

.timeline {
  position: relative;
  padding-left: 20px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #4CAF50, #2196F3);
}

.timeline-entry {
  margin-bottom: 20px;
  padding-left: 20px;
  position: relative;
}

.timeline-entry::before {
  content: '';
  position: absolute;
  left: -9px;
  top: 5px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4CAF50;
  border: 2px solid white;
}

.timestamp {
  color: #666;
  font-size: 12px;
  font-weight: bold;
}

.user {
  color: #2196F3;
  font-size: 13px;
  margin: 5px 0;
}

.action {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  margin: 8px 0;
}

.action-create {
  background: #4CAF50;
  color: white;
}

.action-update {
  background: #2196F3;
  color: white;
}

.action-delete {
  background: #f44336;
  color: white;
}

.changes {
  background: white;
  padding: 12px;
  border-left: 3px solid #2196F3;
  margin-top: 10px;
  border-radius: 4px;
}

.changes h5 {
  margin: 0 0 8px 0;
  color: #333;
}

.changes pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  margin: 8px 0;
  color: #333;
}

.changes p {
  margin: 8px 0 0 0;
  color: #666;
  font-size: 12px;
}

.error {
  color: #f44336;
  padding: 10px;
  background: #ffebee;
  border-radius: 4px;
}
```

---

## 5️⃣ **Display in a Modal/Popup**

```jsx
import React, { useState } from 'react';
import AuditTrailViewer from './AuditTrailViewer';

function TripDetailsWithAudit({ tripId }) {
  const [showAudit, setShowAudit] = useState(false);

  return (
    <div>
      <div className="trip-details">
        {/* Trip details here */}
        
        <button 
          className="btn-view-audit"
          onClick={() => setShowAudit(!showAudit)}
        >
          {showAudit ? '❌ Hide' : '📋 View'} Change History
        </button>
      </div>

      {showAudit && (
        <div className="modal">
          <div className="modal-content">
            <AuditTrailViewer 
              tripId={tripId} 
              sheetName="Shahi Reverse Pickup/Trip Details"
            />
            <button onClick={() => setShowAudit(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TripDetailsWithAudit;
```

---

## 6️⃣ **Real-Time Audit Log Card Component**

```jsx
function AuditLogCard({ log }) {
  const getActionColor = (action) => {
    switch(action) {
      case 'CREATE': return '#4CAF50';
      case 'UPDATE': return '#2196F3';
      case 'DELETE': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className="audit-card" style={{ borderLeft: `4px solid ${getActionColor(log.Action)}` }}>
      <div className="card-header">
        <span className="action-badge">{log.Action}</span>
        <span className="timestamp">{log.Timestamp}</span>
      </div>
      
      <div className="card-body">
        <p><strong>User:</strong> {log.User}</p>
        <p><strong>Record:</strong> {log['Record ID']}</p>
        
        {log['What Changed'] && (
          <>
            <p><strong>Changes:</strong></p>
            <code>{log['What Changed'].substring(0, 100)}...</code>
          </>
        )}
        
        {log['Fields Created'] && (
          <>
            <p><strong>Created Fields:</strong></p>
            <code>{log['Fields Created'].substring(0, 100)}...</code>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 7️⃣ **Export Audit Data to CSV**

```javascript
function exportAuditLogsToCSV(auditTrail, fileName = 'audit_trail.csv') {
  const headers = ['Timestamp', 'User', 'Action', 'Record ID', 'Details'];
  
  let csvContent = headers.join(',') + '\n';
  
  auditTrail.forEach(log => {
    const row = [
      log.Timestamp,
      log.User,
      log.Action,
      log['Record ID'],
      `"${(log['What Changed'] || log['Fields Created'] || '').substring(0, 50)}"` // Quote to handle commas
    ];
    csvContent += row.join(',') + '\n';
  });

  // Download करो
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
  element.setAttribute('download', fileName);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Usage:
const trail = await fetchRecordAuditTrail("TRIP-001", "Shahi Reverse Pickup/Trip Details");
exportAuditLogsToCSV(trail, 'TRIP-001_audit_history.csv');
```

---

## 📊 Expected Response Format

### getRecordAuditTrail Response:
```json
{
  "auditTrail": [
    {
      "#": 1,
      "Timestamp": "06/03/2026 10:30:45",
      "User": "user@shahi.com",
      "Action": "CREATE",
      "Sheet": "Shahi Reverse Pickup/Trip Details",
      "Record ID": "TRIP-001",
      "Fields Created": "Trip Id: TRIP-001 | Status: Pending",
      "Total Fields": 2
    },
    {
      "#": 2,
      "Timestamp": "06/03/2026 11:45:30",
      "User": "user@shahi.com",
      "Action": "UPDATE",
      "Sheet": "Shahi Reverse Pickup/Trip Details",
      "Record ID": "TRIP-001",
      "What Changed": "Status: \"Pending\" → \"In Transit\"",
      "Fields Modified": 1
    }
  ]
}
```

---

## 🔑 Query Parameters Reference

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `action` | string | Must be `getAuditLog` or `getRecordAuditTrail` | `getRecordAuditTrail` |
| `recordId` | string | ID of the record | `TRIP-001` |
| `sheetName` | string | Sheet name (URL encoded) | `Shahi%20Reverse%20Pickup%2FTrip%20Details` |
| `userEmail` (optional) | string | Filter by user | `user@shahi.com` |
| `action` (optional) | string | Filter by action type | `UPDATE` |

---

## ✨ Features Available

✅ View complete change history  
✅ See who made changes and when  
✅ Track field-by-field changes  
✅ Filter by user, action, or record  
✅ Export to CSV  
✅ Display in timeline/card format  
✅ Modal popup view  

**Happy integrating!** 🚀
