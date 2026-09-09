"""RoutY backend regression tests.

Runs against the public EXPO_BACKEND_URL. All endpoints under /api.
"""
import os
import time
import uuid
import asyncio
from pathlib import Path

import pytest
import requests
import websockets
import json
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL") or "http://127.0.0.1:8000"
BASE_URL = BASE_URL.rstrip("/")
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/live"

ADMIN_USER = "admin"
ADMIN_PASS = "RoutYAdmin2026Secure"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/admin/login",
               data={"username": ADMIN_USER, "password": ADMIN_PASS},
               headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert r.status_code == 200, r.text
    tok = r.json()["access_token"]
    assert tok
    return tok


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ------------------------------- public
class TestPublic:
    def test_root(self, s):
        r = s.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        d = r.json()
        assert d.get("status") == "ok"
        assert d["buses"] > 0
        assert d["routes"] >= 4

    def test_list_routes(self, s):
        r = s.get(f"{BASE_URL}/api/routes")
        assert r.status_code == 200
        routes = r.json()
        assert isinstance(routes, list) and len(routes) >= 4
        for rt in routes:
            assert "id" in rt and "number" in rt and "stops" in rt and "path" in rt
            assert "bus_count" in rt

    def test_route_detail(self, s):
        routes = s.get(f"{BASE_URL}/api/routes").json()
        rid = routes[0]["id"]
        r = s.get(f"{BASE_URL}/api/routes/{rid}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == rid
        assert "stops" in d and "buses" in d and "bunching" in d
        # Each stop should have a best ETA field (may be None if no bus, but key must exist)
        assert all("best" in s2 for s2 in d["stops"])

    def test_live_moves(self, s):
        a = s.get(f"{BASE_URL}/api/live").json()
        assert "buses" in a and len(a["buses"]) > 0
        time.sleep(4)
        b = s.get(f"{BASE_URL}/api/live").json()
        # at least one bus should have moved
        moved = False
        for ba in a["buses"]:
            bb = next((x for x in b["buses"] if x["id"] == ba["id"]), None)
            if bb and (abs(bb["lat"] - ba["lat"]) + abs(bb["lng"] - ba["lng"])) > 1e-6:
                moved = True
                break
        assert moved, "No bus moved between /live calls"

    def test_bus_by_id(self, s):
        live = s.get(f"{BASE_URL}/api/live").json()
        bid = live["buses"][0]["id"]
        r = s.get(f"{BASE_URL}/api/buses/{bid}")
        assert r.status_code == 200
        assert r.json()["id"] == bid

    def test_nearest_stop(self, s):
        r = s.get(f"{BASE_URL}/api/stops/nearest", params={"lat": 26.93, "lng": 81.19})
        assert r.status_code == 200
        d = r.json()
        assert "name" in d and "route_id" in d and "best" in d

    def test_search_known(self, s):
        r = s.post(f"{BASE_URL}/api/search",
                   json={"from_text": "Barabanki", "to_text": "Haidergarh"})
        assert r.status_code == 200
        d = r.json()
        assert d["unserved"] is False
        assert len(d["results"]) >= 1
        # expect R2 among results
        assert any(res["number"] == "R2" for res in d["results"]), d["results"]

    def test_search_unknown_logs_demand(self, s, auth_headers):
        before = s.get(f"{BASE_URL}/api/admin/demand", headers=auth_headers).json()["total"]
        uniq = f"NoWhere{uuid.uuid4().hex[:6]}"
        r = s.post(f"{BASE_URL}/api/search",
                   json={"from_text": uniq, "to_text": f"Also{uuid.uuid4().hex[:6]}"})
        assert r.status_code == 200
        d = r.json()
        assert d["unserved"] is True and d["results"] == []
        after = s.get(f"{BASE_URL}/api/admin/demand", headers=auth_headers).json()["total"]
        assert after == before + 1

    def test_sos_flow(self, s, auth_headers):
        r = s.post(f"{BASE_URL}/api/sos", json={"lat": 26.93, "lng": 81.19})
        assert r.status_code == 200
        sos = r.json()
        assert sos["status"] == "active"
        sid = sos["id"]
        # bus should be flagged with sos in /live
        live = s.get(f"{BASE_URL}/api/live").json()
        if sos["bus_id"]:
            b = next((x for x in live["buses"] if x["id"] == sos["bus_id"]), None)
            assert b and b.get("sos"), "bus not flagged with sos"
        # resolve it via admin
        r2 = s.post(f"{BASE_URL}/api/admin/sos/{sid}/resolve", headers=auth_headers)
        assert r2.status_code == 200
        # verify no longer flagged
        live2 = s.get(f"{BASE_URL}/api/live").json()
        if sos["bus_id"]:
            b2 = next((x for x in live2["buses"] if x["id"] == sos["bus_id"]), None)
            assert b2 and not b2.get("sos")

    def test_translate_cache(self, s):
        text = f"Bus arriving soon {uuid.uuid4().hex[:6]}"
        r1 = s.post(f"{BASE_URL}/api/translate", json={"text": text, "source": "en", "target": "hi"})
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["translated_text"]
        assert d1["cached"] is False
        r2 = s.post(f"{BASE_URL}/api/translate", json={"text": text, "source": "en", "target": "hi"})
        assert r2.status_code == 200
        assert r2.json()["cached"] is True


# ------------------------------- admin
class TestAdmin:
    def test_wrong_password(self, s):
        r = s.post(f"{BASE_URL}/api/admin/login",
                   data={"username": ADMIN_USER, "password": "wrong"})
        assert r.status_code == 401

    def test_unauth_endpoints(self, s):
        for path in ["/api/admin/me", "/api/admin/overview", "/api/admin/sos", "/api/admin/demand"]:
            r = s.get(f"{BASE_URL}{path}")
            assert r.status_code == 401, f"{path} returned {r.status_code}"

    def test_admin_me(self, s, auth_headers):
        r = s.get(f"{BASE_URL}/api/admin/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["username"] == ADMIN_USER

    def test_overview(self, s, auth_headers):
        r = s.get(f"{BASE_URL}/api/admin/overview", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("routes", "buses", "sos_active", "bunching", "sos", "demand_count", "live"):
            assert k in d, f"missing {k}"

    def test_admin_sos_list(self, s, auth_headers):
        r = s.get(f"{BASE_URL}/api/admin/sos", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_demand(self, s, auth_headers):
        r = s.get(f"{BASE_URL}/api/admin/demand", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "total" in d and "pairs" in d and "points" in d

    def test_route_lifecycle(self, s, auth_headers):
        # Create
        payload = {
            "number": f"TR{uuid.uuid4().hex[:4].upper()}",
            "name": "TEST_Route_Alpha",
            "name_hi": "टेस्ट रूट",
            "color": "#123456",
            "stops": [
                {"name": "TEST_Stop_A", "name_hi": "स्टॉप ए", "lat": 26.9, "lng": 81.2},
                {"name": "TEST_Stop_B", "name_hi": "स्टॉप बी", "lat": 26.95, "lng": 81.25},
            ],
            "bus_count": 2,
        }
        r = s.post(f"{BASE_URL}/api/admin/routes", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        route = r.json()
        rid = route["id"]

        # Appears in public list
        pub = s.get(f"{BASE_URL}/api/routes").json()
        assert any(x["id"] == rid for x in pub)

        # Add a bus
        r2 = s.post(f"{BASE_URL}/api/admin/routes/{rid}/buses", headers=auth_headers)
        assert r2.status_code == 200
        bus_id = r2.json()["id"]
        assert bus_id

        # bus history endpoint (may return empty points immediately)
        time.sleep(3)  # allow engine to log positions
        r3 = s.get(f"{BASE_URL}/api/admin/buses/{bus_id}/history", params={"minutes": 30}, headers=auth_headers)
        assert r3.status_code == 200
        assert r3.json()["bus_id"] == bus_id
        assert "points" in r3.json()

        # Delete (soft)
        r4 = s.delete(f"{BASE_URL}/api/admin/routes/{rid}", headers=auth_headers)
        assert r4.status_code == 200
        pub2 = s.get(f"{BASE_URL}/api/routes").json()
        assert not any(x["id"] == rid for x in pub2)


# ------------------------------- websocket
class TestWebsocket:
    def test_ws_snapshot(self):
        async def run():
            async with websockets.connect(WS_URL, open_timeout=10) as ws:
                msg = await asyncio.wait_for(ws.recv(), timeout=10)
                data = json.loads(msg)
                assert "ts" in data and "buses" in data and "bunching" in data
                assert len(data["buses"]) > 0
                # Wait for next push (engine ticks every 2s)
                msg2 = await asyncio.wait_for(ws.recv(), timeout=8)
                data2 = json.loads(msg2)
                assert "ts" in data2
        asyncio.run(run())


# ------------------------------- Iteration 2: OSRM path & new endpoints
class TestIter2Routes:
    """Verify OSRM road geometry + stop path_index/dist_along."""

    def test_routes_have_osrm_path(self, s):
        routes = s.get(f"{BASE_URL}/api/routes").json()
        assert len(routes) >= 4
        osrm_ok = 0
        for r in routes:
            src = r.get("path_source")
            coords = r.get("path", {}).get("coordinates", [])
            assert src in ("osrm", "straight"), f"unexpected path_source {src}"
            if src == "osrm":
                osrm_ok += 1
                assert len(coords) > 100, f"route {r['number']} OSRM path only {len(coords)} pts"
            # stops should be ordered along the polyline
            prev_idx, prev_dist = -1, -0.001
            for st in r["stops"]:
                assert "path_index" in st and "dist_along" in st
                assert st["path_index"] >= prev_idx
                assert st["dist_along"] >= prev_dist - 1e-6
                prev_idx, prev_dist = st["path_index"], st["dist_along"]
        # At least the seeded R1-R4 should have real roads (best-effort)
        assert osrm_ok >= 1, "No OSRM routes at all (public OSRM down?)"


class TestIter2Timetable:
    def test_timetable_shape(self, s):
        routes = s.get(f"{BASE_URL}/api/routes").json()
        rid = next(r["id"] for r in routes if r["number"] == "R2")
        r = s.get(f"{BASE_URL}/api/routes/{rid}/timetable")
        assert r.status_code == 200, r.text
        d = r.json()
        # API uses keys "first"/"last"
        assert d.get("first") == "06:00"
        assert d.get("last") == "20:00"
        assert isinstance(d.get("headway_min"), (int, float)) and d["headway_min"] > 0
        assert "fares_from_origin" in d and isinstance(d["fares_from_origin"], list)
        # stop count for direction toggle
        stops_len = len(d["forward"]["stops"])
        assert stops_len >= 2
        assert len(d["forward"]["trips"]) >= 1
        for trip in d["forward"]["trips"]:
            assert len(trip["times"]) == stops_len
            # time format HH:MM
            for tm in trip["times"]:
                assert len(tm) == 5 and tm[2] == ":"
        assert "backward" in d and len(d["backward"]["stops"]) == stops_len

    def test_timetable_404(self, s):
        r = s.get(f"{BASE_URL}/api/routes/does-not-exist/timetable")
        assert r.status_code == 404


class TestIter2Fare:
    def test_fare_between_stops(self, s):
        routes = s.get(f"{BASE_URL}/api/routes").json()
        r2 = next(r for r in routes if r["number"] == "R2")
        rid = r2["id"]
        f_id = r2["stops"][0]["id"]
        t_id = r2["stops"][-1]["id"]
        r = s.get(f"{BASE_URL}/api/routes/{rid}/fare", params={"from_stop": f_id, "to_stop": t_id})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["fare_inr"] >= 10
        assert d["distance_km"] > 0
        assert d["travel_s"] > 0
        assert isinstance(d.get("via"), list)
        assert "legs" in d and len(d["legs"]) >= 2
        # legs cumulative eta increasing
        prev = -1
        for leg in d["legs"]:
            assert "eta_from_start_s" in leg
            assert leg["eta_from_start_s"] >= prev
            prev = leg["eta_from_start_s"]

    def test_fare_reversed(self, s):
        routes = s.get(f"{BASE_URL}/api/routes").json()
        r2 = next(r for r in routes if r["number"] == "R2")
        rid = r2["id"]
        r = s.get(f"{BASE_URL}/api/routes/{rid}/fare",
                  params={"from_stop": r2["stops"][-1]["id"], "to_stop": r2["stops"][0]["id"]})
        assert r.status_code == 200
        assert r.json()["fare_inr"] >= 10

    def test_fare_same_stop(self, s):
        routes = s.get(f"{BASE_URL}/api/routes").json()
        r2 = next(r for r in routes if r["number"] == "R2")
        sid = r2["stops"][0]["id"]
        r = s.get(f"{BASE_URL}/api/routes/{r2['id']}/fare", params={"from_stop": sid, "to_stop": sid})
        assert r.status_code == 404


class TestIter2Search:
    def test_search_returns_fare_and_via(self, s):
        r = s.post(f"{BASE_URL}/api/search",
                   json={"from_text": "Barabanki", "to_text": "Haidergarh"})
        assert r.status_code == 200
        d = r.json()
        assert d["unserved"] is False and len(d["results"]) >= 1
        res = next(x for x in d["results"] if x["number"] == "R2")
        assert res["fare_inr"] and res["fare_inr"] >= 10
        assert res["distance_km"] > 0
        assert res["travel_s"] > 0
        assert isinstance(res.get("via"), list) and len(res["via"]) == 4
        assert isinstance(res.get("legs"), list) and len(res["legs"]) >= 2


class TestIter2Stops:
    def test_stop_arrivals(self, s):
        routes = s.get(f"{BASE_URL}/api/routes").json()
        # Barabanki Bus Stand should be present on R1-R4
        target = None
        for r in routes:
            for st in r["stops"]:
                if "barabanki bus stand" in st["name"].lower():
                    target = st["id"]
                    break
            if target:
                break
        assert target, "Barabanki Bus Stand seed stop not found"
        r = s.get(f"{BASE_URL}/api/stops/{target}")
        assert r.status_code == 200
        d = r.json()
        assert "arrivals" in d and isinstance(d["arrivals"], list)
        # arrivals grouped by route; expect >=1 (ideally 4 sharing this stop name)
        assert len(d["arrivals"]) >= 1
        # Each arrival entry should have route info + eta
        for a in d["arrivals"]:
            assert "route_id" in a and ("number" in a or "route_number" in a)

    def test_stop_unknown_404(self, s):
        r = s.get(f"{BASE_URL}/api/stops/does-not-exist-stop")
        assert r.status_code == 404


class TestIter2Suggestions:
    def test_suggestion_flow(self, s, auth_headers):
        body = {
            "from_text": "TEST_FromVillage",
            "to_text": "TEST_ToTown",
            "village": "TEST_Village",
            "notes": "Please add bus",
            "contact": "9999999999",
            "lat": 26.93,
            "lng": 81.19,
        }
        r = s.post(f"{BASE_URL}/api/suggestions", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "new"
        sid = d["id"]

        # Admin list
        r2 = s.get(f"{BASE_URL}/api/admin/suggestions", headers=auth_headers)
        assert r2.status_code == 200
        assert any(x["id"] == sid for x in r2.json())

        # Admin overview has suggestions_new count
        ov = s.get(f"{BASE_URL}/api/admin/overview", headers=auth_headers).json()
        assert "suggestions_new" in ov and ov["suggestions_new"] >= 1

        # Approve
        r3 = s.post(f"{BASE_URL}/api/admin/suggestions/{sid}/status",
                    json={"status": "approved"}, headers=auth_headers)
        assert r3.status_code == 200
        # verify
        after = s.get(f"{BASE_URL}/api/admin/suggestions", headers=auth_headers).json()
        assert next(x for x in after if x["id"] == sid)["status"] == "approved"

        # Invalid status
        r4 = s.post(f"{BASE_URL}/api/admin/suggestions/{sid}/status",
                    json={"status": "bogus"}, headers=auth_headers)
        assert r4.status_code == 422

    def test_suggestions_unauth(self, s):
        r = s.get(f"{BASE_URL}/api/admin/suggestions")
        assert r.status_code == 401


class TestIter2AdminFindStops:
    def test_find_stops_between(self, s, auth_headers):
        r = s.post(f"{BASE_URL}/api/admin/routes/find-stops",
                   json={"from_point": {"lat": 26.926, "lng": 81.19},
                         "to_point": {"lat": 26.60, "lng": 81.36}},
                   headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "stops" in d and isinstance(d["stops"], list)
        names = " ".join([s2["name"].lower() for s2 in d["stops"]])
        # At least one of the expected intermediates should appear
        assert any(k in names for k in ["banki", "zaidpur", "siddhaur", "trivediganj"]), names
        # Ordered along corridor (t increasing)
        ts = [s2.get("t") for s2 in d["stops"] if s2.get("t") is not None]
        assert ts == sorted(ts)

    def test_create_route_with_osrm(self, s, auth_headers):
        payload = {
            "number": f"TR{uuid.uuid4().hex[:4].upper()}",
            "name": "TEST_Iter2_Route",
            "name_hi": "टेस्ट",
            "color": "#00AA55",
            "stops": [
                {"name": "TEST_Barabanki", "name_hi": "बाराबंकी", "lat": 26.926, "lng": 81.19},
                {"name": "TEST_Dewa", "name_hi": "देवा", "lat": 27.04, "lng": 81.17},
            ],
            "bus_count": 1,
        }
        r = s.post(f"{BASE_URL}/api/admin/routes", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        route = r.json()
        rid = route["id"]
        assert route.get("path_source") in ("osrm", "straight")
        # Appears in public list
        pub = s.get(f"{BASE_URL}/api/routes").json()
        assert any(x["id"] == rid for x in pub)
        # cleanup
        r2 = s.delete(f"{BASE_URL}/api/admin/routes/{rid}", headers=auth_headers)
        assert r2.status_code == 200

