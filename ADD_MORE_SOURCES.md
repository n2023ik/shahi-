# 🔧 Add More Sources to Dashboard

## Current Status
✅ Code working perfectly  
✅ Detecting: Faridabad F1, Krishnagiri - Unit 27  
❌ Missing: Faridabad F2, Noida - A7, Bangalore units, etc.

---

## Solution 1: Check if Multiple Sheets Exist

1. अपनी Google Sheets file खोलें
2. नीचे tabs देखें - क्या multiple sheets हैं?
3. अगर है तो:
   - सही sheet का naam "Shahi Dashboard" होना चाहिए
   - या DashboardData.gs में SHEETS.DASHBOARD को update करें

---

## Solution 2: Sources Horizontally हैं (Columns में)?

अगर आपका data इस format में है:

```
           | Faridabad F1 | Faridabad F2 | Noida-A7 | ...
-----------|--------------|--------------|----------|----
device in use    | 2      | 0            | 0        | ...
device avilable  | 8      | 0            | 0        | ...
```

तो मुझे code change करना होगा (horizontal parsing के लिए)। Screenshot भेजें मुझे!

---

## Solution 3: Manually Add Sources to Sheet

अगर sources exist नहीं करते, तो add करें:

### Format (Copy this to your sheet):

```
[Leave 4-5 blank rows after previous source]

Faridabad F2                        Count
Total Shipment Count                0
In-Transit Trips                    0
Completed Trips                     0
Total Pickup Raised (Internal)      0
Total Pickup Completed              0
Confirmation Pending                0
device in use                       0
device avilable                     10
RTO Shipments                       
Delivered at Shahi Factory          0
Total Quantity                      10
Lost                                0
Non-repairable Devices              0
Offline Devices                     0

[Leave 4-5 blank rows]

Noida - A7                          Count
Total Shipment Count                0
In-Transit Trips                    0
Completed Trips                     0
Total Pickup Raised (Internal)      0
Total Pickup Completed              0
Confirmation Pending                0
device in use                       0
device avilable                     15
RTO Shipments                       
Delivered at Shahi Factory          0
Total Quantity                      15
Lost                                0
Non-repairable Devices              0
Offline Devices                     0

[Leave 4-5 blank rows]

Bangalore UNIT -46                  Count
Total Shipment Count                0
In-Transit Trips                    0
Completed Trips                     0
Total Pickup Raised (Internal)      0
Total Pickup Completed              0
Confirmation Pending                0
device in use                       0
device avilable                     20
RTO Shipments                       
Delivered at Shahi Factory          0
Total Quantity                      20
Lost                                0
Non-repairable Devices              0
Offline Devices                     0
```

### Important Notes:
1. **Source name** must be in **Column A** (first column)
2. **device in use** - exactly this spelling (lowercase)
3. **device avilable** - with typo (not "available")
4. Values in **Column B** (Count column)
5. Leave **4-5 blank rows** between each source

---

## Next Steps

**मुझे बताएं कौन सा case है:**

1. ✉️ **Multiple sheets हैं?** → Sheet name बताएं
2. 📊 **Horizontal format है?** → Screenshot भेजें (columns दिखाएं)
3. ✍️ **Manual add करने हैं?** → ऊपर दिया format use करें

Dashboard automatically refresh हो जाएगा जब sheet में data add होगा! 🚀
