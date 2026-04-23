# 🔧 Google Sheets Update Fix - हिंदी गाइड

## समस्या
जब आप UI से डेटा edit, update, या delete करते हैं तो Google Sheets में changes save नहीं हो रहे हैं।

---

## ✅ Solution - क्या करना है

### Step 1: Google Apps Script को Update करें

1. **Google Apps Script खोलें**
   - यहाँ जाएं: https://script.google.com
   - अपनी project खोलें: "DashboardData"

2. **नया Code Copy करें**
   - File खोलें: `supabase/functions/DashboardData.gs`
   - सारा code select करें (Ctrl+A)
   - Copy करें (Ctrl+C)

3. **Apps Script में Paste करें**
   - Apps Script editor में सारा पुराना code delete करें
   - नया code paste करें (Ctrl+V)
   - **Save** करें (💾 icon)

4. **नया Deployment बनाएं**
   - **Deploy** → **New deployment** पर click करें
   - Description लिखें: "Fixed data update issue"
   - **Deploy** पर click करें

5. **नया URL Copy करें**
   - Deployment के बाद **Web app URL** copy करें
   - Example: `https://script.google.com/macros/s/AKfyc.../exec`

6. **अपनी .env File Update करें**
   - File खोलें: `.env`
   - इस line को बदलें:
     ```
     VITE_GOOGLE_SHEETS_API_URL=यहाँ_नया_URL_paste_करें
     ```
   - File save करें

### Step 2: Dev Server Restart करें

Terminal में:
```powershell
# Server बंद करें (Ctrl+C)
# फिर restart करें:
npm run dev
```

---

## 🧪 Test करें

### Manual Testing:

1. **Create Test:**
   - "New Trip" button click करें
   - सभी जरूरी fields भरें
   - "Create" click करें
   - ✅ Google Sheets में check करें - नया trip दिखना चाहिए

2. **Update Test:**
   - किसी trip पर ✏️ Edit icon click करें
   - कुछ fields change करें
   - "Update" click करें
   - ✅ Google Sheets में changes दिखने चाहिए

3. **Delete Test:**
   - किसी test trip पर 🗑️ Delete icon click करें
   - Confirm करें
   - ✅ Google Sheets से trip delete हो जाना चाहिए

---

## 🔍 Problems Check करने के लिए

### Browser Console देखें (F12 दबाएं):

**अच्छा है अगर दिखे:**
```
✅ [createTrip] Success: {success: true}
✅ [updateTrip] Success: {success: true}
✅ Trip created successfully
```

**खराब है अगर दिखे:**
```
❌ Create trip failed: Error...
❌ Server returned error: ...
```

### Apps Script Logs देखें:

1. https://script.google.com खोलें
2. अपनी project खोलें
3. **Executions** (left side) पर click करें
4. Recent executions देखें
5. Errors check करें

---

## 📋 Common Problems और Solutions

### Problem 1: "Network request failed"
- **कारण:** API URL गलत है
- **Fix:** `.env` file में सही URL डालें

### Problem 2: "Invalid request body"
- **कारण:** Apps Script update नहीं किया
- **Fix:** Apps Script code update करके redeploy करें

### Problem 3: Changes नहीं दिख रहे
- **कारण:** Sheet का नाम गलत है
- **Fix:** Sheet name check करें: `Shahi Reverse Pickup/Trip Details`

---

## ✅ सफल होने की निशानियां

आपको पता चलेगा कि काम कर रहा है जब:

1. ✅ Browser console में success दिखे
2. ✅ "Trip created successfully" notification आए
3. ✅ Google Sheets में तुरंत changes दिखें
4. ✅ कोई error न आए

---

## 🆘 अभी भी काम नहीं कर रहा?

### Check करें:

1. [ ] Apps Script का नया code paste किया?
2. [ ] नया deployment बनाया?
3. [ ] .env में नया URL डाला?
4. [ ] Dev server restart किया?
5. [ ] Sheet का नाम सही है?
6. [ ] Browser console में error दिख रहा है?

### Debug करने के लिए:

1. Browser console खोलें (F12)
2. Create/Update/Delete try करें
3. Console में सभी logs देखें
4. Apps Script Executions page भी check करें

---

## 💡 जरूरी बातें

- हर बदलाव के बाद **dev server restart** जरूर करें
- Browser में **hard refresh** करें (Ctrl+Shift+R)
- **दोनों console** देखें (Browser + Apps Script)
- Sheet name **exactly** same होना चाहिए (case sensitive)

---

**अगर फिर भी problem है तो:**

Browser console (F12) और Apps Script execution logs दोनों की screenshot लें और error messages check करें। यह बताएगा कि exactly कहाँ problem है।

---

## 📞 Quick Help Commands

```powershell
# Server restart करें
npm run dev

# .env file खोलें
notepad .env
```

**Good luck! 🚀**
