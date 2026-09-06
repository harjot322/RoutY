#!/usr/bin/env python3
"""
RoutY GPS Simulation Service
Simulates live transit vehicle movement along GeoJSON route paths and dispatches
telemetry reports to the RoutY Express backend.
"""
import os
import sys
import time
import json
import urllib.request
import urllib.error
from typing import List, Dict, Any

from adapters.simulated_adapter import SimulatedGPSAdapter

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:5000").rstrip("/")
UPDATE_INTERVAL_SEC = float(os.environ.get("UPDATE_INTERVAL_SEC", "2.0"))

def http_get(url: str) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "RoutY-Simulator/1.0"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))

def http_post(url: str, data: Dict[str, Any]) -> Any:
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "RoutY-Simulator/1.0"
        }
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))

# Local fallback seed if backend is still spinning up
FALLBACK_ROUTES = [
    {
        "_id": "route_1",
        "route_number": "R-101",
        "name": "Bhopal Junction – MP Nagar – AIIMS",
        "color": "#2563eb",
        "stops": [
            {"name": "Bhopal Junction", "latitude": 23.2687, "longitude": 77.4116},
            {"name": "Bharat Talkies", "latitude": 23.2625, "longitude": 77.4145},
            {"name": "Nadra Bus Stand", "latitude": 23.2562, "longitude": 77.4168},
            {"name": "Board Office", "latitude": 23.2335, "longitude": 77.4320},
            {"name": "MP Nagar Zone 1", "latitude": 23.2280, "longitude": 77.4365},
            {"name": "DB City Mall", "latitude": 23.2320, "longitude": 77.4395},
            {"name": "AIIMS Bhopal", "latitude": 23.2085, "longitude": 77.4580}
        ],
        "geojson": {
            "type": "LineString",
            "coordinates": [
                [77.4116, 23.2687], [77.4130, 23.2655], [77.4145, 23.2625],
                [77.4155, 23.2590], [77.4168, 23.2562], [77.4240, 23.2450],
                [77.4320, 23.2335], [77.4365, 23.2280], [77.4395, 23.2320],
                [77.4480, 23.2200], [77.4580, 23.2085]
            ]
        }
    },
    {
        "_id": "route_2",
        "route_number": "R-204",
        "name": "Bairagarh – VIP Road – New Market",
        "color": "#059669",
        "stops": [
            {"name": "Bairagarh Terminal", "latitude": 23.2810, "longitude": 77.3410},
            {"name": "Lalghati Square", "latitude": 23.2790, "longitude": 77.3710},
            {"name": "VIP Road", "latitude": 23.2620, "longitude": 77.3880},
            {"name": "Kamla Park", "latitude": 23.2490, "longitude": 77.3990},
            {"name": "Polytechnic", "latitude": 23.2420, "longitude": 77.4040},
            {"name": "New Market", "latitude": 23.2355, "longitude": 77.4010}
        ],
        "geojson": {
            "type": "LineString",
            "coordinates": [
                [77.3410, 23.2810], [77.3560, 23.2800], [77.3710, 23.2790],
                [77.3800, 23.2700], [77.3880, 23.2620], [77.3940, 23.2550],
                [77.3990, 23.2490], [77.4040, 23.2420], [77.4010, 23.2355]
            ]
        }
    },
    {
        "_id": "route_3",
        "route_number": "R-305",
        "name": "Raja Bhoj Airport – Karond – Central Library",
        "color": "#d97706",
        "stops": [
            {"name": "Airport Terminal", "latitude": 23.2925, "longitude": 77.3620},
            {"name": "Gandhi Nagar", "latitude": 23.2870, "longitude": 77.3740},
            {"name": "Karond Mandi", "latitude": 23.2980, "longitude": 77.4050},
            {"name": "DIG Bungalow", "latitude": 23.2830, "longitude": 77.4120},
            {"name": "Alpana Tiraha", "latitude": 23.2640, "longitude": 77.4110},
            {"name": "Central Library", "latitude": 23.2530, "longitude": 77.4080}
        ],
        "geojson": {
            "type": "LineString",
            "coordinates": [
                [77.3620, 23.2925], [77.3680, 23.2900], [77.3740, 23.2870],
                [77.3900, 23.2930], [77.4050, 23.2980], [77.4120, 23.2830],
                [77.4110, 23.2640], [77.4080, 23.2530]
            ]
        }
    }
]

FALLBACK_BUSES = [
    {"_id": "bus_1", "bus_number": "MP04-HE-1001", "route_id": "route_1", "progress": 0.05},
    {"_id": "bus_2", "bus_number": "MP04-HE-1002", "route_id": "route_1", "progress": 0.55},
    {"_id": "bus_3", "bus_number": "MP04-HE-1003", "route_id": "route_2", "progress": 0.15},
    {"_id": "bus_4", "bus_number": "MP04-HE-1004", "route_id": "route_2", "progress": 0.65},
    {"_id": "bus_5", "bus_number": "MP04-HE-1005", "route_id": "route_3", "progress": 0.25},
    {"_id": "bus_6", "bus_number": "MP04-HE-1006", "route_id": "route_3", "progress": 0.75}
]

def load_fleet_data() -> tuple:
    """Fetch routes and fleet from backend or fallback to seeded data."""
    routes_map = {}
    buses_list = []

    print(f"[Simulator] Attempting to fetch routes & buses from {BACKEND_URL}/api/public/...")
    try:
        routes_data = http_get(f"{BACKEND_URL}/api/public/routes")
        buses_data = http_get(f"{BACKEND_URL}/api/public/buses")
        if routes_data and buses_data:
            print(f"[Simulator] Successfully loaded {len(routes_data)} routes and {len(buses_data)} buses from backend!")
            for r in routes_data:
                routes_map[str(r["_id"])] = r
            buses_list = buses_data
            return routes_map, buses_list
    except Exception as e:
        print(f"[Simulator] Warning: Could not connect to backend ({e}). Using local fallback routes.")

    for r in FALLBACK_ROUTES:
        routes_map[r["_id"]] = r
    buses_list = FALLBACK_BUSES
    return routes_map, buses_list

def main():
    print("==========================================================")
    print("  🚍 RoutY GPS Simulation Service")
    print(f"  Target Backend: {BACKEND_URL}")
    print(f"  Update Interval: {UPDATE_INTERVAL_SEC}s")
    print("==========================================================")

    # Initial delay if waiting for backend
    time.sleep(1.0)
    routes_map, buses_list = load_fleet_data()

    # Initialize adapters for each bus
    adapters: List[SimulatedGPSAdapter] = []
    
    for idx, bus in enumerate(buses_list):
        route_id = str(bus.get("route_id", ""))
        if isinstance(bus.get("route_id"), dict):
            route_id = str(bus["route_id"].get("_id", ""))
        
        # Match with route
        route = routes_map.get(route_id)
        if not route and routes_map:
            route = list(routes_map.values())[idx % len(routes_map)]
            route_id = str(route.get("_id", route_id))

        if not route:
            continue

        coordinates = route.get("geojson", {}).get("coordinates", [])
        stops = route.get("stops", [])

        # Stagger bus progress along the route
        progress = bus.get("progress", (idx * 0.3) % 1.0)

        adapter = SimulatedGPSAdapter(
            bus_id=str(bus.get("_id", f"sim_bus_{idx}")),
            bus_number=bus.get("bus_number", f"BUS-{idx+1}"),
            route_id=route_id,
            coordinates=coordinates,
            stops=stops,
            base_speed_kmh=28.0 + (idx % 3) * 3.0,
            initial_progress_ratio=progress
        )
        adapter.start()
        adapters.append(adapter)
        print(f"[Simulator] Initialized adapter for {adapter.bus_number} on {route.get('route_number', 'ROUTE')}")

    print(f"\n[Simulator] Started {len(adapters)} active bus simulators. Telemetry reporting begins...\n")

    report_url = f"{BACKEND_URL}/api/telemetry/report"

    while True:
        cycle_start = time.time()
        for adapter in adapters:
            telemetry = adapter.get_telemetry()
            try:
                resp = http_post(report_url, telemetry)
                next_stop = resp.get("next_stop", "N/A")
                eta_sec = resp.get("eta_seconds", 0)
                print(
                    f"🚍 {telemetry['bus_number']:<14} | "
                    f"Lat: {telemetry['latitude']:.4f}, Lng: {telemetry['longitude']:.4f} | "
                    f"Heading: {telemetry['bearing']:>5.1f}° | "
                    f"Speed: {telemetry['speed_kmh']:>4.1f} km/h | "
                    f"Next: {next_stop} ({eta_sec}s)"
                )
            except urllib.error.URLError:
                print(
                    f"🚍 {telemetry['bus_number']} (local) | "
                    f"Lat: {telemetry['latitude']:.4f}, Lng: {telemetry['longitude']:.4f} | "
                    f"Speed: {telemetry['speed_kmh']:.1f} km/h (Backend connecting...)"
                )
            except Exception as e:
                print(f"[Simulator] Telemetry dispatch error: {e}")

        # Sleep remaining interval
        elapsed = time.time() - cycle_start
        sleep_time = max(0.2, UPDATE_INTERVAL_SEC - elapsed)
        time.sleep(sleep_time)

if __name__ == "__main__":
    main()
