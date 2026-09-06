#!/bin/bash
# ==============================================================================
# RoutY: Real-Time Public Transport Tracking System
# Local Startup Script
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================================================="
echo "  🚍 Starting RoutY Civic Transit Platform"
echo "================================================================="

# Trap cleanup to stop background processes on exit
cleanup() {
    echo -e "\n[RoutY] Shutting down services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend
echo -e "\n[1/3] Starting Backend (Node.js + Express + Socket.IO)..."
cd "$ROOT_DIR/backend"
npm start &
BACKEND_PID=$!

# Wait for backend to be healthy
echo "Waiting for backend API on port 5000..."
for i in {1..20}; do
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "✓ Backend API is ready!"
        break
    fi
    sleep 1
done

# 2. Start Simulator
echo -e "\n[2/3] Starting GPS Simulator (Python)..."
cd "$ROOT_DIR/simulator"
/usr/bin/python3 main.py &
SIMULATOR_PID=$!

# 3. Start Frontend
echo -e "\n[3/3] Starting Frontend (React + Vite)..."
cd "$ROOT_DIR/frontend"
npm run dev -- --host &
FRONTEND_PID=$!

echo -e "\n================================================================="
echo "  ✅ RoutY Services Running Successfully!"
echo "  🌐 Commuter Interface: http://localhost:5173"
echo "  🔐 Admin Portal:       http://localhost:5173/admin/login"
echo "     Default Admin:      admin / RoutYAdmin2026!"
echo "  📡 API & Gateway:      http://localhost:5000"
echo "================================================================="
echo "Press Ctrl+C to stop all services."

wait
