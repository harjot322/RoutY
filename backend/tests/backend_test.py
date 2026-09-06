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

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL missing"
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
