# Shahi - Shipment Management Dashboard

A modern, real-time logistics and shipment management dashboard built with React, TypeScript, and Google Sheets.

## ✨ Features

- **Trip Management** - Create, read, update, and delete shipment trips
- **Real-time Dashboard** - Monitor shipment status and logistics operations
- **Advanced Analytics** - Visual insights with charts and KPI metrics
- **Google Sheets Integration** - Direct sync with Google Sheets via Apps Script
- **Centralized Configuration** - All credentials and settings in environment variables
- **Pickup Delay Tracking** - Automatic alerts for delays over 3 days (red threshold)
- **Responsive Design** - Mobile, tablet, and desktop optimized
- **Dark Theme** - Modern glassmorphic UI design

## 🔧 Tech Stack

- React 18 + TypeScript
- Vite (Build Tool)
- Tailwind CSS + shadcn/ui
- Google Apps Script (Backend API)
- React Query (State Management)
- Recharts (Analytics)

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [CENTRALIZED_CONFIG_GUIDE.md](CENTRALIZED_CONFIG_GUIDE.md)):
```env
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_APPS_SCRIPT_AUTH_URL=your_auth_url
VITE_GOOGLE_SHEETS_API_URL=your_data_url
```

### 3. Start Development
```bash
npm run dev
```

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| **[CENTRALIZED_CONFIG_GUIDE.md](CENTRALIZED_CONFIG_GUIDE.md)** | 🔐 Complete configuration system (START HERE) |
| **[GOOGLE_SHEETS_CONFIG_SETUP.md](GOOGLE_SHEETS_CONFIG_SETUP.md)** | Setting up Google Sheets integration |
| **[AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md)** | Google OAuth configuration |
| **[COMPREHENSIVE_DASHBOARD_GUIDE.md](COMPREHENSIVE_DASHBOARD_GUIDE.md)** | Dashboard features and usage |

## 🎯 Key Features

### ✅ Centralized Configuration
All configuration is loaded from `.env` - **no hardcoded credentials in code**:
- Google Client IDs and API URLs
- Sheet names and IDs  
- API timeouts and settings
- Debug mode toggles

**Benefits:**
- Single source of truth
- Type-safe configuration
- Automatic validation
- Easy to maintain

See [CENTRALIZED_CONFIG_GUIDE.md](CENTRALIZED_CONFIG_GUIDE.md) for complete details.

### 🚨 Pickup Delay Tracking
Automatic calculation: `Actual Pickup Date - Pickup Raised Date`
- **Red alerts**: Delays > 3 days
- **Amber warnings**: Delays 0-3 days
- Real-time monitoring

### 📊 Real-time Data Sync
Direct Google Sheets integration via Apps Script:
- Dashboard metrics by location
- Trip/shipment details
- User authentication
- All sheets centrally configured
```
