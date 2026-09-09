import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { API, Bus, LiveSnapshot, api } from "@/src/api";
import { storage } from "@/src/utils/storage";

export type ConnStatus = "connecting" | "live" | "offline";

type Ctx = {
  snapshot: LiveSnapshot | null;
  status: ConnStatus;
  receivedAt: number;
  trackedBusId: string | null;
  setTrackedBusId: (id: string | null) => void;
  trackedBus: Bus | null;
};

const LiveContext = createContext<Ctx | null>(null);
const CACHE_KEY = "routy_last_snapshot";

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [wsOk, setWsOk] = useState(false);
  const [wsReceivedAt, setWsReceivedAt] = useState(0);
  const [isStale, setIsStale] = useState(false);
  const [cached, setCached] = useState<LiveSnapshot | null>(null);
  const [trackedBusId, setTrackedBusIdState] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastSave = useRef(0);

  // Polling fallback (also the primary source while WS is not connected)
  const query = useQuery({
    queryKey: ["live"],
    queryFn: api.live,
    refetchInterval: wsOk ? false : 3000,
    retry: 1,
  });

  useEffect(() => {
    storage.getItem(CACHE_KEY, "").then((raw) => {
      if (raw) {
        try {
          setCached(JSON.parse(raw as string));
        } catch {}
      }
    });
    storage.getItem("routy_tracked_bus", "").then((v) => v && setTrackedBusIdState(v as string));
  }, []);

  // Save latest snapshot to cache periodically
  useEffect(() => {
    if (query.data) {
      const now = Date.now();
      if (now - lastSave.current > 10000) {
        lastSave.current = now;
        storage.setItem(CACHE_KEY, JSON.stringify(query.data));
      }
    }
  }, [query.data]);

  // WebSocket realtime feed with automatic reconnect
  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      try {
        const url = `${API.replace(/^http/, "ws")}/ws/live`;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => setWsOk(true);
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data as string) as LiveSnapshot;
            setWsReceivedAt(Date.now());
            qc.setQueryData(["live"], data);
          } catch {}
        };
        ws.onerror = () => {
          setWsOk(false);
        };
        ws.onclose = () => {
          setWsOk(false);
          if (!closed) timer = setTimeout(connect, 5000);
        };
      } catch {
        setWsOk(false);
        timer = setTimeout(connect, 5000);
      }
    };
    connect();

    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && wsRef.current?.readyState !== WebSocket.OPEN) connect();
    });
    return () => {
      closed = true;
      sub.remove();
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [qc]);

  const receivedAt = Math.max(query.dataUpdatedAt, wsReceivedAt);

  // Stale watchdog: if no data for 12s mark offline (keeps last known ETAs visible)
  useEffect(() => {
    const id = setInterval(() => {
      if (receivedAt > 0 && Date.now() - receivedAt > 12000) {
        setIsStale(true);
      } else if (receivedAt > 0) {
        setIsStale(false);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [receivedAt]);

  const status: ConnStatus = isStale || (query.isError && !wsOk) ? "offline" : (wsOk || query.data ? "live" : "connecting");

  const setTrackedBusId = (id: string | null) => {
    setTrackedBusIdState(id);
    if (id) storage.setItem("routy_tracked_bus", id);
    else storage.removeItem("routy_tracked_bus");
  };

  const snapshot = query.data ?? cached;
  const trackedBus = useMemo(
    () => snapshot?.buses.find((b) => b.id === trackedBusId) ?? null,
    [snapshot, trackedBusId],
  );

  const value = useMemo<Ctx>(
    () => ({ snapshot, status, receivedAt, trackedBusId, setTrackedBusId, trackedBus }),
    [snapshot, status, receivedAt, trackedBusId, trackedBus],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive outside LiveProvider");
  return ctx;
}
