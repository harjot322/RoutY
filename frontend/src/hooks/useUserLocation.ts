import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";

export type LocStatus = "idle" | "requesting" | "granted" | "denied" | "blocked";

export function useUserLocation() {
  const [status, setStatus] = useState<LocStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchId = useRef<number | null>(null);

  const applyCoords = useCallback((lat: number, lng: number) => {
    setCoords({ lat, lng });
    setStatus("granted");
  }, []);

  const fallbackIpLocation = useCallback(async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          applyCoords(Number(data.latitude), Number(data.longitude));
          return true;
        }
      }
    } catch {}
    // Sensible urban transit central location fallback (Connaught Place, New Delhi)
    applyCoords(28.6315, 77.2167);
    return false;
  }, [applyCoords]);

  const startWatch = useCallback(async () => {
    // 1. If web browser, prioritize direct navigator.geolocation for instant prompt
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          applyCoords(p.coords.latitude, p.coords.longitude);
        },
        () => {
          fallbackIpLocation();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );

      try {
        if (webWatchId.current != null) navigator.geolocation.clearWatch(webWatchId.current);
        webWatchId.current = navigator.geolocation.watchPosition(
          (p) => applyCoords(p.coords.latitude, p.coords.longitude),
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
      } catch {}
      return;
    }

    // 2. Native expo-location flow
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        applyCoords(last.coords.latitude, last.coords.longitude);
      }
    } catch {}

    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      applyCoords(pos.coords.latitude, pos.coords.longitude);
    } catch {
      fallbackIpLocation();
    }

    try {
      subRef.current?.remove();
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 },
        (pos) => applyCoords(pos.coords.latitude, pos.coords.longitude)
      );
    } catch {}
  }, [applyCoords, fallbackIpLocation]);

  const request = useCallback(async () => {
    if (status === "blocked") {
      Linking.openSettings();
      return;
    }
    setStatus("requesting");

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          applyCoords(p.coords.latitude, p.coords.longitude);
        },
        () => {
          setStatus("denied");
          fallbackIpLocation();
        },
        { enableHighAccuracy: true }
      );
      return;
    }

    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.granted) {
        setStatus("granted");
        await startWatch();
      } else if (!p.canAskAgain) {
        setStatus("blocked");
        fallbackIpLocation();
      } else {
        setStatus("denied");
        fallbackIpLocation();
      }
    } catch {
      setStatus("denied");
      fallbackIpLocation();
    }
  }, [status, startWatch, applyCoords, fallbackIpLocation]);

  // Request on mount so user's current location is immediately retrieved
  useEffect(() => {
    let alive = true;

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (!alive) return;
          applyCoords(p.coords.latitude, p.coords.longitude);
        },
        () => {
          if (!alive) return;
          fallbackIpLocation();
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
      startWatch();
    } else {
      Location.getForegroundPermissionsAsync()
        .then((p) => {
          if (!alive) return;
          if (p.granted) {
            setStatus("granted");
            startWatch();
          } else if (p.canAskAgain) {
            request();
          } else {
            setStatus(p.status === "denied" ? "blocked" : "idle");
            fallbackIpLocation();
          }
        })
        .catch(() => {
          if (alive) fallbackIpLocation();
        });
    }

    // Safety timer: ensure location is always pointed within 3.5s
    const fallbackTimer = setTimeout(() => {
      if (alive && !coords) {
        fallbackIpLocation();
      }
    }, 3500);

    return () => {
      alive = false;
      clearTimeout(fallbackTimer);
      subRef.current?.remove();
      if (webWatchId.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(webWatchId.current);
      }
    };
  }, [startWatch, request, applyCoords, fallbackIpLocation, coords]);

  const setCustomLocation = useCallback((loc: { lat: number; lng: number }) => {
    applyCoords(loc.lat, loc.lng);
  }, [applyCoords]);

  return { status, coords, request, setCustomLocation };
}
