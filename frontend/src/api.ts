import Constants from "expo-constants";
import { Platform } from "react-native";

import { storage } from "@/src/utils/storage";

function resolveBackendUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
  if (envUrl && !envUrl.includes("127.0.0.1") && !envUrl.includes("localhost")) {
    return envUrl;
  }
  if (Platform.OS !== "web") {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        return `http://${host}:8000`;
      }
    }
  }
  return envUrl || "http://127.0.0.1:8000";
}

export const BACKEND_URL = resolveBackendUrl();
export const API = `${BACKEND_URL}/api`;
export const ADMIN_TOKEN_KEY = "routy_admin_token";

export type Stop = {
  id: string;
  name: string;
  name_hi: string;
  lat: number;
  lng: number;
  path_index: number;
  dist_along: number;
};

export type BestEta = { eta_s: number; bus_id: string; plate: string; terminus: string; terminus_hi: string } | null;

export type Route = {
  id: string;
  number: string;
  name: string;
  name_hi: string;
  color: string;
  state?: string;
  city?: string;
  origin?: string;
  destination?: string;
  stops: Stop[];
  path: { type: "LineString"; coordinates: [number, number][] };
  length_m: number;
  bus_count?: number;
};

export type Eta = { stop_id: string; name: string; name_hi: string; eta_s: number };

export type Bus = {
  id: string;
  route_id: string;
  route_number: string;
  route_name: string;
  route_name_hi: string;
  color: string;
  state?: string;
  city?: string;
  plate: string;
  driver: string;
  driver_name?: string;
  driver_phone?: string;
  conductor?: string;
  conductor_phone?: string;
  depot_address?: string;
  driver_id?: string;
  status: "in_service" | "on_time" | "delayed" | "maintenance" | string;
  occupancy: "seats_available" | "low" | "medium" | "standing_only" | string;
  capacity?: number;
  passengers_opted_in?: number;
  schedule?: string | null;
  updated_at?: string;
  lat: number;
  lng: number;
  heading: number;
  speed_kmph: number;
  direction: number;
  dwelling: boolean;
  next_stop: Eta | null;
  terminus: string;
  terminus_hi: string;
  sos: { id: string; message: string; created_at: string } | null;
  etas?: Eta[];
};

export type StateInfo = {
  state: string;
  cities: string[];
  route_count: number;
  bus_count: number;
  sample_lat?: number;
  sample_lng?: number;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  conductor_name?: string;
  conductor_phone?: string;
  depot_address?: string;
  route_id?: string;
  route_number?: string;
  route_name?: string;
  bus_id?: string;
  bus_plate?: string;
  state?: string;
  city?: string;
  badge_id?: string;
  status: "on_duty" | "on_break" | "off_duty" | string;
  lat: number;
  lng: number;
  updated_at: string;
};

export type Bunching = {
  route_id: string;
  route_number: string;
  route_name: string;
  bus_a: string;
  bus_b: string;
  gap_s: number;
  lat: number;
  lng: number;
};

export type LiveSnapshot = { ts: string; buses: Bus[]; bunching: Bunching[] };

export type RouteDetail = Omit<Route, "stops"> & { stops: (Stop & { best: BestEta })[]; buses: Bus[]; bunching: Bunching[] };

export type NearestStop = Stop & {
  route_id: string;
  route_number: string;
  route_name: string;
  route_name_hi: string;
  distance_m: number;
  best: BestEta;
};

export type SearchResult = {
  id: string;
  number: string;
  name: string;
  name_hi: string;
  color: string;
  from_stop: Stop;
  to_stop: Stop;
  stops_between: number;
  fare_inr: number | null;
  distance_km: number | null;
  travel_s: number | null;
  via: { id: string; name: string; name_hi: string }[];
  legs: FareLeg[];
};

export type FareLeg = { stop_id: string; name: string; name_hi: string; eta_from_start_s: number; distance_km: number; fare_inr: number };

export type FareInfo = {
  route_id: string;
  route_number: string;
  from: Stop;
  to: Stop;
  distance_km: number;
  fare_inr: number;
  travel_s: number;
  via: { id: string; name: string; name_hi: string }[];
  legs: FareLeg[];
  direction: number;
};

export type TimetableDir = { from: string; from_hi: string; to: string; to_hi: string; stops: { id: string; name: string; name_hi: string }[]; trips: { trip: number; times: string[] }[] };
export type Timetable = {
  route_id: string;
  headway_min: number;
  first: string;
  last: string;
  one_way_min: number;
  forward: TimetableDir;
  backward: TimetableDir;
  fares_from_origin: { id: string; name: string; fare_inr: number }[];
};

export type StopArrivals = Stop & {
  route_id: string;
  route_number: string;
  arrivals: { route_id: string; route_number: string; route_name: string; route_name_hi: string; color: string; stop_id: string; best: BestEta }[];
};

export type Suggestion = {
  id: string;
  from_text: string;
  to_text: string;
  village: string;
  notes: string;
  contact: string;
  lat: number | null;
  lng: number | null;
  status: "new" | "reviewed" | "approved" | "rejected";
  created_at: string;
};

export type CorridorStop = { name: string; name_hi: string; lat: number; lng: number; t: number; offset_m: number };

export type Sos = {
  id: string;
  bus_id: string | null;
  plate: string | null;
  route_number: string | null;
  bus_lat: number | null;
  bus_lng: number | null;
  message: string;
  status: "active" | "resolved";
  created_at: string;
};

export type HistoryPoint = { lat: number; lng: number; ts: string; speed_kmph: number; heading: number };

export type Overview = {
  routes: number;
  buses: number;
  total_stops?: number;
  active_trips?: number;
  service_status?: string;
  sos_active: number;
  bunching: Bunching[];
  sos: Sos[];
  demand_count: number;
  suggestions_new: number;
  live: Bus[];
  ts: string;
};

export type AdminStop = {
  id: string;
  name: string;
  name_hi: string;
  lat: number;
  lng: number;
  routes: { id: string; number: string; name: string; color: string }[];
};

export type AdminSchedule = {
  route_id: string;
  route_number: string;
  route_name: string;
  route_name_hi: string;
  color: string;
  bus_count: number;
  headway_min: number;
  first: string;
  last: string;
  one_way_min: number;
  total_trips: number;
};

export type UnifiedSearchRoute = Route & { bus_count: number };
export type UnifiedSearchStop = {
  id: string;
  name: string;
  name_hi: string;
  lat: number;
  lng: number;
  route_id: string;
  route_number: string;
  route_name: string;
  color: string;
  best_eta?: { bus_id: string; plate: string; route_number: string; eta_s: number } | null;
};
export type UnifiedSearchResult = {
  query: string;
  routes: UnifiedSearchRoute[];
  buses: Bus[];
  stops: UnifiedSearchStop[];
  total: number;
  is_suggestion: boolean;
};

export type Demand = {
  total: number;
  pairs: { from_text: string; to_text: string; count: number; lat: number | null; lng: number | null; last: string }[];
  points: { lat: number; lng: number; weight: number; label: string }[];
};

async function request<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && typeof init.body === "string" && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (withAuth) {
    const token = await storage.secureGet(ADMIN_TOKEN_KEY, "");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 401 && withAuth) {
    await storage.secureRemove(ADMIN_TOKEN_KEY);
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  states: () => request<StateInfo[]>("/states"),
  routes: (state?: string | unknown) =>
    request<Route[]>(
      typeof state === "string" && state && state.toLowerCase() !== "all" && !state.toLowerCase().includes("all states")
        ? `/routes?state=${encodeURIComponent(state)}`
        : "/routes"
    ),
  route: (id: string) => request<RouteDetail>(`/routes/${id}`),
  timetable: (id: string) => request<Timetable>(`/routes/${id}/timetable`),
  fare: (id: string, fromStop: string, toStop: string) => request<FareInfo>(`/routes/${id}/fare?from_stop=${fromStop}&to_stop=${toStop}`),
  stop: (stopId: string) => request<StopArrivals>(`/stops/${stopId}`),
  suggest: (body: { from_text: string; to_text: string; village?: string; notes?: string; contact?: string; lat?: number; lng?: number }) =>
    request<Suggestion>("/suggestions", { method: "POST", body: JSON.stringify(body) }),
  live: () => request<LiveSnapshot>("/live"),
  bus: (id: string) => request<Bus>(`/buses/${id}`),
  nearbyBuses: (lat: number, lng: number, radiusKm: number = 50, limit: number = 10) =>
    request<(Bus & { distance_m: number })[]>(`/buses/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}&limit=${limit}`),
  optInBus: (busId: string) => request<Bus>(`/buses/${busId}/opt-in`, { method: "POST" }),
  optOutBus: (busId: string) => request<Bus>(`/buses/${busId}/opt-out`, { method: "POST" }),
  nearestStop: (lat: number, lng: number) => request<NearestStop>(`/stops/nearest?lat=${lat}&lng=${lng}`),
  search: (from_text: string, to_text: string, lat?: number, lng?: number) =>
    request<{ results: SearchResult[]; unserved: boolean }>("/search", {
      method: "POST",
      body: JSON.stringify({ from_text, to_text, lat, lng }),
    }),
  unifiedSearch: (q: string = "") => request<UnifiedSearchResult>(`/search/unified?q=${encodeURIComponent(q)}`),
  sos: (body: { bus_id?: string | null; lat?: number; lng?: number; message?: string }) =>
    request<Sos>("/sos", { method: "POST", body: JSON.stringify(body) }),
  translate: (text: string, source: "en" | "hi", target: "en" | "hi") =>
    request<{ translated_text: string; cached: boolean }>("/translate", {
      method: "POST",
      body: JSON.stringify({ text, source, target }),
    }),
  admin: {
    login: async (username: string, password: string) => {
      const body = new URLSearchParams({ username, password }).toString();
      const data = await request<{ access_token: string }>("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      await storage.secureSet(ADMIN_TOKEN_KEY, data.access_token);
      return data;
    },
    logout: () => storage.secureRemove(ADMIN_TOKEN_KEY),
    me: () => request<{ username: string; role: string }>("/admin/me", {}, true),
    overview: () => request<Overview>("/admin/overview", {}, true),
    sosList: () => request<Sos[]>("/admin/sos", {}, true),
    resolveSos: (id: string) => request<{ ok: boolean }>(`/admin/sos/${id}/resolve`, { method: "POST" }, true),
    routes: () => request<Route[]>("/routes"),
    createRoute: (body: {
      number: string;
      name: string;
      name_hi: string;
      color: string;
      state?: string;
      city?: string;
      origin?: string;
      destination?: string;
      stops: { name: string; name_hi: string; lat: number; lng: number }[];
      bus_count: number;
      path_coordinates?: [number, number][];
    }) => request<Route>("/admin/routes", { method: "POST", body: JSON.stringify(body) }, true),
    updateRoute: (id: string, body: Partial<{ number: string; name: string; name_hi: string; color: string; origin: string; destination: string }>) =>
      request<Route>(`/admin/routes/${id}`, { method: "PUT", body: JSON.stringify(body) }, true),
    deleteRoute: (id: string) => request<{ ok: boolean }>(`/admin/routes/${id}`, { method: "DELETE" }, true),
    buses: () => request<Bus[]>("/admin/buses", {}, true),
    createBus: (body: { route_id: string; plate?: string; driver_name?: string; driver_phone?: string; driver?: string; status?: string; schedule?: string; occupancy?: string }) =>
      request<Bus>("/admin/buses", { method: "POST", body: JSON.stringify(body) }, true),
    updateBus: (busId: string, body: Partial<{ plate: string; driver: string; driver_name: string; driver_phone: string; status: string; schedule: string; occupancy: string; route_id: string }>) =>
      request<Bus>(`/admin/buses/${busId}`, { method: "PUT", body: JSON.stringify(body) }, true),
    deleteBus: (busId: string) => request<{ ok: boolean }>(`/admin/buses/${busId}`, { method: "DELETE" }, true),
    addBus: (routeId: string) => request<Bus>(`/admin/routes/${routeId}/buses`, { method: "POST" }, true),
    drivers: () => request<Driver[]>("/admin/drivers", {}, true),
    createDriver: (body: Partial<Driver>) => request<Driver>("/admin/drivers", { method: "POST", body: JSON.stringify(body) }, true),
    updateDriver: (driverId: string, body: Partial<Driver>) => request<Driver>(`/admin/drivers/${driverId}`, { method: "PUT", body: JSON.stringify(body) }, true),
    deleteDriver: (driverId: string) => request<{ ok: boolean }>(`/admin/drivers/${driverId}`, { method: "DELETE" }, true),
    stops: () => request<AdminStop[]>("/admin/stops", {}, true),
    schedules: () => request<AdminSchedule[]>("/admin/schedules", {}, true),
    history: (busId: string, minutes: number) =>
      request<{ bus_id: string; points: HistoryPoint[] }>(`/admin/buses/${busId}/history?minutes=${minutes}`, {}, true),
    demand: () => request<Demand>("/admin/demand", {}, true),
    suggestions: () => request<Suggestion[]>("/admin/suggestions", {}, true),
    setSuggestionStatus: (id: string, status: Suggestion["status"]) =>
      request<{ ok: boolean }>(`/admin/suggestions/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }, true),
    convertSuggestion: (id: string, body: { route_number?: string; color?: string; bus_count?: number; state?: string; city?: string }) =>
      request<{ message: string; route: Route }>(`/admin/suggestions/${id}/convert-to-route`, { method: "POST", body: JSON.stringify(body) }, true),
    findStops: (from_point: { lat: number; lng: number }, to_point: { lat: number; lng: number }) =>
      request<{ stops: CorridorStop[] }>("/admin/routes/find-stops", { method: "POST", body: JSON.stringify({ from_point, to_point }) }, true),
  },
};

export function fmtEta(etaS: number | null | undefined, lang: "en" | "hi"): string {
  if (etaS == null) return "—";
  if (etaS < 60) return lang === "hi" ? "अभी" : "Now";
  const m = Math.round(etaS / 60);
  return lang === "hi" ? `${m} मिनट` : `${m} min`;
}
