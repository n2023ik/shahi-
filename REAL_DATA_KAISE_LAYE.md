# Real Data Setup Guide / Asli Data Kaise Laye

## 🎯 Abhi Ki Situation

**Aap MOCK DATA dekh rahe hain** kyunki `VITE_GOOGLE_SHEETS_API_URL` configured nahi hai.

Line 14 `.env` me:
```
VITE_GOOGLE_SHEETS_API_URL=YOUR_DASHBOARD_DATA_DEPLOYMENT_URL_HERE
```

## 📋 Real Data Lane Ke Steps

### Step 1: Google Sheet Kholein
1. Apna Google Sheet open karein jisme data hai
2. **Extensions → Apps Script** pe click karein

### Step 2: Config.gs Add Karein
1. Apps Script editor me **+ → Script** click karein
2. Name: `Config.gs`
3. Copy karein: [`supabase/functions/Config.gs`](supabase/functions/Config.gs)
4. Save karein (Ctrl+S)

### Step 3: DashboardData.gs Add Karein  
1. **+ → Script** click karein
2. Name: `DashboardData.gs`
3. Copy karein: [`supabase/functions/DashboardData.gs`](supabase/functions/DashboardData.gs)
4. Save karein (Ctrl+S)

### Step 4: Deploy Karein (Important!)
1. **Deploy → New deployment** click karein
2. **Web app** select karein
3. Settings:
   - **Execute as:** Me (your email)
   - **Who has access:** Anyone
4. **Deploy** button dabaein
5. **DEPLOYMENT URL COPY KAREIN** ✅

### Step 5: .env Me URL Dalein
URL is tarah dikhayi dega:
```
https://script.google.com/macros/s/AKfycby...xyz.../exec
```

`.env` file me paste karein:
```env
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/AKfycby...xyz.../exec
```

### Step 6: Dev Server Restart Karein
```bash
# Pehle server band karein (Ctrl+C)
# Phir dobara start karein:
npm run dev
```

## ✅ Verify Karein

Browser console me dekhein (F12):
- ✅ Agar ye dikhe: `✅ Loaded X locations from Google Sheets` - SUCCESS!
- ❌ Agar ye dikhe: `⚠️ Using mock trip data` - URL galat hai

## 📊 Sheet Names Configuration

Ye saari settings ab `.env` me hain:

```env
# Sheet names - Agar aapke sheet names different hain toh yahan change karein
VITE_SHEET_DASHBOARD=Shahi Dashboard
VITE_SHEET_TRIP_DETAILS=Shahi Reverse PickupTrip Detail
VITE_SHEET_ALLOWED_USERS=AllowedUsers
```

### Important: Sheet Names Match Hone Chahiye!

1. Google Sheet me apni sheet ka exact name dekho
2. `.env` me same name likho
3. Examples:
   - ✅ `Shahi Dashboard` (correct)
   - ❌ `ShahiDashboard` (space missing)
   - ❌ `shahi dashboard` (case sensitive hai!)

## 🔐 Security

✅ **Code me kahi bhi hardcoded nahi hai:**
- ❌ No sheet IDs in code
- ❌ No API URLs in code  
- ❌ No credentials in code
- ✅ Sab kuch `.env` me hai

✅ **`.env` file Git me nahi jayegi** (`.gitignore` me hai)

## 🆘 Common Problems

| Problem | Solution |
|---------|----------|
| Mock data dikha raha hai | URL check karein `.env` me |
| "Sheet not found" error | Sheet names exactly match hone chahiye |
| CORS error | "Who has access" must be "Anyone" |
| "Not authorized" | "Execute as" should be "Me" |
| Changes nahi dikh rahe | Server restart karein |

## 🔍 Debug Mode

Agar problem ho toh debug mode enable karein:

`.env` me:
```env
VITE_DEBUG_MODE=true
```

Server restart karein aur browser console check karein.

## 📝 Summary

1. ✅ Apps Script deploy karein
2. ✅ URL `.env` me dalein
3. ✅ Sheet names `.env` me check karein
4. ✅ Server restart karein
5. ✅ Real data mil jayega!

---

**Koi problem ho toh browser console (F12) me errors check karein!**
