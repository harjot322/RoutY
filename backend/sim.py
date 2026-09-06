"""RoutY simulation engine: moves buses along predefined GeoJSON routes,
computes stop-level ETAs from learned segment speeds, detects bunching."""
import asyncio
import logging
import math
import random
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from faker import Faker

logger = logging.getLogger("routy.sim")
fake = Faker("en_IN")

EARTH_R = 6371000.0
DWELL_SECONDS = 20.0
DEFAULT_SPEED_MPS = 30 / 3.6  # 30 km/h rural roads


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def bearing(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Seed data: Barabanki district (Uttar Pradesh) - tier-2 town + villages
# ---------------------------------------------------------------------------
SEED_ROUTES = [
    {
        "number": "R1",
        "name": "Barabanki – Dewa Sharif",
        "name_hi": "बाराबंकी – देवा शरीफ",
        "color": "#C04A00",
        "stops": [
            {"name": "Barabanki Bus Stand", "name_hi": "बाराबंकी बस स्टैंड", "lat": 26.9260, "lng": 81.1900},
            {"name": "Peerbatawan Chauraha", "name_hi": "पीरबटावन चौराहा", "lat": 26.9500, "lng": 81.1850},
            {"name": "Bhitauli Village", "name_hi": "भितौली गाँव", "lat": 26.9850, "lng": 81.1800},
            {"name": "Dewa Sharif Dargah", "name_hi": "देवा शरीफ दरगाह", "lat": 27.0400, "lng": 81.1700},
        ],
    },
    {
        "number": "R2",
        "name": "Barabanki – Haidergarh",
        "name_hi": "बाराबंकी – हैदरगढ़",
        "color": "#1B7F31",
        "stops": [
            {"name": "Barabanki Bus Stand", "name_hi": "बाराबंकी बस स्टैंड", "lat": 26.9260, "lng": 81.1900},
            {"name": "Banki Chauraha", "name_hi": "बंकी चौराहा", "lat": 26.8950, "lng": 81.2450},
            {"name": "Zaidpur Market", "name_hi": "जैदपुर बाज़ार", "lat": 26.8300, "lng": 81.3200},
            {"name": "Siddhaur", "name_hi": "सिद्धौर", "lat": 26.7500, "lng": 81.3000},
            {"name": "Trivediganj", "name_hi": "त्रिवेदीगंज", "lat": 26.6600, "lng": 81.3200},
            {"name": "Haidergarh Tehsil", "name_hi": "हैदरगढ़ तहसील", "lat": 26.6000, "lng": 81.3600},
        ],
    },
    {
        "number": "R3",
        "name": "Barabanki – Ramnagar",
        "name_hi": "बाराबंकी – रामनगर",
        "color": "#4A4A4A",
        "stops": [
            {"name": "Barabanki Bus Stand", "name_hi": "बाराबंकी बस स्टैंड", "lat": 26.9260, "lng": 81.1900},
            {"name": "Harakh Block", "name_hi": "हरख ब्लॉक", "lat": 26.9650, "lng": 81.2700},
            {"name": "Suratganj", "name_hi": "सूरतगंज", "lat": 27.0500, "lng": 81.3000},
            {"name": "Fatehpur Kasba", "name_hi": "फतेहपुर कस्बा", "lat": 27.1700, "lng": 81.2200},
            {"name": "Ramnagar Bazaar", "name_hi": "रामनगर बाज़ार", "lat": 27.1850, "lng": 81.2450},
        ],
    },
    {
        "number": "R4",
        "name": "Barabanki – Kursi",
        "name_hi": "बाराबंकी – कुर्सी",
        "color": "#B87503",
        "stops": [
            {"name": "Barabanki Bus Stand", "name_hi": "बाराबंकी बस स्टैंड", "lat": 26.9260, "lng": 81.1900},
            {"name": "Safdarganj", "name_hi": "सफदरगंज", "lat": 26.9500, "lng": 81.1300},
            {"name": "Masauli", "name_hi": "मसौली", "lat": 26.9800, "lng": 81.1200},
            {"name": "Kursi Village", "name_hi": "कुर्सी गाँव", "lat": 27.0200, "lng": 81.0200},
        ],
    },
]


def build_route_doc(number: str, name: str, name_hi: str, color: str, stops_in: List[dict]) -> dict:
    """Builds a route document with stops (ids, dist_along) and a GeoJSON LineString path."""
    rng = random.Random(number)
    stops: List[dict] = []
    coords: List[List[float]] = []  # [lng, lat]
    for i, s in enumerate(stops_in):
        if i > 0:
            prev = stops_in[i - 1]
            # 3 intermediate points with lateral jitter so the path looks like a road
            for k in range(1, 4):
                t = k / 4
                lat = prev["lat"] + (s["lat"] - prev["lat"]) * t + rng.uniform(-0.004, 0.004)
                lng = prev["lng"] + (s["lng"] - prev["lng"]) * t + rng.uniform(-0.004, 0.004)
                coords.append([round(lng, 6), round(lat, 6)])
        coords.append([s["lng"], s["lat"]])
        stops.append({
            "id": str(uuid.uuid4()),
            "name": s["name"],
            "name_hi": s.get("name_hi") or "",
            "lat": s["lat"],
            "lng": s["lng"],
            "path_index": len(coords) - 1,
        })
    # cumulative distance along path
    cum = [0.0]
    for i in range(1, len(coords)):
        cum.append(cum[-1] + haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]))
    for s in stops:
        s["dist_along"] = round(cum[s["path_index"]], 1)
    return {
        "id": str(uuid.uuid4()),
        "number": number,
        "name": name,
        "name_hi": name_hi,
        "color": color,
        "stops": stops,
        "path": {"type": "LineString", "coordinates": coords},
        "length_m": round(cum[-1], 1),
        "path_source": "straight",
        "active": True,
        "created_at": now_iso(),
    }


def apply_road_path(route: dict, coords: List[List[float]], snapped: Optional[List[List[float]]] = None) -> dict:
    """Replace a route's path with real road geometry (e.g. from OSRM). Keeps ids.
    `snapped` = per-stop [lng, lat] road-snapped locations (optional)."""
    cum = [0.0]
    for i in range(1, len(coords)):
        cum.append(cum[-1] + haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]))
    last_idx = 0
    for n, s in enumerate(route["stops"]):
        if snapped and n < len(snapped):
            s["lng"], s["lat"] = snapped[n][0], snapped[n][1]
        # nearest vertex after the previous stop's vertex (keeps order monotonic)
        best_i, best_d = last_idx, float("inf")
        for i in range(last_idx, len(coords)):
            d = haversine(s["lat"], s["lng"], coords[i][1], coords[i][0])
            if d < best_d:
                best_d, best_i = d, i
        if n == len(route["stops"]) - 1:
            best_i = len(coords) - 1
        s["path_index"] = best_i
        s["dist_along"] = round(cum[best_i], 1)
        last_idx = best_i
    route["path"] = {"type": "LineString", "coordinates": coords}
    route["length_m"] = round(cum[-1], 1)
    route["path_source"] = "osrm"
    return route


# ---------------------------------------------------------------------------
# Fares & timetable helpers
# ---------------------------------------------------------------------------
FARE_MIN_INR = 10
FARE_PER_KM_INR = 1.15


def fare_for_km(km: float) -> int:
    raw = km * FARE_PER_KM_INR + 3
    return int(max(FARE_MIN_INR, math.ceil(raw / 5) * 5))


def fmt_hhmm(minutes: float) -> str:
    m = int(round(minutes)) % (24 * 60)
    return f"{m // 60:02d}:{m % 60:02d}"


class BusState:
    def __init__(self, route: dict, dist: float, direction: int):
        self.id = str(uuid.uuid4())
        self.route_id = route["id"]
        self.plate = f"UP41 {fake.random_uppercase_letter()}{fake.random_uppercase_letter()} {fake.random_int(1000, 9999)}"
        self.driver = fake.name()
        self.dist = dist  # metres along path
        self.direction = direction  # +1 forward, -1 backward
        self.speed = DEFAULT_SPEED_MPS * random.uniform(0.85, 1.15)
        self.dwell_until = 0.0
        self.lat = 0.0
        self.lng = 0.0
        self.heading = 0.0
        self.sos: Optional[dict] = None
        self.last_stop_idx: Optional[int] = None


class Engine:
    def __init__(self, speed_factor: float = 3.0):
        self.routes: Dict[str, dict] = {}
        self.cum: Dict[str, List[float]] = {}
        self.buses: Dict[str, BusState] = {}
        self.seg_speed: Dict[str, List[float]] = {}  # learned avg speed per segment (between stops)
        self.speed_factor = speed_factor
        self.db = None
        self.tick_count = 0
        self.listeners: List[asyncio.Queue] = []
        self.sim_time = 0.0

    # ---- setup -----------------------------------------------------------
    def _register_route(self, route: dict):
        coords = route["path"]["coordinates"]
        cum = [0.0]
        for i in range(1, len(coords)):
            cum.append(cum[-1] + haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]))
        self.routes[route["id"]] = route
        self.cum[route["id"]] = cum
        self.seg_speed[route["id"]] = [DEFAULT_SPEED_MPS] * max(1, len(route["stops"]) - 1)

    def add_route(self, route: dict, bus_count: int = 2):
        self._register_route(route)
        length = self.cum[route["id"]][-1]
        for i in range(bus_count):
            bus = BusState(route, dist=length * (i / bus_count), direction=1 if i % 2 == 0 else -1)
            self._place(bus)
            self.buses[bus.id] = bus

    def add_bus(self, route_id: str) -> Optional[BusState]:
        route = self.routes.get(route_id)
        if not route:
            return None
        bus = BusState(route, dist=random.uniform(0, self.cum[route_id][-1]), direction=random.choice([1, -1]))
        self._place(bus)
        self.buses[bus.id] = bus
        return bus

    def remove_route(self, route_id: str):
        self.routes.pop(route_id, None)
        self.cum.pop(route_id, None)
        self.seg_speed.pop(route_id, None)
        for bid in [b for b, s in self.buses.items() if s.route_id == route_id]:
            self.buses.pop(bid, None)

    async def load(self, db, snap_fn=None):
        self.db = db
        routes = await db.routes.find({"active": True}, {"_id": 0}).to_list(200)
        if not routes:
            for r in SEED_ROUTES:
                doc = build_route_doc(r["number"], r["name"], r["name_hi"], r["color"], r["stops"])
                await db.routes.insert_one(dict(doc))
                routes.append(doc)
            logger.info("Seeded %d routes", len(routes))
        for r in routes:
            if snap_fn and r.get("path_source") != "osrm":
                try:
                    coords, snapped = await snap_fn([[s["lng"], s["lat"]] for s in r["stops"]])
                    apply_road_path(r, coords, snapped)
                    await db.routes.update_one({"id": r["id"]}, {"$set": {"path": r["path"], "stops": r["stops"], "length_m": r["length_m"], "path_source": "osrm"}})
                    logger.info("Snapped route %s to roads (%d pts)", r["number"], len(coords))
                except Exception as exc:
                    logger.warning("OSRM snap failed for %s: %s", r["number"], exc)
            self.add_route(r, bus_count=3 if len(r["stops"]) >= 5 else 2)
        logger.info("Engine loaded %d routes, %d buses", len(self.routes), len(self.buses))

    # ---- geometry ---------------------------------------------------------
    def _place(self, bus: BusState):
        coords = self.routes[bus.route_id]["path"]["coordinates"]
        cum = self.cum[bus.route_id]
        d = max(0.0, min(bus.dist, cum[-1]))
        i = 0
        while i < len(cum) - 2 and cum[i + 1] < d:
            i += 1
        seg = cum[i + 1] - cum[i]
        t = 0.0 if seg == 0 else (d - cum[i]) / seg
        (lng1, lat1), (lng2, lat2) = coords[i], coords[i + 1]
        bus.lat = lat1 + (lat2 - lat1) * t
        bus.lng = lng1 + (lng2 - lng1) * t
        hb = bearing(lat1, lng1, lat2, lng2)
        bus.heading = hb if bus.direction == 1 else (hb + 180) % 360

    def _segment_index(self, route_id: str, dist: float) -> int:
        stops = self.routes[route_id]["stops"]
        for i in range(len(stops) - 1):
            if stops[i]["dist_along"] <= dist <= stops[i + 1]["dist_along"]:
                return i
        return max(0, len(stops) - 2)

    # ---- simulation -------------------------------------------------------
    def tick(self, dt: float):
        self.tick_count += 1
        self.sim_time += dt * self.speed_factor
        for bus in self.buses.values():
            route = self.routes.get(bus.route_id)
            if not route:
                continue
            if self.sim_time < bus.dwell_until:
                continue
            length = self.cum[bus.route_id][-1]
            # small speed variation to feel realistic
            bus.speed = max(4.0, min(16.0, bus.speed + random.uniform(-0.4, 0.4)))
            step = bus.speed * dt * self.speed_factor
            prev = bus.dist
            bus.dist += step * bus.direction
            # learn segment speed (EMA)
            seg = self._segment_index(bus.route_id, prev)
            ss = self.seg_speed[bus.route_id]
            ss[seg] = ss[seg] * 0.95 + bus.speed * 0.05
            # arrived at a stop? -> dwell
            for idx, s in enumerate(route["stops"]):
                crossed = (prev < s["dist_along"] <= bus.dist) if bus.direction == 1 else (bus.dist <= s["dist_along"] < prev)
                if crossed and bus.last_stop_idx != idx:
                    bus.dist = s["dist_along"]
                    bus.last_stop_idx = idx
                    bus.dwell_until = self.sim_time + DWELL_SECONDS
                    break
            if bus.dist >= length:
                bus.dist = length
                bus.direction = -1
                bus.dwell_until = self.sim_time + DWELL_SECONDS * 2
            elif bus.dist <= 0:
                bus.dist = 0
                bus.direction = 1
                bus.dwell_until = self.sim_time + DWELL_SECONDS * 2
            self._place(bus)

    # ---- ETA -------------------------------------------------------------
    def stops_ahead(self, bus: BusState) -> List[dict]:
        """Stops ahead of the bus in travel direction with eta_s (uses learned segment speeds)."""
        route = self.routes[bus.route_id]
        stops = route["stops"]
        ss = self.seg_speed[bus.route_id]
        ahead = [s for s in stops if (s["dist_along"] > bus.dist + 1 if bus.direction == 1 else s["dist_along"] < bus.dist - 1)]
        if bus.direction == -1:
            ahead = list(reversed(ahead))
        out = []
        pos = bus.dist
        eta = max(0.0, bus.dwell_until - self.sim_time)
        for n, s in enumerate(ahead):
            seg_i = self._segment_index(bus.route_id, (pos + s["dist_along"]) / 2)
            spd = max(2.0, ss[seg_i])
            eta += abs(s["dist_along"] - pos) / spd
            if n > 0:
                eta += DWELL_SECONDS
            pos = s["dist_along"]
            out.append({"stop_id": s["id"], "name": s["name"], "name_hi": s["name_hi"], "eta_s": int(eta / self.speed_factor * self.speed_factor)})
        return out

    def bus_dict(self, bus: BusState, with_etas: bool = False) -> dict:
        route = self.routes[bus.route_id]
        ahead = self.stops_ahead(bus)
        d = {
            "id": bus.id,
            "route_id": bus.route_id,
            "route_number": route["number"],
            "route_name": route["name"],
            "route_name_hi": route["name_hi"],
            "color": route["color"],
            "plate": bus.plate,
            "driver": bus.driver,
            "lat": round(bus.lat, 6),
            "lng": round(bus.lng, 6),
            "heading": round(bus.heading),
            "speed_kmph": round(bus.speed * 3.6),
            "direction": bus.direction,
            "dist_along": round(bus.dist),
            "dwelling": self.sim_time < bus.dwell_until,
            "next_stop": ahead[0] if ahead else None,
            "terminus": (route["stops"][-1] if bus.direction == 1 else route["stops"][0])["name"],
            "terminus_hi": (route["stops"][-1] if bus.direction == 1 else route["stops"][0])["name_hi"],
            "sos": bus.sos,
        }
        if with_etas:
            d["etas"] = ahead
        return d

    def snapshot(self) -> dict:
        return {
            "ts": now_iso(),
            "buses": [self.bus_dict(b) for b in self.buses.values() if b.route_id in self.routes],
            "bunching": self.bunching(),
        }

    def route_etas(self, route_id: str) -> dict:
        """Per-stop best ETA and per-bus ETAs for a route."""
        route = self.routes.get(route_id)
        if not route:
            return {"stops": [], "buses": []}
        buses = [self.bus_dict(b, with_etas=True) for b in self.buses.values() if b.route_id == route_id]
        stops_out = []
        for s in route["stops"]:
            best = None
            for b in buses:
                for e in b["etas"]:
                    if e["stop_id"] == s["id"] and (best is None or e["eta_s"] < best["eta_s"]):
                        best = {"eta_s": e["eta_s"], "bus_id": b["id"], "plate": b["plate"], "terminus": b["terminus"], "terminus_hi": b["terminus_hi"]}
            stops_out.append({**s, "best": best})
        return {"stops": stops_out, "buses": buses}

    # ---- analytics -------------------------------------------------------
    def bunching(self, threshold_s: float = 60.0) -> List[dict]:
        warnings = []
        by_route: Dict[str, List[BusState]] = {}
        for b in self.buses.values():
            if b.route_id in self.routes:
                by_route.setdefault(b.route_id, []).append(b)
        for rid, blist in by_route.items():
            avg_speed = max(2.0, sum(self.seg_speed[rid]) / len(self.seg_speed[rid]))
            for i in range(len(blist)):
                for j in range(i + 1, len(blist)):
                    a, b = blist[i], blist[j]
                    if a.direction != b.direction:
                        continue
                    gap_s = abs(a.dist - b.dist) / avg_speed
                    if gap_s <= threshold_s:
                        r = self.routes[rid]
                        warnings.append({
                            "route_id": rid,
                            "route_number": r["number"],
                            "route_name": r["name"],
                            "bus_a": a.plate,
                            "bus_b": b.plate,
                            "bus_a_id": a.id,
                            "bus_b_id": b.id,
                            "gap_s": int(gap_s),
                            "lat": round((a.lat + b.lat) / 2, 6),
                            "lng": round((a.lng + b.lng) / 2, 6),
                        })
        return warnings

    def nearest_stop(self, lat: float, lng: float) -> Optional[dict]:
        best = None
        for r in self.routes.values():
            for s in r["stops"]:
                d = haversine(lat, lng, s["lat"], s["lng"])
                if best is None or d < best["distance_m"]:
                    best = {**s, "route_id": r["id"], "route_number": r["number"], "route_name": r["name"], "route_name_hi": r["name_hi"], "distance_m": round(d)}
        return best

    def find_stop(self, stop_id: str):
        for r in self.routes.values():
            for s in r["stops"]:
                if s["id"] == stop_id:
                    return r, s
        return None, None

    def stop_arrivals(self, stop_id: str) -> Optional[dict]:
        """A stop plus the best ETA of every route serving a stop with the same name."""
        route, stop = self.find_stop(stop_id)
        if not stop:
            return None
        arrivals = []
        for r in self.routes.values():
            for s in r["stops"]:
                if s["name"].lower() == stop["name"].lower():
                    etas = self.route_etas(r["id"])
                    best = next((x["best"] for x in etas["stops"] if x["id"] == s["id"]), None)
                    arrivals.append({"route_id": r["id"], "route_number": r["number"], "route_name": r["name"], "route_name_hi": r["name_hi"], "color": r["color"], "stop_id": s["id"], "best": best})
        arrivals.sort(key=lambda a: a["best"]["eta_s"] if a["best"] else 10**9)
        return {**stop, "route_id": route["id"], "route_number": route["number"], "arrivals": arrivals}

    def segment_travel_s(self, route_id: str, d_from: float, d_to: float) -> float:
        """Travel time between two distances along a route using learned segment speeds."""
        ss = self.seg_speed[route_id]
        stops = self.routes[route_id]["stops"]
        lo, hi = min(d_from, d_to), max(d_from, d_to)
        total = 0.0
        for i in range(len(stops) - 1):
            a, b = stops[i]["dist_along"], stops[i + 1]["dist_along"]
            overlap = max(0.0, min(hi, b) - max(lo, a))
            if overlap > 0:
                total += overlap / max(2.0, ss[i])
        return total

    def fare_between(self, route_id: str, from_id: str, to_id: str) -> Optional[dict]:
        route = self.routes.get(route_id)
        if not route:
            return None
        stops = route["stops"]
        fi = next((i for i, s in enumerate(stops) if s["id"] == from_id), None)
        ti = next((i for i, s in enumerate(stops) if s["id"] == to_id), None)
        if fi is None or ti is None or fi == ti:
            return None
        lo, hi = min(fi, ti), max(fi, ti)
        via = stops[lo + 1:hi]
        dist_m = abs(stops[ti]["dist_along"] - stops[fi]["dist_along"])
        travel = self.segment_travel_s(route_id, stops[fi]["dist_along"], stops[ti]["dist_along"]) + DWELL_SECONDS * len(via)
        # per-stop cumulative times from origin of this trip
        order = stops[fi:ti + 1] if fi < ti else list(reversed(stops[ti:fi + 1]))
        legs = []
        acc = 0.0
        for k in range(1, len(order)):
            leg = self.segment_travel_s(route_id, order[k - 1]["dist_along"], order[k]["dist_along"]) + (DWELL_SECONDS if k > 1 else 0)
            acc += leg
            legs.append({"stop_id": order[k]["id"], "name": order[k]["name"], "name_hi": order[k]["name_hi"], "eta_from_start_s": int(acc),
                         "distance_km": round(abs(order[k]["dist_along"] - order[0]["dist_along"]) / 1000, 1),
                         "fare_inr": fare_for_km(abs(order[k]["dist_along"] - order[0]["dist_along"]) / 1000)})
        return {
            "route_id": route_id, "route_number": route["number"], "from": stops[fi], "to": stops[ti],
            "distance_km": round(dist_m / 1000, 1), "fare_inr": fare_for_km(dist_m / 1000), "travel_s": int(travel),
            "via": [{"id": s["id"], "name": s["name"], "name_hi": s["name_hi"]} for s in via], "legs": legs,
            "direction": 1 if fi < ti else -1,
        }

    def timetable(self, route_id: str, first_min: int = 6 * 60, last_min: int = 20 * 60) -> Optional[dict]:
        """Printed-style schedule: fixed headway derived from fleet size and route length."""
        route = self.routes.get(route_id)
        if not route:
            return None
        stops = route["stops"]
        n_buses = max(1, sum(1 for b in self.buses.values() if b.route_id == route_id))
        one_way_s = route["length_m"] / DEFAULT_SPEED_MPS + DWELL_SECONDS * max(0, len(stops) - 2)
        headway = round((2 * one_way_s + 2 * DWELL_SECONDS) / n_buses / 60 / 5) * 5
        headway = int(min(120, max(20, headway)))
        # cumulative minutes from origin to each stop (forward)
        offsets = [0.0]
        for i in range(1, len(stops)):
            leg = (stops[i]["dist_along"] - stops[i - 1]["dist_along"]) / DEFAULT_SPEED_MPS + (DWELL_SECONDS if i > 1 else 0)
            offsets.append(offsets[-1] + leg / 60)
        back_offsets = [0.0]
        for i in range(len(stops) - 2, -1, -1):
            leg = (stops[i + 1]["dist_along"] - stops[i]["dist_along"]) / DEFAULT_SPEED_MPS + (DWELL_SECONDS if i < len(stops) - 2 else 0)
            back_offsets.append(back_offsets[-1] + leg / 60)

        def trips(offs, start_shift):
            out, dep, n = [], first_min + start_shift, 1
            while dep <= last_min:
                out.append({"trip": n, "times": [fmt_hhmm(dep + o) for o in offs]})
                dep += headway
                n += 1
            return out

        return {
            "route_id": route_id, "headway_min": headway, "first": fmt_hhmm(first_min), "last": fmt_hhmm(last_min),
            "one_way_min": int(round(offsets[-1])),
            "forward": {"from": stops[0]["name"], "from_hi": stops[0]["name_hi"], "to": stops[-1]["name"], "to_hi": stops[-1]["name_hi"],
                        "stops": [{"id": s["id"], "name": s["name"], "name_hi": s["name_hi"]} for s in stops], "trips": trips(offsets, 0)},
            "backward": {"from": stops[-1]["name"], "from_hi": stops[-1]["name_hi"], "to": stops[0]["name"], "to_hi": stops[0]["name_hi"],
                         "stops": [{"id": s["id"], "name": s["name"], "name_hi": s["name_hi"]} for s in reversed(stops)], "trips": trips(back_offsets, headway // 2)},
            "fares_from_origin": [{"id": s["id"], "name": s["name"], "fare_inr": fare_for_km(s["dist_along"] / 1000) if i else 0} for i, s in enumerate(stops)],
        }

    def stops_between(self, a: dict, b: dict, corridor_km: float = 3.0) -> List[dict]:
        """Existing stops lying in the corridor between two points, ordered along the way."""
        ax, ay, bx, by = a["lng"], a["lat"], b["lng"], b["lat"]
        dx, dy = bx - ax, by - ay
        seen = {}
        for r in self.routes.values():
            for s in r["stops"]:
                if s["name"].lower() in seen:
                    continue
                t = ((s["lng"] - ax) * dx + (s["lat"] - ay) * dy) / max(1e-9, dx * dx + dy * dy)
                if not 0.05 < t < 0.95:
                    continue
                px, py = ax + t * dx, ay + t * dy
                d = haversine(s["lat"], s["lng"], py, px)
                if d <= corridor_km * 1000:
                    seen[s["name"].lower()] = {"name": s["name"], "name_hi": s["name_hi"], "lat": s["lat"], "lng": s["lng"], "t": t, "offset_m": round(d)}
        return sorted(seen.values(), key=lambda x: x["t"])

    # ---- realtime loop ---------------------------------------------------
    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=5)
        self.listeners.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.listeners:
            self.listeners.remove(q)

    async def run(self, interval: float = 2.0):
        logger.info("Simulation loop started (factor x%s)", self.speed_factor)
        while True:
            try:
                self.tick(interval)
                snap = self.snapshot()
                for q in list(self.listeners):
                    if q.full():
                        try:
                            q.get_nowait()
                        except asyncio.QueueEmpty:
                            pass
                    q.put_nowait(snap)
                if self.db is not None and self.tick_count % 2 == 0 and snap["buses"]:
                    ts = datetime.now(timezone.utc)
                    docs = [{
                        "bus_id": b["id"], "route_id": b["route_id"], "plate": b["plate"],
                        "lat": b["lat"], "lng": b["lng"], "heading": b["heading"],
                        "speed_kmph": b["speed_kmph"], "sos": bool(b["sos"]), "ts": ts,
                    } for b in snap["buses"]]
                    await self.db.positions.insert_many(docs)
            except Exception as exc:  # keep the loop alive
                logger.exception("sim tick failed: %s", exc)
            await asyncio.sleep(interval)
