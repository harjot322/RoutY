# RoutY – Real-Time Public Transport Tracking (PRD)

## Original problem statement
Build a simple, elegant cross-platform mobile app (Expo) + admin dashboard for real-time bus tracking in rural / tier-2 India ("gaon").
Commuter: live map (Leaflet/OSM), stop ETAs, route search, proximity alerts, voice announcements, Catchability Index (Walk/Run/Wait), SOS, EN/HI toggle, offline fallback.
Admin: secure login, manage routes/stops, live buses, route replay slider, bus bunching detection, unserved-demand heatmap.
Backend: simulation engine (Faker) moving buses along GeoJSON routes, ETA engine, realtime WebSocket.

## User choices
- FastAPI + MongoDB + WebSockets (instead of Node/Socket.io)
- Admin section inside the same Expo app (works on web preview + mobile)
- Translation: free API, no billing → MyMemory (key-less) via backend with Mongo cache + bundled EN/HI UI dictionary
- Voice: free on-device TTS (no paid OpenAI TTS)
- Alerts: in-app visual + audio only (no push)
- Demo region: Barabanki district, Uttar Pradesh (rural stops/villages)
- No "made with emergent" branding

## Architecture
- backend/server.py – FastAPI routes (/api/*), WS /api/ws/live, MyMemory translation w/ cache, admin JWT endpoints
- backend/sim.py – Engine: routes, buses, tick loop (2 s, x3 speed), learned segment speeds → ETA, bunching (<60 s), positions history (TTL 6 h)
- backend/auth.py – JWT (HS256) + Argon2 (pwdlib), idempotent admin seed from .env
- frontend/app – expo-router: (tabs)/map|routes|settings, route/[id], admin/{login,index,routes,replay,demand}
- frontend/src – api.ts, i18n (strings + LanguageContext + useTranslated), live/LiveContext (WS + polling fallback + cached snapshot), components (LeafletMap native WebView / web iframe, CatchabilityCard, SOS, Toast, OfflineBanner…)

## Credentials
- Admin: admin / RoutYAdmin2026Secure (see /app/memory/test_credentials.md)

## Implemented (2026-06)
- Simulation of 4 routes / 10 buses, WS realtime + polling fallback, offline "Reconnecting…" banner with last-known ETAs
- **Real road geometry via OSRM** (free routing API) for all routes; admin-created routes are snapped to roads too
- Map: animated bus markers, stops, user location (permission flow w/ Open Settings), nearest stop + next bus ETA, Catchability (Walk/Run/Wait), Track bus, SOS sheet, EN/HI toggle, live status pill, share ETA, **favourite-stop chips (Home/Market/Other) with arrivals per route**
- Search From→To with village chips, **fare / travel time / distance / via-stops per result**; unserved searches logged as demand; "Suggest a route" from empty state
- Routes list + search; Route detail with per-stop live ETA countdown, **stop action sheet (track, announce, share, favourite, fare)**, **Fare & time calculator with stop-by-stop legs**, **printed-style Timetable** (grid + direction toggle + fares)
- Settings: language, voice toggle + test, **Suggest a route** form, admin access
- Admin: login, dashboard (stats incl. route requests, live map w/ red SOS buses, SOS resolve, bunching warnings), routes CRUD (create/soft-delete/add bus, **find existing stops between endpoints**), replay slider, demand heatmap, **route-request review (new/reviewed/approved/rejected)**
- Translation endpoint /api/translate (MyMemory, cached)

## Backlog
- P1: Schedules editable by admin; favourites sync; export timetable as image/PDF
- P1: Demand heatmap using proper heat layer; export CSV
- P2: Dark mode; push notifications (needs google-services.json); driver app
