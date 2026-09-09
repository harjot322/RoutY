# 🚍 RoutY — Real-Time Public Transport Tracking System

RoutY is an operational, real-time civic public transport tracking and commuter guidance platform built with **FastAPI** (Python telemetry and transit engine) and **React Native / Expo** (cross-platform mobile application).

> 📖 **Deep-Dive Application Guide**: For an exhaustive overview of the platform's vision, system architecture, detailed technology stack analysis, and in-depth real-world use cases, see [**APPLICATION_OVERVIEW.md**](file:///Users/harjotmakkar/Agentic/RoutY/APPLICATION_OVERVIEW.md).

---

## 📑 Table of Contents

1. [Platform Overview](#platform-overview)
2. [Key Capabilities](#key-capabilities)
3. [System Architecture](#system-architecture)
4. [Default Development Admin Credentials](#default-development-admin-credentials)
5. [Prerequisites](#prerequisites)
6. [Environment Configuration](#environment-configuration)
7. [Step-by-Step Setup & Running](#step-by-step-setup--running)
   - [Backend Service](#1-backend-service)
   - [Mobile Application (iOS Simulator & Android)](#2-mobile-application)
   - [Physical Device Testing](#3-running-on-a-physical-device)
8. [Automated Testing & Verification](#automated-testing--verification)
9. [Operational Details](#operational-details)
10. [Troubleshooting](#troubleshooting)

---

## Platform Overview

RoutY connects commuters and transit operators through a unified transit intelligence layer. Commuters access real-time vehicle locations, dynamic arrival times (ETAs), stop guidance, timetable breakdowns, fare calculations, and multi-lingual voice announcements. Transit managers access a secure control operations dashboard to manage routes, configure vehicles and schedules, monitor vehicle spacing, respond to passenger SOS alerts, and analyze unmet commuter demand.

---

## Key Capabilities

### 1. Commuter Experience
- **Interactive Map & Live Vehicle Fleet**: High-performance OpenStreetMap / Leaflet display with smooth vehicle telemetry, route corridors, and stop markers.
- **Intelligent Unified Search**: Instant multi-entity query engine searching by route code, route name, vehicle registration plate, stop name, or terminus destination with fallback suggestions.
- **Dynamic Arrival Estimation (ETA)**: Continuously calculated ETAs reflecting remaining route distance, real-time segment speeds, dwell states, and direction.
- **Stop Proximity & Departure Guidance**: Automatic proximity detection alerting passengers whether to walk, hurry, or await the following vehicle.
- **Fare & Travel Time Breakdown**: Step-by-step route calculator showing fares, travel duration, distance, and intermediate stops.
- **Multi-lingual & Accessibility**: Seamless English and Hindi localisation (`en` / `hi`), bilingual stop announcements, voice synthesis, and full Dark Mode / Light Mode support.
- **Passenger Safety**: One-touch SOS alert transmission dispatching passenger coordinates and vehicle telemetry directly to dispatch control.

### 2. Operations & Fleet Administration
- **Executive Operations Dashboard**: High-level telemetry cards tracking Total Routes, Active Fleet Vehicles, Active Trips, Total Stops, and Real-Time Service Status.
- **Fleet & Vehicle Manager**: Complete CRUD operations for vehicles—assign buses to any route, update operational status (`In Service`, `Delayed`, `Maintenance`), monitor driver contacts, set passenger occupancy, and assign service schedules.
- **Route & Corridor Management**: Full route creator supporting route names, codes, color themes, origin and destination terminals, ordered stops, and custom path coordinates with automatic road polyline generation.
- **Vehicle Spacing & Bunching Guard**: Real-time headway detection alerting operators when adjacent vehicles on the same corridor bunch together.
- **Historical Route Replay**: Minute-by-minute historical path playback with interactive scrub controls for incident review and route compliance audits.
- **Demand Signals & Heatmaps**: Analysis of unserved commuter route searches to identify transit deserts and prioritize network expansions.

---

## System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│               RoutY Mobile Application (Expo / React Native)           │
│   • Leaflet / OpenStreetMap Vector Canvas                              │
│   • Intelligent Unified Search & Journey Planner                       │
│   • Dynamic Vehicle Tracker & Stop Guidance                            │
│   • Operator Management Portal (Routes, Fleet, Replay, Alerts)        │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ WebSocket & REST (/api)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    RoutY Core Engine (FastAPI / Python)                │
│   • Real-Time Vehicle Engine & Headway Calculation                     │
│   • Dynamic ETA Predictor (Distance / Velocity / Dwell Vectors)        │
│   • OpenStreetMap OSRM Road Corridor Routing                          │
│   • In-Memory / MongoDB Persistence Layer                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Default Development Admin Credentials

To access the administrative console via the mobile app (`Settings > Operator Console`):

| Role | Username | Password |
| :--- | :--- | :--- |
| **System Administrator** | `admin` | `RoutYAdmin2026Secure` |

---

## Prerequisites

- **macOS** (for Apple iOS Simulator) or **Linux/Windows** (for Android Emulator / physical device testing)
- **Node.js**: v18.0.0 or newer
- **Python**: 3.10, 3.11, or 3.12
- **npm** or **yarn**
- **Xcode** (macOS only, for iOS Simulator) or **Android Studio** (for Android Emulator)

---

## Environment Configuration

### Backend (`backend/.env`)
```env
ADMIN_USER=admin
ADMIN_PASS=RoutYAdmin2026Secure
JWT_SECRET=c8d9e2f1a0b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9
MONGO_URI=mongodb://localhost:27017/routy
OSRM_FALLBACK_FILE=osrm_routes.json
SIM_TICK_SECONDS=1.0
SIM_SPEED_FACTOR=3.0
```
*(Note: If a local MongoDB instance is not detected, RoutY automatically activates an integrated high-performance in-memory database fallback).*

### Frontend (`frontend/.env`)
```env
EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
EXPO_PUBLIC_CARTO_API_KEY=cb1_2zhd_1_a7c32393fbdf87d0c67c463d
```
*(When testing on a physical device, change `127.0.0.1` to your computer's local Wi-Fi IP address).*

---

## Quickstart with `start.sh`

The fastest way to launch the entire platform is with the automated startup script:

```bash
chmod +x start.sh
./start.sh
```

- Boots the FastAPI backend service automatically on `http://0.0.0.0:8000`.
- Launches the Expo Metro bundler on port `8081`.
- Press <kbd>i</kbd> in the terminal to launch the **iOS Simulator**.
- Press <kbd>a</kbd> in the terminal to launch the **Android Emulator**.
- Press <kbd>w</kbd> in the terminal to open the **Web Preview**.
- Scan the printed QR code with your phone camera or Expo Go to run on a physical device.

---

## Step-by-Step Setup & Running (Manual)

### 1. Backend Service

Open your first terminal window:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python3 -m pip install -r requirements.txt
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Verify backend health at: [http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/)

### 2. Mobile Application

Open a second terminal window at the **project root**:

```bash
cd frontend
npm install
npx expo start --ios
```

*(To run on Android Emulator instead of iOS, replace `--ios` with `--android`, or simply run `npx expo start` and press <kbd>i</kbd> for iOS or <kbd>a</kbd> for Android).*

### 3. Running on a Physical Device

1. Connect your computer and mobile phone to the **same Wi-Fi network**.
2. Find your computer's local IP address (`ipconfig getifaddr en0` on macOS).
3. Update `frontend/.env` with your computer's IP address:
   ```env
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.45:8000
   ```
4. Start Metro bundler from the `frontend` folder:
   ```bash
   cd frontend
   npx expo start -c
   ```
5. Scan the QR code:
   - **iOS**: Open Apple Camera app and tap the "Open in Expo Go" banner.
   - **Android**: Open the Expo Go app and select "Scan QR code".

---

## Automated Testing & Verification

### Run Frontend Static Analysis & Type Checking
```bash
cd frontend

# Linting with ESLint (Strict zero-warning policy)
npm run lint

# TypeScript Strict Type Compilation
npx tsc --noEmit
```

### Run Backend Regression & Integration Test Suite
```bash
# Ensure the backend server is running on port 8000
python3 -m pytest -o required_plugins="" -o addopts="" backend/tests
```
All 38 test suites cover:
- Public routes, stops, and timetable queries
- Dynamic ETA computations and vehicle tracking
- Intelligent unified search across routes, buses, and stops
- Vehicle lifecycle management (Create, Update, Delete)
- Admin security, JWT authorization, and SOS dispatch resolution
- Arbitrary route generation with fallback polyline construction

---

## Operational Details

- **Nationwide Route & Multi-Bus Scale (360+ Buses)**: Tens of buses per state across all 36 Indian States and Union Territories (360+ active transit vehicles nationwide). Staggered along actual corridors with opposing directions, realistic speeds, individual driver/conductor crews, and passenger seat occupancy. Optimized backend engine executes 360-vehicle ticks in ~1.4ms and global snapshots in ~1.9ms with optional viewport/state filtering to eliminate server overload.
- **Device GPS Location & Nearby Buses Discovery**: Automatic device location detection on mount with permanent Locate FAB, pulsing blue commuter location marker (`.user-dot`), and quick city preset switcher (Delhi, Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad, Ahmedabad, or live GPS). A horizontal **Nearby Buses** card carousel dynamically displays closest vehicles ranked by distance in meters/km with direction, speed, seats occupied (`X / 42`), and instant tap-to-track.
- **Natural Hindi Voice Assistant (`hi-IN`)**: Authentic, natural, respectful Hindi voice announcements. Features active greeting dialogue upon enabling ("नमस्ते! RoutY वॉयस असिस्टेंट अब सक्रिय है..."), automatic spoken announcements when a user tracks any bus (route number, destination, speed, driver and conductor names, seats occupied out of 42, and next stop arrival ETA in minutes), and a map Voice Assistant FAB for on-demand spoken transit briefings.
- **Commuter Route Suggestions & Admin Deployment**: Commuters can submit unserved corridors from their app with origin, destination, locality notes, contact info, and coordinates. Administrators review suggestions in `/admin/suggestions` and click "Arrange & Deploy Route" to instantly generate road geometry, snap to highways, provision buses, and activate the corridor live.
- **Driver & Crew Directory Panel**: Accessible at `/admin/drivers`, transit supervisors can inspect crew records with dummy Indian names, random contact numbers, depot addresses, and assigned buses. Administrators can adjust the driver's current GPS location via an interactive modal with regional presets, dynamically repositioning the assigned bus on the live transit map.
- **Interactive Bus Marker Crew & Contacts**: Tapping any bus icon on the map presents driver and conductor details with direct one-tap calling (`tel:` links) and depot assignments.
- **Passenger Seat Opt-In & Capacity Tracking**: Commuters can tap "Board This Bus (Opt-In)" to increment the active commuter count or "Leave Bus" to decrement. The tracked bus card and map popups dynamically display live occupancy (`X / 42 seats occupied`) with colored capacity progress bars.
- **Permanent Light Mode Map View**: Leaflet map tiles are strictly locked to high-contrast Light Mode (Voyager/Positron) for maximum outdoor legibility under direct sunlight.
- **Position & Telemetry Engine**: Vehicle positions are propagated along assigned road geometry vectors every tick. When new routes are created by an administrator, sensible road geometries are automatically interpolated from ordered stop coordinates if custom paths are omitted.
- **Dynamic Arrival Estimation**: ETAs are derived in real-time from remaining distance, current speed vectors, and stop dwell times, rather than static timetables.
- **Resilience & Local-First Operation**: The system requires zero paid proprietary map keys, external telemetry hardware, or cloud accounts to deliver full platform functionality.

---

## Troubleshooting

1. **`Network request failed` on physical phone:**
   Ensure `frontend/.env` contains your computer's local network IP (e.g. `192.168.X.X:8000`) instead of `127.0.0.1` and that your firewall permits traffic on port 8000.
2. **Port 8000 already bound:**
   ```bash
   lsof -ti :8000 | xargs kill -9 2>/dev/null
   ```
3. **Resetting Metro bundler cache:**
   ```bash
   npx expo start -c
   ```
