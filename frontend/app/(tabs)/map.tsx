import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, fmtEta } from "@/src/api";
import { BigButton } from "@/src/components/BigButton";
import { CatchabilityCard } from "@/src/components/CatchabilityCard";
import { Icon } from "@/src/components/Icon";
import { LeafletMap } from "@/src/components/LeafletMap";
import { MapBus, MapRoute } from "@/src/components/leafletHtml";
import { SearchModal } from "@/src/components/SearchModal";
import { useToast } from "@/src/components/Toast";
import { FAV_ICONS, useFavourites } from "@/src/favorites/FavoritesContext";
import { useUserLocation } from "@/src/hooks/useUserLocation";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { useLive } from "@/src/live/LiveContext";
import { makeStyles, useTheme } from "@/src/theme";
import { fmtDistance, haversineM } from "@/src/utils/geo";
import { shareMessage } from "@/src/utils/share";
import { announce, speakAssistantActivated, speakNearbyBusesSummary, speakTrackedBus } from "@/src/utils/speech";
import { storage } from "@/src/utils/storage";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { t, tr, lang, setLang, audio } = useLanguage();
  const { snapshot, trackedBus, trackedBusId, setTrackedBusId, status } = useLive();
  const toast = useToast();
  const router = useRouter();
  const loc = useUserLocation();
  const styles = useStyles();
  const { colors, scheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [locPickerOpen, setLocPickerOpen] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [favId, setFavId] = useState<string | null>(null);
  const [routeFilter, setRouteFilter] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>("All States");
  const [myBoardedBusId, setMyBoardedBusId] = useState<string | null>(null);
  const [showStops, setShowStops] = useState(true);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [upcomingStopsExpanded, setUpcomingStopsExpanded] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const prevNearbyOrderRef = useRef<string[]>([]);

  const { favourites } = useFavourites();
  const alerted = useRef<Set<string>>(new Set());

  // Check saved boarded bus ID
  useEffect(() => {
    storage.getItem<string>("routy_opted_bus_id", "").then((val: string | null) => {
      if (val) setMyBoardedBusId(val);
    });
  }, []);

  // Queries
  const favQ = useQuery({
    queryKey: ["stop", favId],
    queryFn: () => api.stop(favId as string),
    enabled: !!favId,
    refetchInterval: 5000,
    retry: 0,
  });
  const favStop = favId ? favQ.data ?? null : null;

  const routesQ = useQuery({ queryKey: ["routes"], queryFn: () => api.routes(), staleTime: 60000 });
  const statesQ = useQuery({ queryKey: ["states"], queryFn: api.states, staleTime: 60000 });
  const coords = loc.coords;

  const nearestQ = useQuery({
    queryKey: ["nearest", coords ? coords.lat.toFixed(3) : null, coords ? coords.lng.toFixed(3) : null],
    queryFn: () => api.nearestStop(coords!.lat, coords!.lng),
    enabled: !!coords,
    refetchInterval: 5000,
  });

  const trackedQ = useQuery({
    queryKey: ["bus", trackedBusId],
    queryFn: () => api.bus(trackedBusId as string),
    enabled: !!trackedBusId,
    refetchInterval: 3000,
    retry: 0,
  });

  const selectedStopQ = useQuery({
    queryKey: ["stop-selected", selectedStopId],
    queryFn: () => api.stop(selectedStopId as string),
    enabled: !!selectedStopId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (trackedQ.isError) setTrackedBusId(null);
  }, [trackedQ.isError, setTrackedBusId]);

  // Auto-center map on commuter's current location when acquired
  const hasAutoCenteredUser = useRef(false);
  useEffect(() => {
    if (coords && !hasAutoCenteredUser.current && !trackedBusId) {
      hasAutoCenteredUser.current = true;
      setFocus({ lat: coords.lat, lng: coords.lng, zoom: 14 });
    }
  }, [coords, trackedBusId]);

  // Filtering routes and buses on map with State filter
  const mapRoutes = useMemo<MapRoute[]>(() => {
    let all = (routesQ.data ?? []).map((r) => ({
      id: r.id,
      color: r.color,
      number: r.number,
      path: r.path.coordinates,
      stops: r.stops,
      state: r.state,
    }));
    if (selectedState !== "All States") {
      all = all.filter((r) => (r.state || "").toLowerCase() === selectedState.toLowerCase());
    }
    if (!routeFilter) return all;
    return all.filter((r) => r.id === routeFilter);
  }, [routesQ.data, routeFilter, selectedState]);

  const mapBuses = useMemo<MapBus[]>(() => {
    let all = (snapshot?.buses ?? []).map((b) => ({
      id: b.id,
      lat: b.lat,
      lng: b.lng,
      color: b.color,
      label: b.route_number,
      sos: !!b.sos,
      heading: b.heading,
      route_id: b.route_id,
      route_number: b.route_number,
      route_name: b.route_name,
      plate: b.plate,
      driver: b.driver,
      driver_phone: b.driver_phone,
      conductor: b.conductor,
      conductor_phone: b.conductor_phone,
      capacity: b.capacity ?? 42,
      passengers_opted_in: b.passengers_opted_in ?? 18,
      state: b.state,
    }));
    if (selectedState !== "All States") {
      all = all.filter((b) => (b.state || "").toLowerCase() === selectedState.toLowerCase());
    }
    if (!routeFilter) return all;
    return all.filter((b) => b.route_id === routeFilter);
  }, [snapshot, routeFilter, selectedState]);

  // Center on state change
  const handleSelectState = (stateName: string) => {
    setSelectedState(stateName);
    if (stateName === "All States") {
      setFocus({ lat: 22.5937, lng: 78.9629, zoom: 5 });
      return;
    }
    const found = statesQ.data?.find((s) => s.state === stateName);
    if (found && found.sample_lat && found.sample_lng) {
      setFocus({ lat: found.sample_lat, lng: found.sample_lng, zoom: 11 });
    }
  };

  const handleToggleBoarding = async (busId: string) => {
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (myBoardedBusId === busId) {
        await api.optOutBus(busId);
        setMyBoardedBusId(null);
        await storage.removeItem("routy_opted_bus_id");
        toast.show(t("leftSuccess"), "info");
      } else {
        await api.optInBus(busId);
        setMyBoardedBusId(busId);
        await storage.setItem("routy_opted_bus_id", busId);
        toast.show(t("boardedSuccess"), "success");
      }
      trackedQ.refetch();
    } catch (e: any) {
      toast.show(e.message || "Failed to update seat status", "error");
    }
  };

  const nearest = nearestQ.data ?? null;
  const distToStop = coords && nearest ? haversineM(coords.lat, coords.lng, nearest.lat, nearest.lng) : null;
  const trackedEta = (nearest && trackedQ.data?.etas?.find((e) => e.stop_id === nearest.id)?.eta_s) ?? null;
  const etaForStop = trackedEta ?? nearest?.best?.eta_s ?? null;

  // Compute nearby buses relative to user's device coordinates with stable hysteresis to prevent flickering
  const nearbyBuses = useMemo(() => {
    if (!coords || !snapshot?.buses) return [];
    const withDist = snapshot.buses.map((b) => ({
      ...b,
      distance_m: Math.round(haversineM(coords.lat, coords.lng, b.lat, b.lng)),
    }));

    const prevOrder = prevNearbyOrderRef.current;
    withDist.sort((a, b) => {
      const prevA = prevOrder.indexOf(a.id);
      const prevB = prevOrder.indexOf(b.id);
      if (prevA !== -1 && prevB !== -1) {
        const diff = a.distance_m - b.distance_m;
        // Require >75m difference to flip order if both were already nearby
        if (Math.abs(diff) < 75) {
          return prevA - prevB;
        }
        return diff;
      }
      return a.distance_m - b.distance_m;
    });

    const result = withDist.slice(0, 8);
    prevNearbyOrderRef.current = result.map((b) => b.id);
    return result;
  }, [coords, snapshot?.buses]);

  // Automatically speak in fluent Hindi when user tracks a bus
  const prevTrackedBusId = useRef<string | null>(null);
  useEffect(() => {
    if (trackedBusId && trackedBusId !== prevTrackedBusId.current && audio) {
      const b = (snapshot?.buses ?? []).find((x) => x.id === trackedBusId) || trackedQ.data;
      if (b) {
        speakTrackedBus(b, lang);
      }
    }
    prevTrackedBusId.current = trackedBusId;
  }, [trackedBusId, audio, snapshot?.buses, trackedQ.data, lang]);

  // Proximity alert & announcements
  useEffect(() => {
    if (!nearest || !snapshot) return;
    const candidates = trackedBus ? [trackedBus] : snapshot.buses.filter((b) => b.id === nearest.best?.bus_id);
    candidates.forEach((b) => {
      const d = haversineM(b.lat, b.lng, nearest.lat, nearest.lng);
      const key = `${b.id}:${nearest.id}`;
      if (d <= 500 && !alerted.current.has(key)) {
        alerted.current.add(key);
        const stopName = tr(nearest.name, nearest.name_hi);
        toast.show(t("proximityAlert", { r: b.route_number, s: stopName }), "warning");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (audio) {
          const mins = Math.max(1, Math.round(d / (b.speed_kmph > 3 ? b.speed_kmph / 3.6 : 8) / 60));
          announce(
            mins <= 1
              ? t("announcementNow", { r: b.route_number, s: stopName })
              : t("announcement", { r: b.route_number, m: mins, s: stopName }),
            lang,
          );
        }
      } else if (d > 800) alerted.current.delete(key);
    });
  }, [snapshot, nearest, trackedBus, audio, lang, t, tr, toast]);

  const onBusPress = useCallback(
    (id: string) => {
      setTrackedBusId(id);
      setSelectedStopId(null);
      setFavId(null);
      setSheetExpanded(true);
      if (Platform.OS !== "web") Haptics.selectionAsync();
    },
    [setTrackedBusId],
  );

  const onStopPress = useCallback(
    (stopId: string) => {
      setSelectedStopId(stopId);
      setTrackedBusId(null);
      setFavId(null);
      setSheetExpanded(true);
      if (Platform.OS !== "web") Haptics.selectionAsync();
    },
    [setTrackedBusId],
  );

  const sendSos = async () => {
    setSosSending(true);
    try {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await api.sos({ bus_id: trackedBusId, lat: coords?.lat, lng: coords?.lng, message: "Emergency SOS dispatched" });
      setSosOpen(false);
      toast.show(t("sosSent"), "success");
    } catch {
      toast.show(t("loadFailed"), "error");
    } finally {
      setSosSending(false);
    }
  };

  const speakEta = () => {
    if (currentBusData) {
      speakTrackedBus(currentBusData, lang);
    } else if (nearest && etaForStop != null) {
      const r = trackedBus?.route_number ?? nearest.route_number;
      const s = tr(nearest.name, nearest.name_hi);
      const m = Math.max(1, Math.round(etaForStop / 60));
      announce(
        lang === "hi"
          ? `निकटतम स्टॉप ${s} पर बस संख्या ${r} लगभग ${m} मिनट में पहुँचेगी।`
          : t("announcement", { r, m, s }),
        lang
      );
    }
  };

  const shareEta = () => {
    if (!nearest || etaForStop == null) return;
    const r = trackedBus?.route_number ?? nearest.route_number;
    const term = trackedBus
      ? tr(trackedBus.terminus, trackedBus.terminus_hi)
      : nearest.best
        ? tr(nearest.best.terminus, nearest.best.terminus_hi)
        : "";
    shareMessage(
      t("shareText", {
        r,
        s: tr(nearest.name, nearest.name_hi),
        m: Math.max(1, Math.round(etaForStop / 60)),
        t: term,
      }),
    );
  };

  const selectedStop = selectedStopQ.data ?? null;
  const selectedStopDist = selectedStop && coords ? haversineM(coords.lat, coords.lng, selectedStop.lat, selectedStop.lng) : null;
  const favDist = favStop && coords ? haversineM(coords.lat, coords.lng, favStop.lat, favStop.lng) : null;
  const favBest = favStop?.arrivals.find((a) => a.best)?.best ?? null;

  const currentBusData = trackedQ.data ?? trackedBus;

  return (
    <View style={styles.root} testID="map-screen">
      <LeafletMap
        routes={mapRoutes}
        buses={mapBuses}
        user={coords}
        focus={focus}
        theme="light"
        showStops={showStops}
        onBusPress={onBusPress}
        onStopPress={onStopPress}
        highlightRouteId={trackedBus?.route_id ?? routeFilter ?? null}
      />

      {/* Top Floating Controls */}
      <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable style={styles.search} onPress={() => setSearchOpen(true)} testID="map-search-button">
            <Icon name="magnify" size={22} color={colors.brandPrimary} />
            <Text style={styles.searchText} numberOfLines={1}>
              {t("searchAll")}
            </Text>
          </Pressable>

          <Pressable style={styles.iconButton} onPress={() => setHowItWorksOpen(true)} testID="how-it-works-button">
            <Icon name="help-circle-outline" size={22} color={colors.onSurface} />
          </Pressable>

          <Pressable style={styles.iconButton} onPress={() => setLang(lang === "en" ? "hi" : "en")} testID="map-language-toggle">
            <Icon name="translate" size={18} color={colors.onSurface} />
            <Text style={styles.langText}>{lang === "en" ? "हिं" : "EN"}</Text>
          </Pressable>
        </View>

        {/* State Selector Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stateSelectorRow} testID="state-filter-row">
          <Pressable
            style={[styles.stateSelectorChip, selectedState === "All States" && styles.stateSelectorChipActive]}
            onPress={() => setSelectedState("All States")}
            testID="state-chip-all"
          >
            <Text style={[styles.stateSelectorText, selectedState === "All States" && styles.stateSelectorTextActive]}>
              {t("allStates")}
            </Text>
          </Pressable>
          {(statesQ.data ?? []).map((st) => {
            const active = selectedState.toLowerCase() === st.state.toLowerCase();
            return (
              <Pressable
                key={st.state}
                style={[styles.stateSelectorChip, active && styles.stateSelectorChipActive]}
                onPress={() => {
                  setSelectedState(st.state);
                  const stateRoute = (routesQ.data ?? []).find((r) => (r.state || "").toLowerCase() === st.state.toLowerCase());
                  if (stateRoute && stateRoute.stops.length) {
                    setFocus({ lat: stateRoute.stops[0].lat, lng: stateRoute.stops[0].lng, zoom: 12 });
                  }
                }}
                testID={`state-chip-${st.state}`}
              >
                <Text style={[styles.stateSelectorText, active && styles.stateSelectorTextActive]}>
                  {st.state}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Filter Pills Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {/* Live Status Pill */}
          <View style={styles.statusPill} testID="live-status-pill">
            <View style={[styles.dot, { backgroundColor: status === "live" ? colors.success : colors.muted }]} />
            <Text style={styles.statusText}>
              {status === "live" ? (lang === "hi" ? "● लाइव" : "● LIVE") : t("offline")} · {t("liveBuses", { n: snapshot?.buses.length ?? 0 })}
            </Text>
          </View>

          {/* Route filters */}
          <Pressable
            style={[styles.filterChip, routeFilter === null && styles.filterChipActive]}
            onPress={() => setRouteFilter(null)}
            testID="filter-all-routes"
          >
            <Text style={[styles.filterChipText, routeFilter === null && styles.filterChipTextActive]}>
              {t("filterAll")}
            </Text>
          </Pressable>

          {(routesQ.data ?? []).map((r) => {
            const active = routeFilter === r.id;
            return (
              <Pressable
                key={r.id}
                style={[styles.filterChip, active && { backgroundColor: r.color, borderColor: r.color }]}
                onPress={() => {
                  if (active) {
                    setRouteFilter(null);
                  } else {
                    setRouteFilter(r.id);
                    if (r.stops.length) {
                      setFocus({ lat: r.stops[0].lat, lng: r.stops[0].lng, zoom: 12 });
                    }
                  }
                }}
                testID={`filter-route-${r.number}`}
              >
                <View style={[styles.miniDot, { backgroundColor: active ? "#FFFFFF" : r.color }]} />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {r.number}
                </Text>
              </Pressable>
            );
          })}

          {/* Toggle Stops */}
          <Pressable
            style={[styles.filterChip, showStops && styles.filterChipActive]}
            onPress={() => setShowStops((v) => !v)}
            testID="toggle-stops-filter"
          >
            <Icon name="bus-stop" size={14} color={showStops ? colors.onBrandPrimary : colors.onSurface} />
            <Text style={[styles.filterChipText, showStops && styles.filterChipTextActive]}>
              {t("filterStops")}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Uber / Google Maps Style Vertical Action Rail on Right Edge */}
      <View
        style={[
          styles.verticalActionRail,
          { bottom: sheetExpanded ? "53%" : 135 },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.railFab}
          onPress={async () => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (coords) {
              setFocus({ lat: coords.lat, lng: coords.lng, zoom: 15 });
              toast.show(lang === "hi" ? "वर्तमान स्थान पर केंद्रित" : "Centered on your location", "info");
            }
            await loc.request();
          }}
          testID="map-locate-button"
        >
          <Icon name="crosshairs-gps" size={22} color={coords ? colors.brandPrimary : colors.muted} />
        </Pressable>

        <Pressable
          style={styles.railFab}
          testID="voice-assistant-fab"
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (currentBusData) {
              speakTrackedBus(currentBusData, lang);
            } else {
              speakNearbyBusesSummary(nearbyBuses.length, nearbyBuses[0] ?? null, lang);
            }
          }}
        >
          <Icon name="volume-high" size={20} color={colors.brandPrimary} />
        </Pressable>

        <Pressable
          style={styles.railFab}
          testID="city-preset-button"
          onPress={() => setLocPickerOpen(true)}
        >
          <Icon name="map-marker-path" size={19} color={colors.onSurface} />
        </Pressable>

        <Pressable
          style={[styles.railFab, styles.sosRailFab]}
          testID="sos-button"
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setSosOpen(true);
          }}
        >
          <Icon name="alarm-light" size={20} color={colors.onError} />
          <Text style={styles.sosRailText}>{t("sos")}</Text>
        </Pressable>
      </View>

      {/* Bottom Panel */}
      <View style={[styles.bottom, { paddingBottom: 16 }]} pointerEvents="box-none">
        {/* Dynamic Card Container */}
        <Animated.View entering={FadeInDown} style={styles.card} testID="map-bottom-card">
          {/* Drag Handle & Expand Summary Header */}
          <Pressable
            style={styles.sheetHandleArea}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSheetExpanded((v) => !v);
            }}
            testID="toggle-sheet-expand"
          >
            <View style={styles.sheetHandleBar} />
            <View style={styles.sheetHandleMetaRow}>
              <Text style={styles.sheetHandleSummary} numberOfLines={1}>
                {sheetExpanded
                  ? (lang === "hi" ? "संक्षिप्त दृश्य के लिए टैप करें" : "Tap to collapse")
                  : (currentBusData
                      ? `${currentBusData.plate} · ${t("toward", { t: tr(currentBusData.terminus, currentBusData.terminus_hi) })}`
                      : nearbyBuses.length > 0
                        ? (lang === "hi" ? `${nearbyBuses.length} बसें सक्रिय · पूरा विवरण देखने के लिए टैप करें` : `${nearbyBuses.length} active buses · Tap to expand`)
                        : (lang === "hi" ? "पूरा विवरण देखने के लिए टैप करें" : "Tap to expand transit details"))}
              </Text>
              <Icon name={sheetExpanded ? "chevron-down" : "chevron-up"} size={18} color={colors.brandPrimary} />
            </View>
          </Pressable>

          {!sheetExpanded ? (
            /* --- PEEK VIEW: Compact ~115px Footprint (>80% Map Visible) --- */
            currentBusData ? (
              <View style={styles.peekRow} testID="tracked-bus-peek">
                <View style={[styles.routeBadgeSmall, { backgroundColor: currentBusData.color, width: 38, height: 38, borderRadius: 10 }]}>
                  <Text style={[styles.routeBadgeSmallText, { fontSize: 13 }]}>{currentBusData.route_number}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.peekTitle} numberOfLines={1}>{currentBusData.plate}</Text>
                    <Text style={styles.peekSpeed}>{currentBusData.speed_kmph} km/h</Text>
                  </View>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {currentBusData.next_stop
                      ? `${t("nextBus")}: ${tr(currentBusData.next_stop.name, currentBusData.next_stop.name_hi)} (${fmtEta(currentBusData.next_stop.eta_s, lang)})`
                      : t("toward", { t: tr(currentBusData.terminus, currentBusData.terminus_hi) })}
                  </Text>
                </View>
                <Pressable onPress={() => setTrackedBusId(null)} style={styles.iconBtn} testID="stop-tracking-button">
                  <Icon name="close-circle" size={24} color={colors.muted} />
                </Pressable>
              </View>
            ) : selectedStop ? (
              <View style={styles.peekRow} testID="selected-stop-peek">
                <View style={[styles.stopIconWrap, { width: 38, height: 38, borderRadius: 19 }]}>
                  <Icon name="bus-stop" size={20} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.peekTitle} numberOfLines={1}>{tr(selectedStop.name, selectedStop.name_hi)}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {selectedStop.arrivals[0]
                      ? `${selectedStop.arrivals[0].route_number} · ${fmtEta(selectedStop.arrivals[0].best?.eta_s ?? 0, lang)}`
                      : t("noBusSoon")}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedStopId(null)} style={styles.iconBtn} testID="close-selected-stop">
                  <Icon name="close-circle" size={24} color={colors.muted} />
                </Pressable>
              </View>
            ) : favStop ? (
              <View style={styles.peekRow} testID="favourite-stop-peek">
                <Icon name="star" size={24} color={colors.warning} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.peekTitle} numberOfLines={1}>{tr(favStop.name, favStop.name_hi)}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {favBest ? `${favStop.arrivals[0]?.route_number || "Bus"} · ${fmtEta(favBest.eta_s, lang)}` : t("noBusSoon")}
                  </Text>
                </View>
                <Pressable onPress={() => setFavId(null)} style={styles.iconBtn}>
                  <Icon name="close-circle" size={24} color={colors.muted} />
                </Pressable>
              </View>
            ) : !coords && loc.status !== "granted" ? (
              <View style={styles.peekRow}>
                <Icon name="map-marker-radius" size={24} color={colors.brandPrimary} />
                <Text style={[styles.hint, { fontSize: 12 }]} numberOfLines={2}>
                  {lang === "hi" ? "आस-पास की बसें देखने के लिए स्थान साझा करें" : "Share location to see nearby buses"}
                </Text>
                <Pressable style={styles.peekTrackBtn} onPress={loc.request} testID="enable-location-button">
                  <Icon name="crosshairs-gps" size={14} color="#FFFFFF" />
                  <Text style={styles.peekTrackBtnText}>{lang === "hi" ? "सक्षम करें" : "Enable"}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.peekRow} testID="nearest-stop-peek">
                <View style={[styles.stopIconWrap, { width: 38, height: 38, borderRadius: 19 }]}>
                  <Icon name="bus-stop" size={20} color={colors.onSurface} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.label}>{t("nearestStop")}</Text>
                  <Text style={styles.peekTitle} numberOfLines={1} testID="nearest-stop-name">
                    {nearest ? (lang === "hi" ? nearest.name_hi || nearest.name : nearest.name) : (nearbyBuses[0] ? `Route ${nearbyBuses[0].route_number}` : t("searching"))}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {distToStop != null ? `${fmtDistance(distToStop, lang)} · ` : ""}
                    {etaForStop != null ? `${t("nextBus")}: ${fmtEta(etaForStop, lang)}` : `${nearbyBuses.length} active buses`}
                  </Text>
                </View>
                {nearest?.best && !trackedBus ? (
                  <Pressable
                    style={styles.peekTrackBtn}
                    onPress={() => setTrackedBusId(nearest.best!.bus_id)}
                    testID="track-nearest-bus-button"
                  >
                    <Icon name="bus-marker" size={16} color="#FFFFFF" />
                    <Text style={styles.peekTrackBtnText}>{nearest.route_number}</Text>
                  </Pressable>
                ) : nearbyBuses.length > 0 ? (
                  <Pressable
                    style={[styles.peekTrackBtn, { backgroundColor: colors.surfaceTertiary }]}
                    onPress={() => setSheetExpanded(true)}
                  >
                    <Icon name="radar" size={16} color={colors.brandPrimary} />
                    <Text style={[styles.peekTrackBtnText, { color: colors.brandPrimary }]}>{nearbyBuses.length}</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          ) : (
            /* --- EXPANDED VIEW: Scrollable Full Transit Dashboard --- */
            <ScrollView style={styles.expandedScroll} showsVerticalScrollIndicator={false}>
              {/* Favourites Chips */}
              {favourites.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favRow} contentContainerStyle={styles.favChips} testID="favourite-chips">
                  <Pressable style={[styles.favChip, !favId && !selectedStopId && !trackedBusId && styles.favChipActive]} onPress={() => setFavId(null)} testID="fav-chip-nearest">
                    <Icon name="crosshairs-gps" size={16} color={!favId && !selectedStopId && !trackedBusId ? colors.onBrandPrimary : colors.onSurface} />
                    <Text style={[styles.favChipText, !favId && !selectedStopId && !trackedBusId && { color: colors.onBrandPrimary }]}>
                      {t("nearestStop")}
                    </Text>
                  </Pressable>
                  {favourites.map((f) => {
                    const active = favId === f.stop_id;
                    return (
                      <Pressable
                        key={f.stop_id}
                        style={[styles.favChip, active && styles.favChipActive]}
                        onPress={() => {
                          setFavId(active ? null : f.stop_id);
                          setSelectedStopId(null);
                          setTrackedBusId(null);
                        }}
                        testID={`fav-chip-${f.stop_id}`}
                      >
                        <Icon name={FAV_ICONS[f.label]} size={16} color={active ? colors.onBrandPrimary : colors.brandPrimary} />
                        <Text style={[styles.favChipText, active && { color: colors.onBrandPrimary }]} numberOfLines={1}>
                          {tr(f.name, f.name_hi)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* 1. Tracked Bus Rich Card */}
              {currentBusData ? (
            <View style={{ gap: 12 }} testID="tracked-bus-card">
              <View style={styles.cardHead}>
                <View style={[styles.routeBadge, { backgroundColor: currentBusData.color }]}>
                  <Text style={styles.routeBadgeText}>{currentBusData.route_number}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.rowCenter}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {currentBusData.plate}
                    </Text>
                    <View style={[styles.statusPillSmall, { backgroundColor: currentBusData.status === "delayed" ? colors.warningSoft : colors.successSoft }]}>
                      <Text style={[styles.statusPillSmallText, { color: currentBusData.status === "delayed" ? colors.warning : colors.success }]}>
                        {currentBusData.status === "delayed" ? t("statusDelayed") : t("statusInService")}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {t("toward", { t: tr(currentBusData.terminus, currentBusData.terminus_hi) })} · {currentBusData.speed_kmph} km/h
                  </Text>
                </View>
                <Pressable onPress={() => setTrackedBusId(null)} style={styles.iconBtn} testID="stop-tracking-button">
                  <Icon name="close" size={22} color={colors.onSurface} />
                </Pressable>
              </View>

              {/* Vehicle stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Icon name="speedometer" size={16} color={colors.brandPrimary} />
                  <Text style={styles.statBoxText}>{currentBusData.speed_kmph} km/h</Text>
                </View>
                <View style={styles.statBox}>
                  <Icon name="account" size={16} color={colors.muted} />
                  <Text style={styles.statBoxText} numberOfLines={1}>{currentBusData.driver}</Text>
                </View>
                <View style={styles.statBox}>
                  <Icon name="seat-passenger" size={16} color={colors.success} />
                  <Text style={styles.statBoxText} numberOfLines={1}>
                    {currentBusData.passengers_opted_in ?? 18}/{currentBusData.capacity ?? 42} seats
                  </Text>
                </View>
              </View>

              {/* Crew Card: Driver & Conductor with Call Action */}
              <View style={styles.crewSection} testID="bus-crew-card">
                <View style={styles.crewCard}>
                  <View style={styles.crewAvatar}>
                    <Icon name="account-tie" size={20} color={colors.onBrandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.crewRole}>{t("driver")}</Text>
                    <Text style={styles.crewName} numberOfLines={1}>{currentBusData.driver || "Rajesh Kumar"}</Text>
                    {!!currentBusData.depot_address && (
                      <Text style={styles.crewDepot} numberOfLines={1}>{currentBusData.depot_address}</Text>
                    )}
                  </View>
                  {currentBusData.driver_phone && (
                    <Pressable
                      style={styles.crewCallBtn}
                      onPress={() => Linking.openURL(`tel:${currentBusData.driver_phone}`)}
                      testID="call-driver-btn"
                    >
                      <Icon name="phone" size={13} color="#FFFFFF" />
                      <Text style={styles.crewCallText}>{t("callDriver")}</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.crewCard}>
                  <View style={[styles.crewAvatar, { backgroundColor: colors.info ?? colors.brandPrimary }]}>
                    <Icon name="badge-account-horizontal" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.crewRole}>{t("conductor")}</Text>
                    <Text style={styles.crewName} numberOfLines={1}>{currentBusData.conductor || "Amit Deshmukh"}</Text>
                  </View>
                  {currentBusData.conductor_phone && (
                    <Pressable
                      style={[styles.crewCallBtn, { backgroundColor: colors.info ?? colors.brandPrimary }]}
                      onPress={() => Linking.openURL(`tel:${currentBusData.conductor_phone}`)}
                      testID="call-conductor-btn"
                    >
                      <Icon name="phone" size={13} color="#FFFFFF" />
                      <Text style={styles.crewCallText}>{t("callConductor")}</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Live Passenger Seat Occupancy & Opt-In Button */}
              <View style={styles.occupancyCard} testID="seat-occupancy-section">
                <View style={styles.occupancyHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="seat-passenger" size={18} color={colors.brandPrimary} />
                    <Text style={styles.occupancyTitle}>Passenger Seat Occupancy</Text>
                  </View>
                  <Text style={styles.seatsCount}>
                    {t("seatsOccupied", {
                      opted: currentBusData.passengers_opted_in ?? 18,
                      total: currentBusData.capacity ?? 42,
                    })}
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.round(((currentBusData.passengers_opted_in ?? 18) / (currentBusData.capacity ?? 42)) * 100))}%`,
                        backgroundColor:
                          ((currentBusData.passengers_opted_in ?? 18) / (currentBusData.capacity ?? 42)) > 0.9
                            ? colors.error
                            : ((currentBusData.passengers_opted_in ?? 18) / (currentBusData.capacity ?? 42)) > 0.7
                            ? colors.warning
                            : colors.success,
                      },
                    ]}
                  />
                </View>

                {/* Boarding / Opt-In Toggle Button */}
                <Pressable
                  style={[
                    styles.optInBtn,
                    myBoardedBusId === currentBusData.id && styles.optInBtnActive,
                  ]}
                  onPress={() => handleToggleBoarding(currentBusData.id)}
                  testID="bus-opt-in-button"
                >
                  <Icon
                    name={myBoardedBusId === currentBusData.id ? "door-open" : "bus-side"}
                    size={20}
                    color={myBoardedBusId === currentBusData.id ? colors.success : "#FFFFFF"}
                  />
                  <Text
                    style={[
                      styles.optInBtnText,
                      myBoardedBusId === currentBusData.id && { color: colors.success },
                    ]}
                  >
                    {myBoardedBusId === currentBusData.id ? t("leaveBus") : t("boardBus")}
                  </Text>
                </Pressable>
              </View>

              {/* Next stop highlight */}
              {currentBusData.next_stop && (
                <View style={styles.nextStopBanner}>
                  <Icon name="arrow-right-circle" size={20} color={colors.brandPrimary} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.label}>{t("nextBus")}</Text>
                    <Text style={styles.nextStopName} numberOfLines={1}>
                      {tr(currentBusData.next_stop.name, currentBusData.next_stop.name_hi)}
                    </Text>
                  </View>
                  <Text style={styles.nextStopEta}>
                    {fmtEta(currentBusData.next_stop.eta_s, lang)}
                  </Text>
                </View>
              )}

              {/* Toggle upcoming stops list */}
              {currentBusData.etas && currentBusData.etas.length > 0 && (
                <Pressable
                  style={styles.upcomingToggle}
                  onPress={() => setUpcomingStopsExpanded((v) => !v)}
                  testID="toggle-upcoming-stops"
                >
                  <Text style={styles.upcomingToggleText}>
                    {t("upcomingStops")} ({currentBusData.etas.length})
                  </Text>
                  <Icon name={upcomingStopsExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.brandPrimary} />
                </Pressable>
              )}

              {upcomingStopsExpanded && currentBusData.etas && (
                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false} testID="upcoming-stops-list">
                  {currentBusData.etas.map((etaItem, idx) => (
                    <View key={etaItem.stop_id} style={styles.upcomingItemRow}>
                      <View style={styles.stepDotWrap}>
                        <View style={[styles.stepDot, { backgroundColor: idx === 0 ? colors.brandPrimary : colors.border }]} />
                        {idx < (currentBusData.etas?.length ?? 0) - 1 && <View style={styles.stepLine} />}
                      </View>
                      <Text style={styles.upcomingItemName} numberOfLines={1}>
                        {tr(etaItem.name, etaItem.name_hi)}
                      </Text>
                      <Text style={styles.upcomingItemEta}>
                        {fmtEta(etaItem.eta_s, lang)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.speakBtn, { flex: 1, flexDirection: "row", gap: 6 }]}
                  onPress={() => setFocus({ lat: currentBusData.lat, lng: currentBusData.lng, zoom: 15 })}
                  testID="focus-tracked-bus"
                >
                  <Icon name="crosshairs-gps" size={18} color={colors.onSurface} />
                  <Text style={styles.actionBtnText}>{t("track")}</Text>
                </Pressable>
                <Pressable style={styles.speakBtn} onPress={speakEta} testID="announce-eta-button">
                  <Icon name="volume-high" size={20} color={colors.onSurface} />
                </Pressable>
                <Pressable style={styles.speakBtn} onPress={shareEta} testID="share-eta-button">
                  <Icon name="share-variant" size={20} color={colors.onSurface} />
                </Pressable>
              </View>
            </View>
          ) : selectedStop ? (
            /* 2. Selected Stop Details Sheet */
            <View style={{ gap: 12 }} testID="selected-stop-card">
              <View style={styles.rowCenter}>
                <View style={styles.stopIconWrap}>
                  <Icon name="bus-stop" size={24} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.label}>{t("stops")}</Text>
                  <Text style={styles.stopName} numberOfLines={1}>{tr(selectedStop.name, selectedStop.name_hi)}</Text>
                  {selectedStopDist != null && (
                    <Text style={styles.cardSub}>{t("away", { d: fmtDistance(selectedStopDist, lang) })}</Text>
                  )}
                </View>
                <Pressable style={styles.iconBtn} onPress={() => setSelectedStopId(null)} testID="close-selected-stop">
                  <Icon name="close" size={22} color={colors.onSurface} />
                </Pressable>
              </View>

              <Text style={styles.sectionTitleSmall}>{t("arrivalsAt")}</Text>
              {selectedStop.arrivals.length === 0 ? (
                <Text style={styles.cardSub}>{t("noBusSoon")}</Text>
              ) : (
                selectedStop.arrivals.slice(0, 3).map((arr) => (
                  <Pressable
                    key={arr.stop_id + arr.route_id}
                    style={styles.arrivalRow}
                    onPress={() => router.push(`/route/${arr.route_id}`)}
                    testID={`selected-stop-arrival-${arr.route_number}`}
                  >
                    <View style={[styles.routeBadge, { width: 40, height: 40, backgroundColor: arr.color }]}>
                      <Text style={styles.routeBadgeText}>{arr.route_number}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.arrivalName} numberOfLines={1}>{tr(arr.route_name, arr.route_name_hi)}</Text>
                      {arr.best && (
                        <Text style={styles.cardSub} numberOfLines={1}>
                          {arr.best.plate} · {t("toward", { t: tr(arr.best.terminus, arr.best.terminus_hi) })}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.eta, { fontSize: 18 }]}>
                      {arr.best ? fmtEta(arr.best.eta_s, lang) : "—"}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : favStop ? (
            /* 3. Favourite Stop Card */
            <View style={{ gap: 12 }} testID="favourite-stop-card">
              <View style={styles.rowCenter}>
                <Icon name="star" size={26} color={colors.warning} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.label}>{t("favourites")}</Text>
                  <Text style={styles.stopName} numberOfLines={1}>{tr(favStop.name, favStop.name_hi)}</Text>
                  {favDist != null && <Text style={styles.cardSub}>{t("away", { d: fmtDistance(favDist, lang) })}</Text>}
                </View>
                <Pressable style={styles.iconBtn} onPress={() => setFocus({ lat: favStop.lat, lng: favStop.lng, zoom: 14 })} testID="fav-focus-button">
                  <Icon name="map-search-outline" size={24} color={colors.onSurface} />
                </Pressable>
              </View>
              {favStop.arrivals.slice(0, 3).map((a) => (
                <Pressable key={a.stop_id} style={styles.arrivalRow} onPress={() => router.push(`/route/${a.route_id}`)} testID={`fav-arrival-${a.route_number}`}>
                  <View style={[styles.routeBadge, { width: 40, height: 40, backgroundColor: a.color }]}>
                    <Text style={styles.routeBadgeText}>{a.route_number}</Text>
                  </View>
                  <Text style={styles.arrivalName} numberOfLines={1}>{tr(a.route_name, a.route_name_hi)}</Text>
                  <Text style={[styles.eta, { fontSize: 18 }]}>{a.best ? fmtEta(a.best.eta_s, lang) : "—"}</Text>
                </Pressable>
              ))}
              {favBest && favDist != null && <CatchabilityCard distanceM={favDist} etaS={favBest.eta_s} />}
            </View>
          ) : !coords && loc.status !== "granted" ? (
            /* 4. Location Permission Request with City Fallback */
            <View style={{ gap: 12 }}>
              <View style={styles.rowCenter}>
                <Icon name="map-marker-radius" size={28} color={colors.brandPrimary} />
                <Text style={styles.hint}>
                  {loc.status === "blocked" || loc.status === "denied"
                    ? (lang === "hi" ? "स्थान अनुमति बंद है। GPS सक्षम करें या नीचे भारतीय शहर चुनें:" : t("locationDenied"))
                    : (lang === "hi" ? "आस-पास की बसें देखने के लिए अपना डिवाइस स्थान साझा करें:" : t("locationWhy"))}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <BigButton
                  testID="enable-location-button"
                  label={loc.status === "blocked" ? t("openSettings") : t("useMyLocation")}
                  icon={loc.status === "blocked" ? "cog" : "crosshairs-gps"}
                  onPress={loc.request}
                  loading={loc.status === "requesting"}
                  style={{ flex: 1 }}
                />
                <Pressable
                  style={styles.pickCityBtn}
                  onPress={() => setLocPickerOpen(true)}
                  testID="open-city-picker-button"
                >
                  <Icon name="city" size={20} color={colors.onSurface} />
                  <Text style={styles.pickCityText}>{lang === "hi" ? "शहर चुनें" : "Select City"}</Text>
                </Pressable>
              </View>
            </View>
          ) : nearest || nearbyBuses.length > 0 ? (
            /* 5. Nearest Stop & Nearby Buses Section */
            <View style={{ gap: 12 }}>
              {/* Nearby Buses Horizontal Card Carousel */}
              {nearbyBuses.length > 0 && (
                <View style={styles.nearbySection} testID="nearby-buses-section">
                  <View style={styles.nearbyHeaderRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Icon name="radar" size={18} color={colors.brandPrimary} />
                      <Text style={styles.nearbySectionTitle}>
                        {lang === "hi" ? "निकटतम बसें (Nearby Buses)" : "Nearby Buses Near You"}
                      </Text>
                    </View>
                    <Text style={styles.nearbyCountText}>{nearbyBuses.length} active</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nearbyScroll}>
                    {nearbyBuses.map((nb) => (
                      <Pressable
                        key={nb.id}
                        style={styles.nearbyBusCard}
                        onPress={() => {
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setTrackedBusId(nb.id);
                          setFocus({ lat: nb.lat, lng: nb.lng, zoom: 15 });
                        }}
                        testID={`nearby-bus-${nb.route_number}`}
                      >
                        <View style={styles.nearbyCardTop}>
                          <View style={[styles.routeBadgeSmall, { backgroundColor: nb.color || colors.brandPrimary }]}>
                            <Text style={styles.routeBadgeSmallText}>{nb.route_number}</Text>
                          </View>
                          <View style={styles.nearbyDistPill}>
                            <Icon name="map-marker-distance" size={12} color={colors.brandPrimary} />
                            <Text style={styles.nearbyDistText}>
                              {nb.distance_m < 1000 ? `${nb.distance_m} m` : `${(nb.distance_m / 1000).toFixed(1)} km`}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.nearbyBusTerminus} numberOfLines={1}>
                          {t("toward", { t: tr(nb.terminus, nb.terminus_hi) })}
                        </Text>
                        <View style={styles.nearbyCardBottom}>
                          <Text style={styles.nearbySubText}>{nb.speed_kmph} km/h</Text>
                          <Text style={[styles.nearbySubText, { fontWeight: "700" }]}>
                            {nb.passengers_opted_in ?? 18}/{nb.capacity ?? 42} seats
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {nearest && (
                <>
                  <View style={styles.rowCenter}>
                    <View style={styles.stopIconWrap}>
                      <Icon name="bus-stop" size={24} color={colors.onSurface} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.label}>{t("nearestStop")}</Text>
                      <Text style={styles.stopName} numberOfLines={1} testID="nearest-stop-name">
                        {lang === "hi" ? nearest.name_hi || nearest.name : nearest.name}
                      </Text>
                      <Text style={styles.cardSub} numberOfLines={1}>
                        {lang === "hi" ? nearest.name : nearest.name_hi || ""}
                        {distToStop != null ? ` · ${fmtDistance(distToStop, lang)}` : ""}
                      </Text>
                    </View>
                    <View style={styles.etaCol}>
                      <Text style={styles.label}>{t("nextBus")}</Text>
                      <Text style={styles.eta} testID="nearest-stop-eta">{etaForStop != null ? fmtEta(etaForStop, lang) : "—"}</Text>
                      {etaForStop == null && <Text style={[styles.cardSub, { textAlign: "right" }]} numberOfLines={2}>{t("noBusSoon")}</Text>}
                    </View>
                  </View>
                  {etaForStop != null && distToStop != null && <CatchabilityCard distanceM={distToStop} etaS={etaForStop} />}
                  <View style={styles.actions}>
                    {!trackedBus && nearest.best && (
                      <BigButton
                        testID="track-nearest-bus-button"
                        label={`${t("track")} ${nearest.route_number}`}
                        icon="bus-marker"
                        onPress={() => setTrackedBusId(nearest.best!.bus_id)}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                    )}
                    {etaForStop != null && (
                      <>
                        <Pressable style={styles.speakBtn} onPress={speakEta} testID="announce-eta-button">
                          <Icon name="volume-high" size={22} color={colors.onSurface} />
                        </Pressable>
                        <Pressable style={styles.speakBtn} onPress={shareEta} testID="share-eta-button">
                          <Icon name="share-variant" size={22} color={colors.onSurface} />
                        </Pressable>
                      </>
                    )}
                  </View>
                </>
              )}
            </View>
          ) : (
            <Text style={styles.hint}>{t("searching")}</Text>
          )}
            </ScrollView>
          )}
        </Animated.View>
      </View>

      {/* Intelligent Search Modal */}
      <SearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        routes={routesQ.data ?? []}
        coords={coords}
        onSelectBus={(busId) => {
          setTrackedBusId(busId);
          setSelectedStopId(null);
          const b = snapshot?.buses.find((x) => x.id === busId);
          if (b) setFocus({ lat: b.lat, lng: b.lng, zoom: 15 });
        }}
        onSelectRoute={(routeId) => {
          setRouteFilter(routeId);
          const r = routesQ.data?.find((x) => x.id === routeId);
          if (r && r.stops.length) setFocus({ lat: r.stops[0].lat, lng: r.stops[0].lng, zoom: 13 });
        }}
        onSelectStop={(stop) => {
          setSelectedStopId(stop.id);
          setTrackedBusId(null);
          setFocus({ lat: stop.lat, lng: stop.lng, zoom: 15 });
        }}
      />

      {/* SOS Confirm Sheet */}
      <Modal visible={sosOpen} transparent animationType="fade" onRequestClose={() => setSosOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSosOpen(false)} testID="sos-backdrop">
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.sosHead}>
              <View style={styles.sosIcon}>
                <Icon name="alarm-light" size={36} color={colors.onError} />
              </View>
              <Text style={styles.sheetTitle}>{t("sosTitle")}</Text>
            </View>
            <Text style={styles.sheetBody}>{t("sosBody")}</Text>
            {trackedBus && <Text style={styles.cardSub}>{trackedBus.route_number} · {trackedBus.plate}</Text>}
            <BigButton testID="sos-confirm-button" label={t("sosSend")} icon="alarm-light" variant="danger" onPress={sendSos} loading={sosSending} style={{ minHeight: 56 }} />
            <BigButton testID="sos-cancel-button" label={t("cancel")} variant="ghost" onPress={() => setSosOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Demo / Indian City Location Selector Modal */}
      <Modal visible={locPickerOpen} transparent animationType="fade" onRequestClose={() => setLocPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLocPickerOpen(false)} testID="loc-picker-backdrop">
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <View style={styles.sheetHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name="crosshairs-gps" size={24} color={colors.brandPrimary} />
                <Text style={styles.sheetTitle}>
                  {lang === "hi" ? "स्थान चुनें (Location)" : "Select Device Location"}
                </Text>
              </View>
              <Pressable onPress={() => setLocPickerOpen(false)} style={styles.iconBtn}>
                <Icon name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            <Text style={styles.sheetBody}>
              {lang === "hi"
                ? "अपने वास्तविक डिवाइस GPS का उपयोग करें या निकटतम बसें देखने के लिए किसी भी भारतीय शहर को चुनें:"
                : "Use your live device GPS or select any Indian transit hub to view nearby buses:"}
            </Text>

            <Pressable
              style={[styles.cityPresetRow, { backgroundColor: colors.brandPrimary }]}
              onPress={async () => {
                setLocPickerOpen(false);
                await loc.request();
                toast.show(lang === "hi" ? "वास्तविक GPS स्थान सक्रिय किया गया" : "Live device GPS activated", "success");
              }}
            >
              <Icon name="crosshairs-gps" size={20} color="#FFFFFF" />
              <Text style={[styles.cityPresetText, { color: "#FFFFFF", fontWeight: "800" }]}>
                {lang === "hi" ? "मेरा वास्तविक GPS उपयोग करें" : "Use My Real Device GPS"}
              </Text>
            </Pressable>

            <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 8 }}>
              {[
                { name: "Central Delhi (Connaught Place)", lat: 28.6315, lng: 77.2167, state: "Delhi" },
                { name: "South Mumbai (CST / Fort)", lat: 18.9400, lng: 72.8353, state: "Maharashtra" },
                { name: "Bengaluru (Majestic / Kempegowda)", lat: 12.9767, lng: 77.5713, state: "Karnataka" },
                { name: "Kolkata (Park Street / Esplanade)", lat: 22.5550, lng: 88.3510, state: "West Bengal" },
                { name: "Chennai (T. Nagar / Central)", lat: 13.0418, lng: 80.2342, state: "Tamil Nadu" },
                { name: "Hyderabad (Secunderabad / Charminar)", lat: 17.3616, lng: 78.4747, state: "Telangana" },
                { name: "Ahmedabad (Lal Darwaja)", lat: 23.0225, lng: 72.5714, state: "Gujarat" },
              ].map((city) => (
                <Pressable
                  key={city.name}
                  style={styles.cityPresetRow}
                  onPress={() => {
                    loc.setCustomLocation({ lat: city.lat, lng: city.lng });
                    setSelectedState(city.state);
                    setFocus({ lat: city.lat, lng: city.lng, zoom: 14 });
                    setLocPickerOpen(false);
                    toast.show(
                      lang === "hi"
                        ? `${city.name} स्थान सेट किया गया`
                        : `Set location to ${city.name}`,
                      "info"
                    );
                    if (audio) {
                      announce(
                        lang === "hi"
                          ? `आपका स्थान अब ${city.name} पर सेट है। आस-पास की बसें लोड हो रही हैं।`
                          : `Location set to ${city.name}. Loading nearby buses.`,
                        lang
                      );
                    }
                  }}
                >
                  <Icon name="city" size={18} color={colors.brandPrimary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cityPresetText}>{city.name}</Text>
                    <Text style={styles.cityPresetCoords}>{city.lat.toFixed(4)}, {city.lng.toFixed(4)}</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.muted} />
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* "How It Works" Public Modal */}
      <Modal visible={howItWorksOpen} transparent animationType="slide" onRequestClose={() => setHowItWorksOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setHowItWorksOpen(false)} testID="how-it-works-backdrop">
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: "85%" }]} onPress={() => {}}>
            <View style={styles.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{t("howItWorksTitle")}</Text>
                <Text style={styles.cardSub}>{t("howItWorksSubtitle")}</Text>
              </View>
              <Pressable onPress={() => setHowItWorksOpen(false)} style={styles.iconBtn}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 14 }}>
              <View style={styles.howCard}>
                <Icon name="satellite-variant" size={24} color={colors.brandPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.howTitle}>{t("howItWorksLive")}</Text>
                  <Text style={styles.howDesc}>{t("howItWorksLiveDesc")}</Text>
                </View>
              </View>
              <View style={styles.howCard}>
                <Icon name="clock-fast" size={24} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.howTitle}>{t("howItWorksEta")}</Text>
                  <Text style={styles.howDesc}>{t("howItWorksEtaDesc")}</Text>
                </View>
              </View>
              <View style={styles.howCard}>
                <Icon name="walk" size={24} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.howTitle}>{t("howItWorksStops")}</Text>
                  <Text style={styles.howDesc}>{t("howItWorksStopsDesc")}</Text>
                </View>
              </View>
              <View style={styles.howCard}>
                <Icon name="alarm-light" size={24} color={colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.howTitle}>{t("howItWorksSos")}</Text>
                  <Text style={styles.howDesc}>{t("howItWorksSosDesc")}</Text>
                </View>
              </View>
            </ScrollView>
            <BigButton testID="how-it-works-close" label={t("close")} onPress={() => setHowItWorksOpen(false)} variant="secondary" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 8 },
  topRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  search: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  searchText: { flex: 1, fontSize: 15, color: colors.muted, fontWeight: "600" },
  iconButton: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 25,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  langText: { fontSize: 13, fontWeight: "800", color: colors.onSurface },
  filterRow: { gap: 8, alignItems: "center", paddingVertical: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontWeight: "700", fontSize: 12, color: colors.onSurface },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  filterChipText: { fontSize: 12, fontWeight: "800", color: colors.onSurface },
  filterChipTextActive: { color: colors.onBrandPrimary },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  bottom: { position: "absolute", left: 16, right: 16, bottom: 0, gap: 8 },
  verticalActionRail: {
    position: "absolute",
    right: 16,
    gap: 8,
    alignItems: "center",
    zIndex: 20,
  },
  railFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  sosRailFab: {
    backgroundColor: colors.error,
    borderColor: colors.error,
    height: 46,
  },
  sosRailText: {
    color: colors.onError,
    fontWeight: "900",
    fontSize: 9,
    marginTop: -2,
  },
  sheetHandleArea: {
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 4,
    width: "100%",
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  sheetHandleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  sheetHandleSummary: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
  },
  peekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 2,
  },
  peekTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
  },
  peekSpeed: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.brandPrimary,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  peekTrackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    elevation: 2,
    shadowColor: colors.brandPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  peekTrackBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  expandedScroll: {
    maxHeight: 380,
  },
  fabRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end", gap: 10 },
  locateFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sosFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: colors.error,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  sosText: { color: colors.onError, fontWeight: "900", fontSize: 13, marginTop: -2 },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  routeBadge: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  routeBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  cardSub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  statusPillSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  statusPillSmallText: { fontSize: 11, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceTertiary,
  },
  statBoxText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  nextStopBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
  },
  nextStopName: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  nextStopEta: { fontSize: 15, fontWeight: "900", color: colors.brandPrimary },
  upcomingToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  upcomingToggleText: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary },
  upcomingItemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  stepDotWrap: { width: 16, alignItems: "center" },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepLine: { width: 2, height: 16, backgroundColor: colors.border, marginTop: 2 },
  upcomingItemName: { flex: 1, fontSize: 13, color: colors.onSurface, fontWeight: "600" },
  upcomingItemEta: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 12 },
  stopIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  etaCol: { alignItems: "flex-end", maxWidth: "42%", flexShrink: 0 },
  label: { fontSize: 11, color: colors.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  stopName: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  eta: { fontSize: 24, fontWeight: "900", color: colors.brandPrimary },
  hint: { flex: 1, fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  speakBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: "800", color: colors.onSurface },
  favRow: { height: 44, flexGrow: 0 },
  favChips: { gap: 8, alignItems: "center", paddingRight: 8 },
  favChip: {
    height: 36,
    maxWidth: 200,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  favChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  favChipText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  arrivalRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  arrivalName: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: "700", color: colors.onSurface },
  sectionTitleSmall: { fontSize: 12, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sosHead: { flexDirection: "row", alignItems: "center", gap: 16 },
  sosIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.error, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: colors.onSurface, flex: 1 },
  sheetBody: { fontSize: 15, color: colors.onSurfaceSecondary, lineHeight: 22 },
  howCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  howTitle: { fontSize: 15, fontWeight: "800", color: colors.onSurface, marginBottom: 2 },
  howDesc: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  stateSelectorRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  stateSelectorChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stateSelectorChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  stateSelectorText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  stateSelectorTextActive: { color: colors.onBrandPrimary },
  crewSection: { gap: 8, marginTop: 4 },
  crewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  crewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  crewRole: { fontSize: 10, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  crewName: { fontSize: 13, fontWeight: "800", color: colors.onSurface },
  crewDepot: { fontSize: 11, color: colors.muted, marginTop: 1 },
  crewCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.brandPrimary,
  },
  crewCallText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },
  occupancyCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  occupancyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  occupancyTitle: { fontSize: 12, fontWeight: "800", color: colors.onSurface },
  seatsCount: { fontSize: 12, fontWeight: "800", color: colors.brandPrimary },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  optInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.brandPrimary,
  },
  optInBtnActive: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.success },
  optInBtnText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  voiceFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityPresetFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickCityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  pickCityText: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  nearbySection: { gap: 8, paddingBottom: 4 },
  nearbyHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nearbySectionTitle: { fontSize: 13, fontWeight: "800", color: colors.onSurface },
  nearbyCountText: { fontSize: 11, fontWeight: "700", color: colors.muted },
  nearbyScroll: { gap: 10, paddingVertical: 4 },
  nearbyBusCard: {
    width: 146,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  nearbyCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  routeBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  routeBadgeSmallText: { color: "#FFFFFF", fontWeight: "800", fontSize: 11 },
  nearbyDistPill: { flexDirection: "row", alignItems: "center", gap: 3 },
  nearbyDistText: { fontSize: 11, fontWeight: "800", color: colors.brandPrimary },
  nearbyBusTerminus: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  nearbyCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nearbySubText: { fontSize: 10, color: colors.muted },
  cityPresetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityPresetText: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  cityPresetCoords: { fontSize: 11, color: colors.muted, marginTop: 1 },
}));
