import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
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
import { announce } from "@/src/utils/speech";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { t, tr, lang, setLang, audio } = useLanguage();
  const { snapshot, trackedBus, trackedBusId, setTrackedBusId, status } = useLive();
  const toast = useToast();
  const router = useRouter();
  const loc = useUserLocation();
  const styles = useStyles();
  const { colors } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [favId, setFavId] = useState<string | null>(null);
  const { favourites } = useFavourites();
  const alerted = useRef<Set<string>>(new Set());

  const favQ = useQuery({ queryKey: ["stop", favId], queryFn: () => api.stop(favId as string), enabled: !!favId, refetchInterval: 5000, retry: 0 });
  const favStop = favId ? favQ.data ?? null : null;

  const routesQ = useQuery({ queryKey: ["routes"], queryFn: api.routes, staleTime: 60000 });
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

  useEffect(() => {
    if (trackedQ.isError) setTrackedBusId(null);
  }, [trackedQ.isError, setTrackedBusId]);

  const mapRoutes = useMemo<MapRoute[]>(
    () => (routesQ.data ?? []).map((r) => ({ id: r.id, color: r.color, number: r.number, path: r.path.coordinates, stops: r.stops })),
    [routesQ.data],
  );
  const mapBuses = useMemo<MapBus[]>(
    () => (snapshot?.buses ?? []).map((b) => ({ id: b.id, lat: b.lat, lng: b.lng, color: b.color, label: b.route_number, sos: !!b.sos, heading: b.heading })),
    [snapshot],
  );

  const nearest = nearestQ.data ?? null;
  const distToStop = coords && nearest ? haversineM(coords.lat, coords.lng, nearest.lat, nearest.lng) : null;
  // ETA to the user's nearest stop: tracked bus first, otherwise the best bus for that stop
  const trackedEta = (nearest && trackedQ.data?.etas?.find((e) => e.stop_id === nearest.id)?.eta_s) ?? null;
  const etaForStop = trackedEta ?? nearest?.best?.eta_s ?? null;

  // Smart proximity alert (500 m) + voice announcement
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
          const mins = Math.max(1, Math.round(d / (b.speed_kmph > 3 ? (b.speed_kmph / 3.6) : 8) / 60));
          announce(mins <= 1 ? t("announcementNow", { r: b.route_number, s: stopName }) : t("announcement", { r: b.route_number, m: mins, s: stopName }), lang);
        }
      } else if (d > 800) alerted.current.delete(key);
    });
  }, [snapshot, nearest, trackedBus, audio, lang, t, tr, toast]);

  const onBusPress = useCallback(
    (id: string) => {
      setTrackedBusId(id);
      if (Platform.OS !== "web") Haptics.selectionAsync();
    },
    [setTrackedBusId],
  );
  const onStopPress = useCallback((_stopId: string, routeId: string) => router.push(`/route/${routeId}`), [router]);

  const sendSos = async () => {
    setSosSending(true);
    try {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await api.sos({ bus_id: trackedBusId, lat: coords?.lat, lng: coords?.lng, message: "SOS from commuter app" });
      setSosOpen(false);
      toast.show(t("sosSent"), "success");
    } catch {
      toast.show(t("loadFailed"), "error");
    } finally {
      setSosSending(false);
    }
  };

  const speakEta = () => {
    if (!nearest || etaForStop == null) return;
    const r = trackedBus?.route_number ?? nearest.route_number;
    const s = tr(nearest.name, nearest.name_hi);
    const m = Math.round(etaForStop / 60);
    announce(m < 1 ? t("announcementNow", { r, s }) : t("announcement", { r, m, s }), lang);
  };
  const shareEta = () => {
    if (!nearest || etaForStop == null) return;
    const r = trackedBus?.route_number ?? nearest.route_number;
    const term = trackedBus ? tr(trackedBus.terminus, trackedBus.terminus_hi) : nearest.best ? tr(nearest.best.terminus, nearest.best.terminus_hi) : "";
    shareMessage(t("shareText", { r, s: tr(nearest.name, nearest.name_hi), m: Math.max(1, Math.round(etaForStop / 60)), t: term }));
  };
  const favDist = favStop && coords ? haversineM(coords.lat, coords.lng, favStop.lat, favStop.lng) : null;
  const favBest = favStop?.arrivals.find((a) => a.best)?.best ?? null;

  return (
    <View style={styles.root} testID="map-screen">
      <LeafletMap routes={mapRoutes} buses={mapBuses} user={coords} focus={focus} onBusPress={onBusPress} onStopPress={onStopPress} highlightRouteId={trackedBus?.route_id ?? null} />

      {/* Top Uber-style floating bar */}
      <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable style={styles.search} onPress={() => setSearchOpen(true)} testID="map-search-button">
            <Icon name="magnify" size={24} color={colors.onSurface} />
            <Text style={styles.searchText} numberOfLines={1}>
              {lang === "hi" ? "कहाँ जाना है? / Where to?" : "Where to? · कहाँ जाना है?"}
            </Text>
          </Pressable>
          <Pressable style={styles.langBtn} onPress={() => setLang(lang === "en" ? "hi" : "en")} testID="map-language-toggle">
            <Icon name="translate" size={18} color={colors.onSurface} />
            <Text style={styles.langText}>{lang === "en" ? "हिं" : "EN"}</Text>
          </Pressable>
        </View>

        {/* Live Fleet Status Pill */}
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, { backgroundColor: status === "live" ? colors.surface : colors.surfaceInverse }]} testID="live-status-pill">
            <View style={[styles.dot, { backgroundColor: status === "live" ? colors.success : colors.muted }]} />
            <Text style={[styles.statusText, { color: status === "live" ? colors.onSurface : colors.onSurfaceInverse }]}>
              {status === "live" ? (lang === "hi" ? "● लाइव" : "● LIVE") : t("offline")} · {t("liveBuses", { n: snapshot?.buses.length ?? 0 })}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottom, { paddingBottom: 16 }]} pointerEvents="box-none">
        <View style={styles.fabRow} pointerEvents="box-none">
          {coords && (
            <Pressable style={styles.locateFab} onPress={() => setFocus({ lat: coords.lat, lng: coords.lng, zoom: 14 })} testID="map-locate-button">
              <Icon name="crosshairs-gps" size={26} color={colors.onSurface} />
            </Pressable>
          )}
          <Pressable
            style={styles.sosFab}
            testID="sos-button"
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setSosOpen(true);
            }}
          >
            <Icon name="alarm-light" size={26} color={colors.onError} />
            <Text style={styles.sosText}>{t("sos")}</Text>
          </Pressable>
        </View>

        {favourites.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favRow} contentContainerStyle={styles.favChips} testID="favourite-chips">
            <Pressable style={[styles.favChip, !favId && styles.favChipActive]} onPress={() => setFavId(null)} testID="fav-chip-nearest">
              <Icon name="crosshairs-gps" size={18} color={!favId ? colors.onBrandPrimary : colors.onSurface} />
              <Text style={[styles.favChipText, !favId && { color: colors.onBrandPrimary }]}>{t("nearestStop")}</Text>
            </Pressable>
            {favourites.map((f) => {
              const active = favId === f.stop_id;
              return (
                <Pressable key={f.stop_id} style={[styles.favChip, active && styles.favChipActive]} onPress={() => setFavId(active ? null : f.stop_id)} testID={`fav-chip-${f.stop_id}`}>
                  <Icon name={FAV_ICONS[f.label]} size={18} color={active ? colors.onBrandPrimary : colors.brandPrimary} />
                  <Text style={[styles.favChipText, active && { color: colors.onBrandPrimary }]} numberOfLines={1}>{tr(f.name, f.name_hi)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Animated.View entering={FadeInDown} style={styles.card} testID="map-bottom-card">
          {favStop ? (
            <View style={{ gap: 12 }} testID="favourite-stop-card">
              <View style={styles.rowCenter}>
                <Icon name="star" size={28} color={colors.warning} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.label}>{t("favourites")}</Text>
                  <Text style={styles.stopName} numberOfLines={1}>{tr(favStop.name, favStop.name_hi)}</Text>
                  {favDist != null && <Text style={styles.cardSub}>{t("away", { d: fmtDistance(favDist, lang) })}</Text>}
                </View>
                <Pressable style={styles.iconBtn} onPress={() => setFocus({ lat: favStop.lat, lng: favStop.lng, zoom: 14 })} testID="fav-focus-button">
                  <Icon name="map-search-outline" size={26} color={colors.onSurface} />
                </Pressable>
              </View>
              {favStop.arrivals.slice(0, 3).map((a) => (
                <Pressable key={a.stop_id} style={styles.arrivalRow} onPress={() => router.push(`/route/${a.route_id}`)} testID={`fav-arrival-${a.route_number}`}>
                  <View style={[styles.routeBadge, { width: 44, height: 44, backgroundColor: a.color }]}>
                    <Text style={styles.routeBadgeText}>{a.route_number}</Text>
                  </View>
                  <Text style={styles.arrivalName} numberOfLines={1}>{tr(a.route_name, a.route_name_hi)}</Text>
                  <Text style={[styles.eta, { fontSize: 20 }]}>{a.best ? fmtEta(a.best.eta_s, lang) : "—"}</Text>
                </Pressable>
              ))}
              {favBest && favDist != null && <CatchabilityCard distanceM={favDist} etaS={favBest.eta_s} />}
            </View>
          ) : trackedBus ? (
            <View style={styles.cardHead}>
              <View style={[styles.routeBadge, { backgroundColor: trackedBus.color }]}>
                <Text style={styles.routeBadgeText}>{trackedBus.route_number}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{t("tracking")} · {trackedBus.plate}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {t("toward", { t: tr(trackedBus.terminus, trackedBus.terminus_hi) })}
                  {trackedBus.next_stop ? ` · ${tr(trackedBus.next_stop.name, trackedBus.next_stop.name_hi)} ${fmtEta(trackedBus.next_stop.eta_s, lang)}` : ""}
                </Text>
              </View>
              <Pressable onPress={() => setTrackedBusId(null)} style={styles.iconBtn} testID="stop-tracking-button">
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
          ) : null}

          {favStop ? null : loc.status !== "granted" ? (
            <View style={{ gap: 12 }}>
              <View style={styles.rowCenter}>
                <Icon name="map-marker-radius" size={28} color={colors.brandPrimary} />
                <Text style={styles.hint}>{loc.status === "blocked" || loc.status === "denied" ? t("locationDenied") : t("locationWhy")}</Text>
              </View>
              <BigButton
                testID="enable-location-button"
                label={loc.status === "blocked" ? t("openSettings") : t("useMyLocation")}
                icon={loc.status === "blocked" ? "cog" : "crosshairs-gps"}
                onPress={loc.request}
                loading={loc.status === "requesting"}
              />
            </View>
          ) : nearest ? (
            <View style={{ gap: 12 }}>
              <View style={styles.rowCenter}>
                <View style={styles.stopIconWrap}>
                  <Icon name="bus-stop" size={24} color={colors.onSurface} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.label}>{t("nearestStop")}</Text>
                  <Text style={styles.stopName} numberOfLines={1} testID="nearest-stop-name">
                    {lang === "hi" ? (nearest.name_hi || nearest.name) : nearest.name}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {lang === "hi" ? nearest.name : (nearest.name_hi || "")}
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
                  <BigButton testID="track-nearest-bus-button" label={`${t("track")} ${nearest.route_number}`} icon="bus-marker" onPress={() => setTrackedBusId(nearest.best!.bus_id)} style={{ flex: 1, minWidth: 0 }} />
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
            </View>
          ) : (
            <Text style={styles.hint}>{t("searching")}</Text>
          )}
        </Animated.View>
      </View>

      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} routes={routesQ.data ?? []} coords={coords} />

      {/* SOS confirm sheet */}
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
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceTertiary },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 8 },
  topRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  search: {
    flex: 1,
    height: 52,
    borderRadius: 26,
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
  langBtn: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  langText: { fontSize: 13, fontWeight: "800", color: colors.onSurface },
  statusRow: { flexDirection: "row" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontWeight: "700", fontSize: 12 },
  bottom: { position: "absolute", left: 16, right: 16, bottom: 0, gap: 10 },
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
    width: 58,
    height: 58,
    borderRadius: 29,
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
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  routeBadge: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  routeBadgeText: { color: colors.onBrand, fontWeight: "800", fontSize: 14 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  cardSub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", flexShrink: 0 },
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
  actions: { flexDirection: "row", gap: 10 },
  speakBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  favRow: { height: 44, flexGrow: 0 },
  favChips: { gap: 8, alignItems: "center", paddingRight: 8 },
  favChip: {
    height: 38,
    maxWidth: 200,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  favChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  favChipText: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  arrivalRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  arrivalName: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: "700", color: colors.onSurface },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  sosHead: { flexDirection: "row", alignItems: "center", gap: 16 },
  sosIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.error, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: colors.onSurface, flex: 1 },
  sheetBody: { fontSize: 15, color: colors.onSurfaceSecondary, lineHeight: 22 },
}));
