#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo "  🚍 RoutY: Real-Time Public Transport Tracking System"
echo "  Platform: Cross-Platform Mobile App (iOS / Android / Web)"
echo "=========================================================="

# Check Python and Node
command -v python3 >/dev/null 2>&1 || { echo "Error: Python 3 is required."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required."; exit 1; }

echo ""
echo "[1/2] Starting RoutY Backend Server (FastAPI + Simulation + In-Memory DB)..."
cd "$DIR/backend"
PYTHON_BIN="python3"
if [ -f "$DIR/backend/venv/bin/python3" ]; then
  PYTHON_BIN="$DIR/backend/venv/bin/python3"
fi
"$PYTHON_BIN" -m uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "Backend running (PID: $BACKEND_PID) on http://0.0.0.0:8000"

cleanup() {
  echo ""
  echo "Shutting down RoutY processes..."
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

sleep 2

echo ""
echo "[2/2] Starting RoutY React Native (Expo) Metro Server..."
cd "$DIR/frontend"
echo "=========================================================="
echo "  📱 Commuter Mobile App Ready:"
echo "  - Browser Web Preview: http://localhost:8081"
echo "  - iOS Simulator (Mac): Press 'i' in terminal"
echo "  - Android Emulator: Press 'a' in terminal"
echo "  - Physical Phone: Scan QR code with Camera (iOS) or Expo Go (Android)"
echo "=========================================================="
npx expo start --port 8081
