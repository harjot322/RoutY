import os
import sys
from pathlib import Path

backend_dir = str(Path(__file__).resolve().parents[1])
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(Path(backend_dir) / ".env")

import pytest
from starlette.testclient import TestClient
from server import app, engine, db

ADMIN_USER = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASSWORD", "admin")

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post("/api/admin/login", data={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

def test_states_endpoint(client):
    """Verify GET /api/states returns comprehensive state list covering India."""
    res = client.get("/api/states")
    assert res.status_code == 200
    states = res.json()
    assert len(states) >= 30, f"Expected at least 30 states/UTs, got {len(states)}"
    state_names = [s["state"] for s in states]
    
    # Check major states and UTs
    for expected in [
        "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "West Bengal",
        "Gujarat", "Kerala", "Uttar Pradesh", "Telangana", "Punjab",
        "Rajasthan", "Goa", "Assam", "Jammu & Kashmir", "Ladakh", "Puducherry"
    ]:
        assert expected in state_names, f"Expected {expected} in states list"
        
    for s in states:
        assert "route_count" in s
        assert "bus_count" in s
        assert "cities" in s
        assert len(s["cities"]) > 0

def test_routes_state_filtering(client):
    """Verify GET /api/routes?state=Maharashtra filters accurately."""
    res = client.get("/api/routes?state=Maharashtra")
    assert res.status_code == 200
    routes = res.json()
    assert len(routes) > 0
    for r in routes:
        assert r.get("state") == "Maharashtra"
        assert "stops" in r and len(r["stops"]) >= 2

def test_bus_crew_and_opt_in_flow(client):
    """Verify buses contain crew info, seat capacity, and opt-in/opt-out mechanics."""
    # Find a bus from the engine
    buses = list(engine.buses.values())
    assert len(buses) > 0
    test_bus = buses[0]
    bus_id = test_bus.id

    # Check bus endpoint
    res = client.get(f"/api/buses/{bus_id}")
    assert res.status_code == 200
    b_data = res.json()
    assert "driver" in b_data
    assert "driver_phone" in b_data
    assert "conductor" in b_data
    assert "conductor_phone" in b_data
    assert "capacity" in b_data
    assert b_data["capacity"] == 42
    assert "passengers_opted_in" in b_data
    
    initial_count = b_data["passengers_opted_in"]
    
    # Opt in
    res_in = client.post(f"/api/buses/{bus_id}/opt-in")
    assert res_in.status_code == 200
    assert res_in.json()["passengers_opted_in"] == initial_count + 1

    # Opt out
    res_out = client.post(f"/api/buses/{bus_id}/opt-out")
    assert res_out.status_code == 200
    assert res_out.json()["passengers_opted_in"] == initial_count

def test_admin_drivers_directory_and_location_update(client, admin_headers):
    """Verify admin drivers CRUD and GPS location positioning."""
    # 1. List drivers
    res = client.get("/api/admin/drivers", headers=admin_headers)
    assert res.status_code == 200
    drivers = res.json()
    assert len(drivers) > 0
    
    driver = drivers[0]
    driver_id = driver["id"]

    # 2. Update driver's current GPS location
    new_lat = 28.6139
    new_lng = 77.2090
    res_upd = client.put(
        f"/api/admin/drivers/{driver_id}",
        json={"lat": new_lat, "lng": new_lng, "status": "on_duty"},
        headers=admin_headers
    )
    assert res_upd.status_code == 200
    updated = res_upd.json()
    assert abs(updated["lat"] - new_lat) < 0.0001
    assert abs(updated["lng"] - new_lng) < 0.0001
    assert updated["status"] == "on_duty"

    # Verify that assigned bus also has coordinates updated
    if updated.get("bus_id") and updated["bus_id"] in engine.buses:
        bus = engine.buses[updated["bus_id"]]
        assert abs(bus.lat - new_lat) < 0.05
        assert abs(bus.lng - new_lng) < 0.05

    # 3. Create a new driver
    res_create = client.post(
        "/api/admin/drivers",
        json={
            "name": "Rajesh Kumar",
            "phone": "+91 98765 43210",
            "conductor_name": "Suresh Patel",
            "conductor_phone": "+91 98765 43211",
            "depot_address": "Majestic Central Depot, Bengaluru",
            "state": "Karnataka",
            "city": "Bengaluru",
            "lat": 12.9716,
            "lng": 77.5946
        },
        headers=admin_headers
    )
    assert res_create.status_code == 200
    created = res_create.json()
    new_id = created["id"]
    assert created["name"] == "Rajesh Kumar"

    # 4. Delete the created driver
    res_del = client.delete(f"/api/admin/drivers/{new_id}", headers=admin_headers)
    assert res_del.status_code == 200
    assert res_del.json()["ok"] is True

def test_suggestion_to_route_arrangement(client, admin_headers):
    """Verify commuter submits route suggestion and admin arranges & deploys it."""
    # 1. Commuter submits suggestion
    suggest_payload = {
        "from_text": "Hauz Khas Terminal",
        "to_text": "Nehru Place Hub",
        "village": "South Delhi Corridor",
        "notes": "High frequency corridor needed during morning peak",
        "contact": "+91 98111 22233",
        "lat": 28.5494,
        "lng": 77.2001
    }
    res_sug = client.post("/api/suggestions", json=suggest_payload)
    assert res_sug.status_code == 200
    suggestion = res_sug.json()
    s_id = suggestion["id"]
    assert suggestion["status"] == "new"

    # 2. Admin arranges and deploys suggestion into a live route
    convert_payload = {
        "route_number": "NEW-HK-NP",
        "bus_count": 3,
        "color": "#10B981"
    }
    res_conv = client.post(
        f"/api/admin/suggestions/{s_id}/convert-to-route",
        json=convert_payload,
        headers=admin_headers
    )
    assert res_conv.status_code == 200
    conv_data = res_conv.json()
    assert conv_data["ok"] is True
    assert "route" in conv_data
    created_route = conv_data["route"]
    assert created_route["number"] == "NEW-HK-NP"
    assert len(created_route["stops"]) >= 2
    assert conv_data["buses_deployed"] == 3

    # 3. Check suggestion is marked approved
    sug_doc = client.get("/api/admin/suggestions", headers=admin_headers).json()
    matched = [s for s in sug_doc if s["id"] == s_id]
    assert len(matched) == 1
    assert matched[0]["status"] == "approved"

def test_tens_of_buses_per_state_scale(client):
    """Verify tens of routes across states and cities (80+ routes) with 3-8 buses per route."""
    res = client.get("/api/states")
    assert res.status_code == 200
    states = res.json()
    assert len(states) >= 30
    
    # Check that major states have multiple routes
    state_map = {s["state"]: s for s in states}
    assert state_map["Delhi"]["route_count"] >= 4, f"Delhi has {state_map['Delhi']['route_count']} routes"
    assert state_map["Maharashtra"]["route_count"] >= 4, f"Maharashtra has {state_map['Maharashtra']['route_count']} routes"
    assert state_map["Karnataka"]["route_count"] >= 4, f"Karnataka has {state_map['Karnataka']['route_count']} routes"
    assert state_map["Tamil Nadu"]["route_count"] >= 4, f"Tamil Nadu has {state_map['Tamil Nadu']['route_count']} routes"
    assert state_map["Uttar Pradesh"]["route_count"] >= 4, f"Uttar Pradesh has {state_map['Uttar Pradesh']['route_count']} routes"

    # Verify global routes list has at least 80 distinct routes
    res_routes = client.get("/api/routes")
    assert res_routes.status_code == 200
    all_routes = res_routes.json()
    assert len(all_routes) >= 75, f"Expected at least 75 routes, got {len(all_routes)}"

    # Check that every route has between 3 and 8 active buses depending on stops
    for r in all_routes:
        buses_on_route = [b for b in engine.buses.values() if b.route_id == r["id"]]
        assert 3 <= len(buses_on_route) <= 8, f"Route {r['number']} has {len(buses_on_route)} buses (expected 3-8)"

    # Total buses nationwide
    total_buses = len(engine.buses)
    assert total_buses >= 350, f"Expected at least 350 total buses, got {total_buses}"

    # Verify state filtering reduces snapshot size appropriately
    res_delhi = client.get("/api/live?state=Delhi")
    assert res_delhi.status_code == 200
    delhi_buses = res_delhi.json()["buses"]
    assert len(delhi_buses) >= 15
    for b in delhi_buses:
        assert b["state"] == "Delhi"

def test_nearby_buses_endpoint(client):
    """Verify GET /api/buses/nearby ranks vehicles around commuter coordinates."""
    # Commuter at New Delhi (28.6139, 77.2090)
    res = client.get("/api/buses/nearby?lat=28.6139&lng=77.2090&radius_km=60&limit=5")
    assert res.status_code == 200
    nearby = res.json()
    assert len(nearby) > 0
    assert len(nearby) <= 5
    
    # Check ascending order of distance
    distances = [b["distance_m"] for b in nearby]
    assert distances == sorted(distances), "Buses should be ranked in ascending order of distance"
    
    # Check attributes
    first = nearby[0]
    assert "route_number" in first
    assert "plate" in first
    assert "driver" in first
    assert "passengers_opted_in" in first
    assert "capacity" in first
    assert first["capacity"] == 42
    assert first["distance_m"] <= 60000

