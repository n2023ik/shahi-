# Shahi Dashboard - Authentication Setup Guide

## Overview

This is a **secure authentication architecture** using:
- **Frontend**: React + Google Sign-In SDK
- **Backend**: Google Apps Script (verifies tokens + checks whitelist)
- **Whitelist**: Google Sheet (AllowedUsers tab)

The security works because **the backend makes the final decision**, not JavaScript.

---

## Step 1: Google Cloud Setup (Get Client ID)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google+ API**:
   - APIs & Services > Library
   - Search "Google+ API" → Click → Enable
4. Create OAuth 2.0 Credential:
   - APIs & Services > Credentials
   - Click "Create Credentials" → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Add Authorized JavaScript origins:
     - `http://localhost:5173` (development)
     - `https://yourdomain.com` (production)
   - Add Authorized redirect URIs:
     - `http://localhost:5173` (development)
     - `https://yourdomain.com` (production)
5. Copy the **Client ID** and save it

---

## Step 2: Prepare Google Sheet

1. Open your Shipment Google Sheet
2. Create a new tab named: **AllowedUsers**
3. In Column A, add authorized emails (one per row):
   ```
   nikhil.pandey@mandan.com
   harshit@mandan.com
   123.34ab@mandan.com
   ```
4. Save the sheet

---

## Step 3: Deploy Apps Script

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project (or open existing linked to your Google Sheet)
3. Delete any existing code
4. Create a new file: Right-click > New File > Script
5. Name it: **Auth**
6. Copy the code from `supabase/functions/Auth.gs` into this file
7. **Deploy as Web App**:
   - Click "Deploy" (top right)
   - Select "New deployment"
   - Type: Web app
   - Execute as: **Me** (your email)
   - Who has access: **Anyone**
   - Click "Deploy"
8. Copy the deployment URL that appears:
   ```
   https://script.google.com/macros/s/AKfycb.../usercoderun
   ```

---

## Step 4: Configure Environment Variables

1. Create a `.env` file in the project root (copy from `.env.example`)
2. Add:
   ```env
   VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_FROM_GOOGLE_CLOUD
   VITE_APPS_SCRIPT_AUTH_URL=YOUR_DEPLOYMENT_URL_FROM_APPS_SCRIPT
   ```
3. Save and restart your development server

---

## Step 5: Test the Flow

1. Start your app: `npm run dev` (or `bun run dev`)
2. You should see a login page with "Sign in with Google" button
3. Click the button and sign in with one of the whitelisted emails
4. If successful → Dashboard loads
5. If not whitelisted → "Access denied" error

---

## How Security Works

```
User Signs In
     ↓
[React] Receives Google ID Token
     ↓
[React] Sends token to Apps Script
     ↓
[Apps Script] Verifies token with Google ← CRITICAL
     ↓
[Apps Script] Checks email in whitelist ← CRITICAL
     ↓
YES? → Return "AUTHORIZED"
NO?  → Return "UNAUTHORIZED"
     ↓
[React] Receives response
     ↓
If AUTHORIZED → Show Dashboard
If UNAUTHORIZED → Show "Access Denied"
```

**The key**: React cannot lie about authentication. Even if someone opens DevTools and tries to fake authorization, Apps Script won't return the token.

---

## Managing Users (Without Code Changes)

To add/remove users:
1. Open the Google Sheet
2. Go to the "AllowedUsers" tab
3. Add or delete emails in Column A
4. No code deployment needed!

---

## Important Security Notes

⚠️ **DO NOT:**
- Store tokens in localStorage (use sessionStorage - cleared on browser close)
- Check email validity only in React
- Hardcode emails in your React code

✅ **DO:**
- Always verify tokens in Apps Script
- Always check whitelist in Apps Script
- Keep the AllowedUsers sheet updated
- Test with someone's actual email before deploying

---

## Troubleshooting

### "Google is not defined"
- Check that `<script src="https://accounts.google.com/gsi/client">` is in `index.html`
- Wait a moment for the script to load

### "Backend URL not configured"
- Set `VITE_APPS_SCRIPT_AUTH_URL` in `.env`
- Restart dev server

### "Access denied" for authorized email
- Check email is exactly as written in AllowedUsers sheet
- Check email is verified in Google account
- Wait a moment (sometimes Apps Script takes time to update)

### Token verification fails
- Verify Apps Script deployment URL is correct
- Check Apps Script logs for errors
- Ensure Apps Script has access to the Google Sheet

---

## Next Steps

Once this is working:

1. **Add Logout**: Create a logout button that clears `sessionStorage`
2. **Role-Based Access**: Add a "Role" column to AllowedUsers sheet (admin/viewer) and return it from Apps Script
3. **Session Persistence**: Store user info (not token) after successful login
4. **Error Handling**: Show toast notifications for login errors

---

## Files Modified/Created

- `index.html` - Added Google Sign-In script
- `src/App.tsx` - Added authentication state and routing
- `src/components/Login.tsx` - Login UI component (NEW)
- `src/lib/auth.ts` - Authentication utilities (NEW)
- `supabase/functions/Auth.gs` - Apps Script backend (NEW)
- `.env.example` - Environment variable template (NEW)
- This file: `AUTHENTICATION_SETUP.md` (NEW)

---

## Questions?

Review the code comments. The flow is:
1. User → Login component (React)
2. Google Sign-In SDK → Returns JWT token
3. React → Sends token to Apps Script
4. Apps Script → Verifies + checks whitelist
5. Apps Script → Returns YES or NO
6. React → Shows dashboard or error

Everything is **documented inline** in the code.
