import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";

export type LocStatus = "idle" | "requesting" | "granted" | "denied" | "blocked";

export function useUserLocation() {
  const [status, setStatus] = useState<LocStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  const startWatch = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {}
    try {
      subRef.current?.remove();
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 },
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      );
    } catch {}
  }, []);

  // Check (never request) on mount
  useEffect(() => {
    let alive = true;
    Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (!alive) return;
        if (p.granted) {
          setStatus("granted");
          startWatch();
        } else if (p.status === "denied" && !p.canAskAgain) setStatus("blocked");
        else setStatus("idle");
      })
      .catch(() => alive && setStatus("idle"));
    return () => {
      alive = false;
      subRef.current?.remove();
    };
  }, [startWatch]);

  const request = useCallback(async () => {
    if (status === "blocked") {
      Linking.openSettings();
      return;
    }
    setStatus("requesting");
    const p = await Location.requestForegroundPermissionsAsync();
    if (p.granted) {
      setStatus("granted");
      startWatch();
    } else if (!p.canAskAgain) setStatus("blocked");
    else setStatus("denied");
  }, [status, startWatch]);

  return { status, coords, request };
}
