import asyncio
import hashlib
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, List, Optional
import uuid

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

import auth
from sim import Engine, apply_road_path, build_route_doc, haversine

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("routy")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
try:
    import socket
    s = socket.socket()
    s.settimeout(0.5)
    s.connect(("127.0.0.1", 27017))
    s.close()
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get("DB_NAME", "test_database")]
    logger.info("[Database] Connected to MongoDB at %s", mongo_url)
except Exception:
    from mongomock_motor import AsyncMongoMockClient
    logger.info("[Database] Notice: Local MongoDB not detected. Activating integrated in-memory MongoDB fallback.")
    client = AsyncMongoMockClient()
    db = client[os.environ.get("DB_NAME", "test_database")]

engine = Engine(speed_factor=float(os.getenv("SIM_SPEED_FACTOR", "3")))

OSRM_URL = os.getenv("OSRM_URL", "https://router.project-osrm.org")


async def osrm_snap(points: List[List[float]]):
    """Real road geometry between ordered [lng, lat] points via OSRM (free, key-less)."""
    coord_str = ";".join(f"{p[0]},{p[1]}" for p in points)
    async with httpx.AsyncClient(timeout=20) as http:
        resp = await http.get(f"{OSRM_URL}/route/v1/driving/{coord_str}", params={"overview": "full", "geometries": "geojson"})
    data = resp.json()
    if resp.status_code != 200 or data.get("code") != "Ok":
        raise RuntimeError(f"OSRM: {data.get('code')}")
    coords = [[round(c[0], 6), round(c[1], 6)] for c in data["routes"][0]["geometry"]["coordinates"]]
    snapped = [[round(w["location"][0], 6), round(w["location"][1], 6)] for w in data.get("waypoints", [])]
    return coords, snapped


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = db
    await auth.seed_admin(db)
    await db.positions.create_index("ts", expireAfterSeconds=6 * 3600)
    await db.positions.create_index([("bus_id", 1), ("ts", 1)])
    await db.translations.create_index("key", unique=True)
    await db.demand.create_index("created_at")
    await engine.load(db, snap_fn=osrm_snap)
    task = asyncio.create_task(engine.run(2.0))
    yield
    task.cancel()
    client.close()


app = FastAPI(title="RoutY API", lifespan=lifespan)
api = APIRouter(prefix="/api")


# ------------------------------------------------------------------ models
class StopIn(BaseModel):
    name: str
    name_hi: str = ""
    lat: float
    lng: float


class RouteIn(BaseModel):
    number: str
    name: str
    name_hi: str = ""
    color: str = "#C04A00"
    stops: List[StopIn] = Field(min_length=2)
    bus_count: int = 2
    origin: Optional[str] = None
    destination: Optional[str] = None
    path_coordinates: Optional[List[List[float]]] = None
    path: Optional[dict] = None


class RouteUpdate(BaseModel):
    number: Optional[str] = None
    name: Optional[str] = None
    name_hi: Optional[str] = None
    color: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None


class BusCreateIn(BaseModel):
    route_id: str
    plate: Optional[str] = None
    driver: Optional[str] = None
    status: str = "in_service"
    schedule: Optional[str] = None


class BusUpdateIn(BaseModel):
    plate: Optional[str] = None
    driver: Optional[str] = None
    status: Optional[str] = None
    schedule: Optional[str] = None
    occupancy: Optional[str] = None
    route_id: Optional[str] = None


class SearchIn(BaseModel):
    from_text: str
    to_text: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class SosIn(BaseModel):
    bus_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    message: str = "Emergency reported by commuter"
    reporter: str = "commuter"


class TranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    source: str = "en"
    target: str = "hi"


class SuggestionIn(BaseModel):
    from_text: str = Field(min_length=1, max_length=120)
    to_text: str = Field(min_length=1, max_length=120)
    village: str = ""
    notes: str = Field(default="", max_length=500)
    contact: str = Field(default="", max_length=80)
    lat: Optional[float] = None
    lng: Optional[float] = None


class SuggestionStatus(BaseModel):
    status: str = Field(pattern="^(new|reviewed|approved|rejected)$")


class PointIn(BaseModel):
    lat: float
    lng: float


class FindStopsIn(BaseModel):
    from_point: PointIn
    to_point: PointIn
    corridor_km: float = 3.0


class DriverIn(BaseModel):
    name: str
    phone: str
    conductor_name: Optional[str] = ""
    conductor_phone: Optional[str] = ""
    depot_address: Optional[str] = ""
    route_id: Optional[str] = None
    bus_id: Optional[str] = None
    badge_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = "on_duty"


class DriverUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    conductor_name: Optional[str] = None
    conductor_phone: Optional[str] = None
    depot_address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = None
    route_id: Optional[str] = None
    bus_id: Optional[str] = None


class ConvertSuggestionIn(BaseModel):
    route_number: Optional[str] = None
    color: Optional[str] = "#C04A00"
    bus_count: int = 2
    state: Optional[str] = None
    city: Optional[str] = None


# ------------------------------------------------------------------ public
@api.get("/")
async def root():
    return {"app": "RoutY", "status": "ok", "buses": len(engine.buses), "routes": len(engine.routes)}


@api.get("/states")
async def list_states():
    routes = await db.routes.find({"active": True}, {"_id": 0}).to_list(500)
    states_dict = {}
    for r in routes:
        st = r.get("state") or "National / Inter-City"
        if st not in states_dict:
            states_dict[st] = {"state": st, "cities": set(), "route_count": 0, "bus_count": 0}
        if r.get("city"):
            states_dict[st]["cities"].add(r["city"])
        states_dict[st]["route_count"] += 1
        states_dict[st]["bus_count"] += sum(1 for b in engine.buses.values() if b.route_id == r.get("id"))
        if "sample_lat" not in states_dict[st] and r.get("stops") and len(r["stops"]) > 0:
            states_dict[st]["sample_lat"] = r["stops"][0]["lat"]
            states_dict[st]["sample_lng"] = r["stops"][0]["lng"]

    result = []
    for st, data in states_dict.items():
        result.append({
            "state": st,
            "cities": sorted(list(data["cities"])),
            "route_count": data["route_count"],
            "bus_count": data["bus_count"],
            "sample_lat": data.get("sample_lat"),
            "sample_lng": data.get("sample_lng"),
        })
    return sorted(result, key=lambda x: x["state"])


@api.get("/routes")
async def list_routes(state: Optional[str] = None):
    query = {"active": True}
    if state and state.strip() and state.lower() != "all":
        query["state"] = {"$regex": f"^{state.strip()}$", "$options": "i"}
    routes = await db.routes.find(query, {"_id": 0}).to_list(500)
    counts = {}
    for b in engine.buses.values():
        counts[b.route_id] = counts.get(b.route_id, 0) + 1
    for r in routes:
        r["bus_count"] = counts.get(r["id"], 0)
    return routes


@api.get("/routes/{route_id}")
async def get_route(route_id: str):
    route = await db.routes.find_one({"id": route_id, "active": True}, {"_id": 0})
    if not route:
        raise HTTPException(404, "Route not found")
    return {**route, **engine.route_etas(route_id), "bunching": [w for w in engine.bunching() if w["route_id"] == route_id]}


@api.get("/routes/{route_id}/timetable")
async def route_timetable(route_id: str):
    tt = engine.timetable(route_id)
    if not tt:
        raise HTTPException(404, "Route not found")
    return tt


@api.get("/routes/{route_id}/fare")
async def route_fare(route_id: str, from_stop: str, to_stop: str):
    out = engine.fare_between(route_id, from_stop, to_stop)
    if not out:
        raise HTTPException(404, "Stops not found on route")
    return out


@api.get("/stops/nearest")
async def nearest_stop(lat: float, lng: float):
    stop = engine.nearest_stop(lat, lng)
    if not stop:
        raise HTTPException(404, "No stops")
    etas = engine.route_etas(stop["route_id"])
    best = next((s["best"] for s in etas["stops"] if s["id"] == stop["id"]), None)
    return {**stop, "best": best}


@api.get("/stops/{stop_id}")
async def stop_arrivals(stop_id: str):
    out = engine.stop_arrivals(stop_id)
    if not out:
        raise HTTPException(404, "Stop not found")
    return out


@api.post("/suggestions")
async def create_suggestion(body: SuggestionIn):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "status": "new", "created_at": now_iso()}
    await db.suggestions.insert_one(dict(doc))
    return doc


@api.get("/live")
async def live(state: Optional[str] = None, lat: Optional[float] = None, lng: Optional[float] = None, radius_km: Optional[float] = None):
    return engine.snapshot(state=state, lat=lat, lng=lng, radius_km=radius_km)


@api.get("/buses/nearby")
async def nearby_buses(lat: float, lng: float, radius_km: float = 50.0, limit: int = 10):
    return engine.nearby_buses(lat=lat, lng=lng, radius_km=radius_km, limit=limit)


@api.get("/buses/{bus_id}")
async def get_bus(bus_id: str):
    bus = engine.buses.get(bus_id)
    if not bus:
        raise HTTPException(404, "Bus not found")
    return engine.bus_dict(bus, with_etas=True)


@api.post("/buses/{bus_id}/opt-in")
async def bus_opt_in(bus_id: str):
    res = engine.opt_in_passenger(bus_id)
    if not res:
        raise HTTPException(404, "Bus not found")
    return res


@api.post("/buses/{bus_id}/opt-out")
async def bus_opt_out(bus_id: str):
    res = engine.opt_out_passenger(bus_id)
    if not res:
        raise HTTPException(404, "Bus not found")
    return res


@api.post("/search")
async def search_routes(body: SearchIn):
    f, t = body.from_text.strip().lower(), body.to_text.strip().lower()
    if not f or not t:
        raise HTTPException(400, "Both from and to are required")
    routes = await db.routes.find({"active": True}, {"_id": 0}).to_list(200)

    def match(stop, q):
        return q in stop["name"].lower() or (stop.get("name_hi") and q in stop["name_hi"])

    results = []
    for r in routes:
        fi = [i for i, s in enumerate(r["stops"]) if match(s, f)]
        ti = [i for i, s in enumerate(r["stops"]) if match(s, t)]
        if fi and ti:
            fare = engine.fare_between(r["id"], r["stops"][fi[0]]["id"], r["stops"][ti[0]]["id"]) or {}
            results.append({"id": r["id"], "number": r["number"], "name": r["name"], "name_hi": r["name_hi"], "color": r["color"],
                            "from_stop": r["stops"][fi[0]], "to_stop": r["stops"][ti[0]], "stops_between": abs(ti[0] - fi[0]),
                            "fare_inr": fare.get("fare_inr"), "distance_km": fare.get("distance_km"), "travel_s": fare.get("travel_s"),
                            "via": fare.get("via", []), "legs": fare.get("legs", [])})
    if not results:
        # silently log unserved demand for transit planners
        from_stop = next((s for r in routes for s in r["stops"] if match(s, f)), None)
        to_stop = next((s for r in routes for s in r["stops"] if match(s, t)), None)
        lat = (from_stop or {}).get("lat", body.lat)
        lng = (from_stop or {}).get("lng", body.lng)
        await db.demand.insert_one({
            "id": str(uuid.uuid4()), "from_text": body.from_text.strip(), "to_text": body.to_text.strip(),
            "from_lat": lat, "from_lng": lng, "to_lat": (to_stop or {}).get("lat"), "to_lng": (to_stop or {}).get("lng"),
            "created_at": now_iso(),
        })
    return {"results": results, "unserved": len(results) == 0}


@api.get("/search/unified")
async def unified_search(q: str = ""):
    query = q.strip().lower()
    all_buses = [engine.bus_dict(b, with_etas=True) for b in engine.buses.values() if b.route_id in engine.routes]
    routes_list = await db.routes.find({"active": True}, {"_id": 0}).to_list(200)

    # If query is empty, return popular suggestions
    if not query:
        suggested_routes = routes_list[:4]
        suggested_stops = []
        seen = set()
        for r in routes_list:
            for s in r.get("stops", [])[:2]:
                if s["name"] not in seen:
                    seen.add(s["name"])
                    suggested_stops.append({**s, "route_id": r["id"], "route_number": r["number"], "route_color": r["color"]})
        return {
            "query": "",
            "routes": suggested_routes,
            "buses": all_buses[:4],
            "stops": suggested_stops[:6],
            "total": len(suggested_routes) + len(all_buses[:4]) + len(suggested_stops[:6]),
            "is_suggestion": True,
        }

    # Match routes
    matched_routes = []
    for r in routes_list:
        if (query in r["number"].lower() or
            query in r["name"].lower() or
            (r.get("name_hi") and query in r["name_hi"].lower()) or
            query in r.get("origin", "").lower() or
            query in r.get("destination", "").lower()):
            bus_count = sum(1 for b in all_buses if b["route_id"] == r["id"])
            matched_routes.append({**r, "bus_count": bus_count})

    # Match buses
    matched_buses = []
    for b in all_buses:
        if (query in b["plate"].lower() or
            query in b["route_number"].lower() or
            query in b["driver"].lower() or
            query in b["route_name"].lower() or
            (b.get("terminus") and query in b["terminus"].lower()) or
            (b.get("terminus_hi") and query in b["terminus_hi"].lower())):
            matched_buses.append(b)

    # Match stops
    matched_stops = []
    seen_stops = set()
    for r in routes_list:
        for s in r.get("stops", []):
            name_en = s["name"].lower()
            name_hi = (s.get("name_hi") or "").lower()
            if query in name_en or query in name_hi:
                if s["name"] not in seen_stops:
                    seen_stops.add(s["name"])
                    approaching = []
                    for b in all_buses:
                        if b["route_id"] == r["id"] and b.get("etas"):
                            eta_item = next((e for e in b["etas"] if e["stop_id"] == s["id"]), None)
                            if eta_item:
                                approaching.append({
                                    "bus_id": b["id"],
                                    "plate": b["plate"],
                                    "route_number": b["route_number"],
                                    "eta_s": eta_item["eta_s"],
                                })
                    approaching.sort(key=lambda x: x["eta_s"])
                    matched_stops.append({
                        "id": s["id"],
                        "name": s["name"],
                        "name_hi": s.get("name_hi", ""),
                        "lat": s["lat"],
                        "lng": s["lng"],
                        "route_id": r["id"],
                        "route_number": r["number"],
                        "route_name": r["name"],
                        "color": r["color"],
                        "best_eta": approaching[0] if approaching else None,
                    })

    total = len(matched_routes) + len(matched_buses) + len(matched_stops)
    return {
        "query": q,
        "routes": matched_routes,
        "buses": matched_buses,
        "stops": matched_stops,
        "total": total,
        "is_suggestion": False,
    }


@api.post("/sos")
async def create_sos(body: SosIn):
    bus = engine.buses.get(body.bus_id) if body.bus_id else None
    if not bus and body.lat is not None and body.lng is not None:
        bus = min(engine.buses.values(), key=lambda b: haversine(body.lat, body.lng, b.lat, b.lng), default=None)
    doc = {
        "id": str(uuid.uuid4()), "bus_id": bus.id if bus else None, "plate": bus.plate if bus else None,
        "route_number": engine.routes[bus.route_id]["number"] if bus else None,
        "bus_lat": bus.lat if bus else None, "bus_lng": bus.lng if bus else None,
        "user_lat": body.lat, "user_lng": body.lng, "message": body.message, "reporter": body.reporter,
        "status": "active", "created_at": now_iso(), "resolved_at": None,
    }
    await db.sos.insert_one(dict(doc))
    if bus:
        bus.sos = {"id": doc["id"], "message": body.message, "created_at": doc["created_at"]}
    return doc


# ------------------------------------------------------------ translation
MYMEMORY_URL = "https://api.mymemory.translated.net/get"


def _cache_key(text: str, source: str, target: str) -> str:
    return hashlib.sha256(f"v1|{source}|{target}|{text}".encode()).hexdigest()


async def translate_text(text: str, source: str, target: str) -> dict:
    if source == target:
        return {"translated_text": text, "cached": True}
    key = _cache_key(text, source, target)
    hit = await db.translations.find_one({"key": key}, {"_id": 0})
    if hit:
        return {"translated_text": hit["translated_text"], "cached": True}
    params = {"q": text, "langpair": f"{source}|{target}"}
    email = os.getenv("MYMEMORY_EMAIL")
    if email:
        params["de"] = email
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(MYMEMORY_URL, params=params)
        data = resp.json()
    except Exception as exc:
        logger.warning("translate failed: %s", exc)
        raise HTTPException(502, "Translation provider unavailable")
    if resp.status_code != 200 or str(data.get("responseStatus")) != "200":
        raise HTTPException(502, "Translation provider unavailable")
    translated = data["responseData"]["translatedText"]
    await db.translations.update_one(
        {"key": key},
        {"$set": {"key": key, "text": text, "source": source, "target": target, "translated_text": translated, "created_at": now_iso()}},
        upsert=True,
    )
    return {"translated_text": translated, "cached": False}


@api.post("/translate")
async def translate(body: TranslateIn):
    if body.source not in ("en", "hi") or body.target not in ("en", "hi"):
        raise HTTPException(400, "Only en and hi supported")
    out = await translate_text(body.text, body.source, body.target)
    return {**out, "source": body.source, "target": body.target}


# --------------------------------------------------------------- websocket
@api.websocket("/ws/live")
async def ws_live(ws: WebSocket):
    await ws.accept()
    q = engine.subscribe()
    try:
        await ws.send_json(engine.snapshot())
        while True:
            snap = await q.get()
            await ws.send_json(snap)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        engine.unsubscribe(q)


# ------------------------------------------------------------------- admin
AdminDep = Annotated[auth.PublicAdmin, Depends(auth.current_admin)]


@api.post("/admin/login", response_model=auth.Token)
async def admin_login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await auth.authenticate(db, form.username, form.password)
    if not user:
        raise HTTPException(401, "Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    return auth.Token(access_token=auth.create_access_token(user["username"]))


@api.get("/admin/me", response_model=auth.PublicAdmin)
async def admin_me(admin: AdminDep):
    return admin


@api.get("/admin/overview")
async def admin_overview(admin: AdminDep):
    snap = engine.snapshot()
    active_sos = await db.sos.find({"status": "active"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    demand_count = await db.demand.count_documents({})
    suggestions_new = await db.suggestions.count_documents({"status": "new"})
    unique_stops = set()
    for r in engine.routes.values():
        for s in r.get("stops", []):
            unique_stops.add(s["name"].lower())
    active_trips = sum(1 for b in snap["buses"] if b.get("speed_kmph", 0) > 0 and b.get("status") != "maintenance")
    service_status = "100% Operational" if len(active_sos) == 0 and len(snap["bunching"]) == 0 else ("Attention Required" if len(active_sos) > 0 else "Minor Delays")
    return {
        "routes": len(engine.routes), "buses": len(snap["buses"]),
        "total_stops": len(unique_stops), "active_trips": active_trips, "service_status": service_status,
        "sos_active": len(active_sos), "bunching": snap["bunching"], "sos": active_sos,
        "demand_count": demand_count, "suggestions_new": suggestions_new,
        "live": snap["buses"], "ts": snap["ts"],
    }


@api.get("/admin/sos")
async def admin_sos(admin: AdminDep):
    return await db.sos.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.post("/admin/sos/{sos_id}/resolve")
async def admin_resolve_sos(sos_id: str, admin: AdminDep):
    doc = await db.sos.find_one({"id": sos_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "SOS not found")
    await db.sos.update_one({"id": sos_id}, {"$set": {"status": "resolved", "resolved_at": now_iso()}})
    bus = engine.buses.get(doc.get("bus_id") or "")
    if bus and bus.sos and bus.sos.get("id") == sos_id:
        bus.sos = None
    return {"ok": True}


@api.post("/admin/routes")
async def admin_create_route(body: RouteIn, admin: AdminDep):
    doc = build_route_doc(body.number, body.name, body.name_hi or body.name, body.color, [s.model_dump() for s in body.stops])
    if body.origin:
        doc["origin"] = body.origin
    if body.destination:
        doc["destination"] = body.destination
    if body.path and body.path.get("coordinates"):
        apply_road_path(doc, body.path["coordinates"])
    elif body.path_coordinates:
        apply_road_path(doc, body.path_coordinates)
    else:
        try:
            coords, snapped = await osrm_snap([[s.lng, s.lat] for s in body.stops])
            apply_road_path(doc, coords, snapped)
        except Exception as exc:
            logger.warning("OSRM snap failed for new route: %s", exc)
    await db.routes.insert_one(dict(doc))
    engine.add_route(doc, bus_count=max(1, min(body.bus_count, 5)))
    return doc


@api.post("/admin/routes/find-stops")
async def admin_find_stops(body: FindStopsIn, admin: AdminDep):
    return {"stops": engine.stops_between(body.from_point.model_dump(), body.to_point.model_dump(), body.corridor_km)}


@api.get("/admin/suggestions")
async def admin_suggestions(admin: AdminDep):
    return await db.suggestions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/admin/suggestions/{sid}/status")
async def admin_suggestion_status(sid: str, body: SuggestionStatus, admin: AdminDep):
    res = await db.suggestions.update_one({"id": sid}, {"$set": {"status": body.status, "updated_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Suggestion not found")
    return {"ok": True}


@api.post("/admin/suggestions/{sid}/convert-to-route")
async def admin_convert_suggestion(sid: str, body: ConvertSuggestionIn, admin: AdminDep):
    sug = await db.suggestions.find_one({"id": sid}, {"_id": 0})
    if not sug:
        raise HTTPException(404, "Suggestion not found")

    from_name = sug.get("from_text", "Origin")
    to_name = sug.get("to_text", "Destination")
    f_lat = float(sug.get("lat") or 28.6139)
    f_lng = float(sug.get("lng") or 77.2090)
    t_lat = round(f_lat + 0.045, 4)
    t_lng = round(f_lng + 0.045, 4)
    mid_lat = round((f_lat + t_lat) / 2, 4)
    mid_lng = round((f_lng + t_lng) / 2, 4)

    number = body.route_number or f"R-{random.randint(100, 999)}"
    stops = [
        {"name": from_name, "name_hi": "", "lat": f_lat, "lng": f_lng},
        {"name": f"{from_name} Junction", "name_hi": "", "lat": mid_lat, "lng": mid_lng},
        {"name": to_name, "name_hi": "", "lat": t_lat, "lng": t_lng},
    ]

    state = body.state or "Delhi"
    city = body.city or from_name
    doc = build_route_doc(number, f"{from_name} – {to_name}", "", body.color or "#C04A00", stops, state=state, city=city)

    try:
        coords, snapped = await osrm_snap([[s["lng"], s["lat"]] for s in stops])
        apply_road_path(doc, coords, snapped)
    except Exception as exc:
        logger.warning("OSRM snap failed during conversion: %s", exc)

    await db.routes.insert_one(dict(doc))
    engine.add_route(doc, bus_count=max(1, body.bus_count))
    await db.suggestions.update_one(
        {"id": sid},
        {"$set": {
            "status": "approved",
            "arranged_route_id": doc["id"],
            "arranged_route_number": number,
            "arranged_at": now_iso(),
        }}
    )
    return {
        "ok": True,
        "message": "Route arranged and deployed successfully",
        "route": doc,
        "buses_deployed": max(1, body.bus_count),
    }


@api.put("/admin/routes/{route_id}")
async def admin_update_route(route_id: str, body: RouteUpdate, admin: AdminDep):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    res = await db.routes.update_one({"id": route_id, "active": True}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Route not found")
    if route_id in engine.routes:
        engine.routes[route_id].update(updates)
    return await db.routes.find_one({"id": route_id}, {"_id": 0})


@api.delete("/admin/routes/{route_id}")
async def admin_delete_route(route_id: str, admin: AdminDep):
    res = await db.routes.update_one({"id": route_id}, {"$set": {"active": False, "deleted_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Route not found")
    engine.remove_route(route_id)
    return {"ok": True}


@api.post("/admin/routes/{route_id}/buses")
async def admin_add_bus(route_id: str, admin: AdminDep):
    bus = engine.add_bus(route_id)
    if not bus:
        raise HTTPException(404, "Route not found")
    return engine.bus_dict(bus, with_etas=True)


@api.get("/admin/buses")
async def admin_list_buses(admin: AdminDep):
    return [engine.bus_dict(b, with_etas=True) for b in engine.buses.values()]


@api.post("/admin/buses")
async def admin_create_bus(body: BusCreateIn, admin: AdminDep):
    bus = engine.add_bus(body.route_id, plate=body.plate, driver=body.driver, status=body.status, schedule=body.schedule)
    if not bus:
        raise HTTPException(404, "Route not found")
    return engine.bus_dict(bus, with_etas=True)


@api.put("/admin/buses/{bus_id}")
async def admin_update_bus(bus_id: str, body: BusUpdateIn, admin: AdminDep):
    bus = engine.update_bus(bus_id, body.model_dump(exclude_none=True))
    if not bus:
        raise HTTPException(404, "Bus not found")
    return engine.bus_dict(bus, with_etas=True)


@api.delete("/admin/buses/{bus_id}")
async def admin_delete_bus(bus_id: str, admin: AdminDep):
    ok = engine.remove_bus(bus_id)
    if not ok:
        raise HTTPException(404, "Bus not found")
    return {"ok": True}


# ---- Admin Driver Directory ------------------------------------------
@api.get("/admin/drivers")
async def admin_list_drivers(admin: AdminDep):
    return engine.get_drivers()


@api.post("/admin/drivers")
async def admin_create_driver(body: DriverIn, admin: AdminDep):
    return engine.create_driver(body.model_dump())


@api.put("/admin/drivers/{driver_id}")
async def admin_update_driver(driver_id: str, body: DriverUpdateIn, admin: AdminDep):
    driver = engine.update_driver(driver_id, body.model_dump(exclude_none=True))
    if not driver:
        raise HTTPException(404, "Driver not found")
    return driver


@api.delete("/admin/drivers/{driver_id}")
async def admin_delete_driver(driver_id: str, admin: AdminDep):
    ok = engine.delete_driver(driver_id)
    if not ok:
        raise HTTPException(404, "Driver not found")
    return {"ok": True}


@api.get("/admin/stops")
async def admin_list_stops(admin: AdminDep):
    stops_map = {}
    for r in engine.routes.values():
        for s in r.get("stops", []):
            key = s["name"].lower()
            if key not in stops_map:
                stops_map[key] = {
                    "id": s["id"],
                    "name": s["name"],
                    "name_hi": s.get("name_hi", ""),
                    "lat": s["lat"],
                    "lng": s["lng"],
                    "routes": [],
                }
            stops_map[key]["routes"].append({"id": r["id"], "number": r["number"], "name": r["name"], "color": r["color"]})
    return sorted(stops_map.values(), key=lambda x: x["name"])


@api.get("/admin/schedules")
async def admin_list_schedules(admin: AdminDep):
    out = []
    for r in engine.routes.values():
        tt = engine.timetable(r["id"])
        if tt:
            out.append({
                "route_id": r["id"],
                "route_number": r["number"],
                "route_name": r["name"],
                "route_name_hi": r["name_hi"],
                "color": r["color"],
                "bus_count": sum(1 for b in engine.buses.values() if b.route_id == r["id"]),
                "headway_min": tt["headway_min"],
                "first": tt["first"],
                "last": tt["last"],
                "one_way_min": tt["one_way_min"],
                "total_trips": len(tt["forward"]["trips"]) + len(tt["backward"]["trips"]),
            })
    return out


@api.get("/admin/buses/{bus_id}/history")
async def admin_bus_history(bus_id: str, admin: AdminDep, minutes: int = 30):
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    docs = await db.positions.find({"bus_id": bus_id, "ts": {"$gte": since}}, {"_id": 0}).sort("ts", 1).to_list(3000)
    for d in docs:
        d["ts"] = d["ts"].isoformat()
    return {"bus_id": bus_id, "points": docs}


@api.get("/admin/bunching")
async def admin_bunching(admin: AdminDep):
    return engine.bunching()


@api.get("/admin/demand")
async def admin_demand(admin: AdminDep):
    docs = await db.demand.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    groups = {}
    for d in docs:
        k = (d["from_text"].lower(), d["to_text"].lower())
        g = groups.setdefault(k, {"from_text": d["from_text"], "to_text": d["to_text"], "count": 0,
                                  "lat": d.get("from_lat"), "lng": d.get("from_lng"), "to_lat": d.get("to_lat"), "to_lng": d.get("to_lng"), "last": d["created_at"]})
        g["count"] += 1
    pairs = sorted(groups.values(), key=lambda g: -g["count"])
    points = [{"lat": g["lat"], "lng": g["lng"], "weight": g["count"], "label": f'{g["from_text"]} → {g["to_text"]}'} for g in pairs if g["lat"] is not None]
    return {"total": len(docs), "pairs": pairs, "points": points}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
