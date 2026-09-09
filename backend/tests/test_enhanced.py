import os
import time
import requests
import pytest
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL") or "http://127.0.0.1:8000"
BASE_URL = BASE_URL.rstrip("/")
ADMIN_USER = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASSWORD", "admin")

@pytest.fixture(scope="session")
def s():
    return requests.Session()

@pytest.fixture(scope="session")
def admin_headers(s):
    res = s.post(f"{BASE_URL}/api/admin/login", data={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

class TestUnifiedSearch:
    def test_search_empty_query_returns_suggestions(self, s):
        r = s.get(f"{BASE_URL}/api/search/unified?q=")
        assert r.status_code == 200
        data = r.json()
        assert "routes" in data
        assert "buses" in data
        assert "stops" in data
        assert data["is_suggestion"] is True
        assert len(data["routes"]) > 0
        assert len(data["stops"]) > 0

    def test_search_by_route_code(self, s):
        r = s.get(f"{BASE_URL}/api/search/unified?q=R1")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] > 0
        match = any("R1" in item["number"] for item in data["routes"])
        assert match

    def test_search_by_stop_name(self, s):
        r = s.get(f"{BASE_URL}/api/search/unified?q=Barabanki")
        assert r.status_code == 200
        data = r.json()
        assert len(data["stops"]) > 0

class TestAdminFleetAndOverview:
    def test_admin_overview_metrics(self, s, admin_headers):
        r = s.get(f"{BASE_URL}/api/admin/overview", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "routes" in data
        assert "buses" in data
        assert "total_stops" in data
        assert "active_trips" in data
        assert "service_status" in data
        assert data["total_stops"] > 0
        assert "Operational" in data["service_status"] or data["service_status"] in ["optimal", "monitoring"]

    def test_admin_buses_lifecycle(self, s, admin_headers):
        # 1. Get routes to pick route_id
        routes_res = s.get(f"{BASE_URL}/api/routes")
        assert routes_res.status_code == 200
        routes = routes_res.json()
        assert len(routes) > 0
        target_route = routes[0]

        # 2. Create new bus
        create_payload = {
            "route_id": target_route["id"],
            "plate": "UP41 TEST 9999",
            "driver_name": "Test Pilot",
            "driver_phone": "+91 99999 88888",
            "status": "in_service",
            "occupancy": "seats_available",
            "schedule": "Express Peak (Every 5m)",
        }
        create_res = s.post(f"{BASE_URL}/api/admin/buses", json=create_payload, headers=admin_headers)
        assert create_res.status_code == 200, create_res.text
        bus_data = create_res.json()
        bus_id = bus_data["id"]
        assert bus_data["plate"] == "UP41 TEST 9999"
        assert bus_data["status"] == "in_service"

        # 3. Verify it shows up in admin buses list
        list_res = s.get(f"{BASE_URL}/api/admin/buses", headers=admin_headers)
        assert list_res.status_code == 200
        buses = list_res.json()
        assert any(b["id"] == bus_id for b in buses)

        # 4. Verify it participates in live tracking endpoint
        live_res = s.get(f"{BASE_URL}/api/live")
        assert live_res.status_code == 200
        live_buses = live_res.json().get("buses", [])
        assert any(b["id"] == bus_id for b in live_buses)

        # 5. Update bus status to maintenance
        update_res = s.put(f"{BASE_URL}/api/admin/buses/{bus_id}", json={
            "status": "maintenance",
            "driver_name": "Senior Driver",
        }, headers=admin_headers)
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["status"] == "maintenance"

        # 6. Delete the created bus
        del_res = s.delete(f"{BASE_URL}/api/admin/buses/{bus_id}", headers=admin_headers)
        assert del_res.status_code == 200
        assert del_res.json().get("ok") is True

        # 7. Verify deletion
        list_after = s.get(f"{BASE_URL}/api/admin/buses", headers=admin_headers).json()
        assert not any(b["id"] == bus_id for b in list_after)

    def test_admin_stops_and_schedules(self, s, admin_headers):
        stops_res = s.get(f"{BASE_URL}/api/admin/stops", headers=admin_headers)
        assert stops_res.status_code == 200
        stops = stops_res.json()
        assert len(stops) > 0
        assert "name" in stops[0]
        assert "routes" in stops[0]

        sched_res = s.get(f"{BASE_URL}/api/admin/schedules", headers=admin_headers)
        assert sched_res.status_code == 200
        scheds = sched_res.json()
        assert len(scheds) > 0
        assert "route_number" in scheds[0]

    def test_arbitrary_route_with_fallback_geometry(self, s, admin_headers):
        # Create route with 3 stop coordinates but no explicit OSRM path geometry
        payload = {
            "number": "R99",
            "name": "Barabanki to Haidergarh Express",
            "name_hi": "बाराबंकी से हैदरगढ़ एक्सप्रेस",
            "origin": "Barabanki Station",
            "destination": "Haidergarh Chowk",
            "color": "#6366F1",
            "bus_count": 2,
            "stops": [
                {"name": "Barabanki Station", "name_hi": "बाराबंकी स्टेशन", "lat": 26.9280, "lng": 81.1850},
                {"name": "Satrikh Crossing", "name_hi": "सतरिख क्रॉसिंग", "lat": 26.8650, "lng": 81.2010},
                {"name": "Haidergarh Chowk", "name_hi": "हैदरगढ़ चौक", "lat": 26.6800, "lng": 81.2500},
            ]
        }
        res = s.post(f"{BASE_URL}/api/admin/routes", json=payload, headers=admin_headers)
        assert res.status_code == 200, res.text
        route = res.json()
        route_id = route["id"]
        assert route["number"] == "R99"
        assert len(route["path"]["coordinates"]) >= 3

        # Verify it shows up in public routes and search
        search_res = s.get(f"{BASE_URL}/api/search/unified?q=R99")
        assert search_res.status_code == 200
        assert any("R99" in item["number"] for item in search_res.json()["routes"])

        # Clean up
        del_route = s.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=admin_headers)
        assert del_route.status_code == 200
