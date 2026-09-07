# 🚍 RoutY — Real-Time Public Transport Tracking System

RoutY is an intelligent, real-time public transit tracking and commuter guidance platform built with **FastAPI** (Python backend & simulation engine) and **React Native / Expo** (cross-platform mobile frontend).

---

## 📑 Table of Contents

1. [System Architecture](#system-architecture)
2. [Prerequisites](#prerequisites)
3. [Running on Apple's Default Simulation App (iOS Simulator)](#1-running-on-apples-default-simulation-app-ios-simulator)
4. [Running on a Physical Mobile Device (iOS & Android)](#2-running-on-a-physical-mobile-device-ios--android)
5. [Quickstart with `start.sh`](#3-quickstart-using-startsh)
6. [Useful Simulator & Developer Shortcuts](#useful-simulator--developer-shortcuts)
7. [Troubleshooting & Common Issues](#troubleshooting--common-issues)

---

## System Architecture

```text
┌────────────────────────────────────────────────────────┐
│               RoutY Mobile App (Expo / React Native)   │
│   • Map View (Leaflet / WebView)                       │
│   • Live Bus Tracking & ETA Predictions                │
│   • Commuter Distance & Stop Recommendations          │
└──────────────────────────▲─────────────────────────────┘
                           │ HTTP / REST (Port 8000)
┌──────────────────────────▼─────────────────────────────┐
│                 RoutY Backend (FastAPI)                │
│   • Real-Time Bus Fleet Simulator (sim.py)             │
│   • OSRM Route Navigation                             │
│   • In-Memory / MongoDB Data Storage                   │
└────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before running the application, make sure your development machine has the following installed:

- **macOS** (Required for Apple iOS Simulator)
- **Xcode** (Free from the Mac App Store)
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```
- **Node.js** (v18 or newer) & **npm** or **yarn**
- **Python 3.10+** & **pip**
- **Expo Go App** (Optional, installed on your physical iPhone/Android for device testing)

---

## 1. Running on Apple's Default Simulation App (iOS Simulator)

Apple's default simulation tool is **Simulator.app** (bundled with Xcode). Because the iOS Simulator shares your Mac's localhost network stack, configuration is seamless.

### Step 1: Install Dependencies

#### Backend:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Frontend:
```bash
cd ../frontend
npm install
# or: yarn install
```

### Step 2: Configure Frontend Environment

Open `frontend/.env` and ensure the backend URL points to localhost:
```env
EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
EXPO_PUBLIC_CARTO_API_KEY=cb1_2zhd_1_a7c32393fbdf87d0c67c463d
```

### Step 3: Start the Backend Server

In your first terminal window:
```bash
cd backend
source venv/bin/activate
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```
> Verify backend is alive: Open [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) in your browser.

### Step 4: Launch the App in iOS Simulator

In your second terminal window:
```bash
cd frontend
npx expo start --ios
```

#### What Happens:
1. Expo will automatically launch Apple's **Simulator.app**.
2. If this is the first run, Expo will install the Expo Go runtime on the virtual device.
3. The RoutY application will bundle and open inside the simulator.

*(Alternative: Run `npx expo start` and press <kbd>i</kbd> in your terminal once the QR code appears).*

---

## 2. Running on a Physical Mobile Device (iOS & Android)

When testing on a physical phone, **`localhost` (`127.0.0.1`) does not work**, because on your phone `localhost` points to the phone itself, not your Mac running the backend. Follow these steps to connect your device.

### Step 1: Connect to the Same Wi-Fi Network
Make sure your **Mac** and your **Mobile Phone** are connected to the **exact same Wi-Fi network**.

### Step 2: Find Your Mac's Local IP Address
In your Mac terminal, run:
```bash
ipconfig getifaddr en0
```
*(If on Ethernet or a different adapter, check **System Settings > Wi-Fi > Details > IP Address**).*  
Example output: `192.168.1.45`

### Step 3: Update `frontend/.env` with your Local IP
Edit `frontend/.env` to replace `127.0.0.1` with your computer's IP address:
```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.45:8000
EXPO_PUBLIC_CARTO_API_KEY=cb1_2zhd_1_a7c32393fbdf87d0c67c463d
```
> **Important**: Keep the `:8000` port!

### Step 4: Start the Backend
Ensure the backend binds to `0.0.0.0` (all interfaces) so external devices on your network can reach it:
```bash
cd backend
source venv/bin/activate
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000
```
> **Connectivity Check**: Open `http://192.168.1.45:8000/api/health` on your mobile phone's web browser. If you see `{"status":"healthy"}`, your phone can communicate with your Mac's backend.

### Step 5: Install the Expo Go App on Your Phone
- **iPhone**: Install [Expo Go from Apple App Store](https://apps.apple.com/app/expo-go/id982107779).
- **Android**: Install [Expo Go from Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent).

### Step 6: Start Metro & Scan QR Code
In your frontend directory:
```bash
cd frontend
npx expo start
```

- **On iOS (iPhone)**:
  1. Open the default iOS **Camera app**.
  2. Point the camera at the QR code displayed in your terminal.
  3. Tap the yellow prompt banner **"Open in Expo Go"**.
- **On Android**:
  1. Open the **Expo Go app**.
  2. Tap **Scan QR code** and scan the terminal QR code.

The app will download the JavaScript bundle and render RoutY on your phone.

---

## 3. Quickstart Using `start.sh`

The repository provides an automated startup script that boots both the backend and frontend simultaneously:

```bash
chmod +x start.sh
./start.sh
```

Once running:
- Press <kbd>i</kbd> in the terminal to launch the **iOS Simulator**.
- Press <kbd>a</kbd> in the terminal to launch the **Android Emulator**.
- Press <kbd>w</kbd> to open the **Web Preview**.
- Scan the printed QR code with your phone camera or Expo Go to run on a **Physical Device**.

---

## Useful Simulator & Developer Shortcuts

### In Apple Simulator:
- **Simulate GPS Location**:
  In the Simulator menu bar, go to:
  `Features` > `Location` > select **City Run**, **Freeway Drive**, or **Custom Location...**  
  *Tip: Set coordinates to the simulator's active city (e.g. Dublin / central routes) to test live commuter-to-stop distances.*
- **Open Developer Menu**: Press <kbd>Cmd</kbd> + <kbd>Ctrl</kbd> + <kbd>Z</kbd> inside the simulator.
- **Reload App**: Press <kbd>Cmd</kbd> + <kbd>R</kbd>.
- **Toggle Dark/Light Mode**: Press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>.

### In Metro Terminal:
- Press <kbd>r</kbd> — Reload the app.
- Press <kbd>m</kbd> — Toggle developer menu.
- Press <kbd>j</kbd> — Open debugger in Chrome.
- Press <kbd>c</kbd> — Clear console output.

---

## Troubleshooting & Common Issues

### 1. `Network request failed` on Physical Phone
- Cause: `frontend/.env` is set to `http://127.0.0.1:8000` or `http://localhost:8000`.
- Fix: Change it to your computer's local Wi-Fi IP (e.g., `http://192.168.x.x:8000`) and restart Expo with `npx expo start -c` (clear cache).
- Make sure your Mac's firewall allows incoming connections on port `8000`.

### 2. Apple Simulator Fails to Boot (`xcrun simctl` error)
- Ensure the active developer directory is set to Xcode:
  ```bash
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  ```
- Open Xcode once to accept the license agreement:
  ```bash
  sudo xcodebuild -license accept
  ```
- Make sure an iOS Simulator runtime is installed: Open Xcode > **Settings** > **Platforms** and ensure iOS 17/18 is installed.

### 3. Port Already in Use (Port 8000 or 8081)
If another instance is holding the port, terminate it:
```bash
# Free port 8000 (backend)
lsof -ti :8000 | xargs kill -9 2>/dev/null

# Free port 8081 (Metro bundler)
lsof -ti :8081 | xargs kill -9 2>/dev/null
```

### 4. Location Permission Issues
- When prompted on first launch, select **"Allow While Using App"**.
- In iOS Simulator: `Settings` app inside simulator > `Privacy & Security` > `Location Services` > `RoutY` > **While Using the App**.
