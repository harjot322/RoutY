import { storage } from "@/src/utils/storage";

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL as string;
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
  plate: string;
  driver: string;
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
};

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
  sos_active: number;
  bunching: Bunching[];
  sos: Sos[];
  demand_count: number;
  live: Bus[];
  ts: string;
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
  routes: () => request<Route[]>("/routes"),
  route: (id: string) => request<RouteDetail>(`/routes/${id}`),
  live: () => request<LiveSnapshot>("/live"),
  bus: (id: string) => request<Bus>(`/buses/${id}`),
  nearestStop: (lat: number, lng: number) => request<NearestStop>(`/stops/nearest?lat=${lat}&lng=${lng}`),
  search: (from_text: string, to_text: string, lat?: number, lng?: number) =>
    request<{ results: SearchResult[]; unserved: boolean }>("/search", {
      method: "POST",
      body: JSON.stringify({ from_text, to_text, lat, lng }),
    }),
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
    createRoute: (body: {
      number: string;
      name: string;
      name_hi: string;
      color: string;
      stops: { name: string; name_hi: string; lat: number; lng: number }[];
      bus_count: number;
    }) => request<Route>("/admin/routes", { method: "POST", body: JSON.stringify(body) }, true),
    deleteRoute: (id: string) => request<{ ok: boolean }>(`/admin/routes/${id}`, { method: "DELETE" }, true),
    addBus: (routeId: string) => request<Bus>(`/admin/routes/${routeId}/buses`, { method: "POST" }, true),
    history: (busId: string, minutes: number) =>
      request<{ bus_id: string; points: HistoryPoint[] }>(`/admin/buses/${busId}/history?minutes=${minutes}`, {}, true),
    demand: () => request<Demand>("/admin/demand", {}, true),
  },
};

export function fmtEta(etaS: number | null | undefined, lang: "en" | "hi"): string {
  if (etaS == null) return "—";
  if (etaS < 60) return lang === "hi" ? "अभी" : "Now";
  const m = Math.round(etaS / 60);
  return lang === "hi" ? `${m} मिनट` : `${m} min`;
}
