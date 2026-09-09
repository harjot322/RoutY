import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, fmtEta } from "@/src/api";
import { FareModal } from "@/src/components/FareModal";
import { Icon } from "@/src/components/Icon";
import { LeafletMap } from "@/src/components/LeafletMap";
import { MapBus } from "@/src/components/leafletHtml";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StopActionSheet } from "@/src/components/StopActionSheet";
import { useFavourites } from "@/src/favorites/FavoritesContext";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { useLive } from "@/src/live/LiveContext";
import { makeStyles, useTheme } from "@/src/theme";
import { shareMessage } from "@/src/utils/share";
import { announce } from "@/src/utils/speech";

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t, tr, lang } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { setTrackedBusId, trackedBusId } = useLive();
  const fav = useFavourites();
  const [now, setNow] = useState(0);
  const [sheetIdx, setSheetIdx] = useState<number | null>(null);
  const [fareOpen, setFareOpen] = useState(false);
  const [fareFrom, setFareFrom] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["route", id], queryFn: () => api.route(id as string), refetchInterval: 3000, enabled: !!id });
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const elapsed = now > 0 && q.dataUpdatedAt ? Math.max(0, Math.floor((now - q.dataUpdatedAt) / 1000)) : 0;

  const r = q.data;
  const mapRoutes = useMemo(() => (r ? [{ id: r.id, color: r.color, number: r.number, path: r.path.coordinates, stops: r.stops }] : []), [r]);
  const mapBuses = useMemo<MapBus[]>(
    () => (r?.buses ?? []).map((b) => ({ id: b.id, lat: b.lat, lng: b.lng, color: b.color, label: b.route_number, sos: !!b.sos, heading: b.heading })),
    [r],
  );

  if (q.isLoading || !r) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={t("tabRoutes")} />
        <View style={styles.center}>{q.isError ? <Text style={styles.err}>{t("loadFailed")}</Text> : <ActivityIndicator size="large" color={colors.brandPrimary} />}</View>
      </View>
    );
  }

  const countdown = (etaS: number) => fmtEta(Math.max(0, etaS - elapsed), lang);
  const sheetStop = sheetIdx != null ? r.stops[sheetIdx] : null;
  const announceStop = (s: (typeof r.stops)[number]) => {
    if (!s.best) return;
    const m = Math.round(Math.max(0, s.best.eta_s - elapsed) / 60);
    announce(m < 1 ? t("announcementNow", { r: r.number, s: tr(s.name, s.name_hi) }) : t("announcement", { r: r.number, m, s: tr(s.name, s.name_hi) }), lang);
  };
  const shareStop = (s: (typeof r.stops)[number]) => {
    if (!s.best) return;
    const m = Math.max(1, Math.round(Math.max(0, s.best.eta_s - elapsed) / 60));
    shareMessage(t("shareText", { r: r.number, s: tr(s.name, s.name_hi), m, t: tr(s.best.terminus, s.best.terminus_hi) }));
  };

  return (
    <View style={styles.root} testID="route-detail-screen">
      <ScreenHeader title={tr(r.name, r.name_hi)} subtitle={`${t("liveBuses", { n: r.buses.length })} · ${t("stops", { n: r.stops.length })}`} badgeText={r.number} badgeColor={r.color} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <LeafletMap routes={mapRoutes} buses={mapBuses} highlightRouteId={r.id} style={styles.map} testID="route-map" onBusPress={(bid) => setTrackedBusId(bid)} />

        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => router.push(`/timetable/${r.id}`)} testID="route-timetable-button">
            <Icon name="calendar-clock" size={24} color={colors.brandPrimary} />
            <Text style={styles.actionText} numberOfLines={1}>{t("timetable")}</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              setFareFrom(null);
              setFareOpen(true);
            }}
            testID="route-fare-button"
          >
            <Icon name="cash" size={24} color={colors.brandPrimary} />
            <Text style={styles.actionText} numberOfLines={1}>{t("fareCalc")}</Text>
          </Pressable>
        </View>

        {r.bunching.length > 0 && (
          <View style={styles.warn} testID="route-bunching-warning">
            <Icon name="alert" size={24} color={colors.onWarning} />
            <Text style={styles.warnText}>{t("bunchingWarn")}</Text>
          </View>
        )}

        <Text style={styles.section}>{t("stopsOnRoute")}</Text>
        <View style={styles.list}>
          {r.stops.map((s, i) => {
            const isTracked = !!s.best && s.best.bus_id === trackedBusId;
            return (
              <Pressable key={s.id} style={({ pressed }) => [styles.stopRow, pressed && { backgroundColor: colors.surfaceSecondary }]} testID={`stop-row-${i}`} onPress={() => setSheetIdx(i)}>
                <View style={styles.timeline}>
                  <View style={[styles.line, i === 0 && { opacity: 0 }, { backgroundColor: r.color }]} />
                  <View style={[styles.dot, { borderColor: r.color }, isTracked && { backgroundColor: r.color }]} />
                  <View style={[styles.line, i === r.stops.length - 1 && { opacity: 0 }, { backgroundColor: r.color }]} />
                </View>
                <View style={styles.stopBody}>
                  <View style={styles.nameRow}>
                    <Text style={styles.stopName} numberOfLines={2}>{tr(s.name, s.name_hi)}</Text>
                    {fav.isFavourite(s.id) && <Icon name="star" size={18} color={colors.warning} />}
                  </View>
                  {s.best ? (
                    <Text style={styles.stopMeta} numberOfLines={2}>
                      {s.best.plate} · {t("toward", { t: tr(s.best.terminus, s.best.terminus_hi) })}
                    </Text>
                  ) : (
                    <Text style={styles.stopMeta}>{t("noBusSoon")}</Text>
                  )}
                </View>
                <View style={styles.etaCol}>
                  <Text style={[styles.eta, !s.best && { color: colors.muted }]} testID={`stop-eta-${i}`}>{s.best ? countdown(s.best.eta_s) : "—"}</Text>
                  <Icon name="dots-horizontal-circle-outline" size={22} color={colors.muted} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <StopActionSheet
        visible={sheetIdx != null}
        onClose={() => setSheetIdx(null)}
        stop={sheetStop}
        routeId={r.id}
        routeNumber={r.number}
        etaText={sheetStop?.best ? countdown(sheetStop.best.eta_s) : "—"}
        onTrack={
          sheetStop?.best
            ? () => {
                setTrackedBusId(sheetStop.best!.bus_id);
                setSheetIdx(null);
                router.replace("/(tabs)/map");
              }
            : undefined
        }
        onAnnounce={sheetStop?.best ? () => announceStop(sheetStop) : undefined}
        onShare={sheetStop?.best ? () => shareStop(sheetStop) : undefined}
        onFare={
          sheetStop
            ? () => {
                setFareFrom(sheetStop.id);
                setSheetIdx(null);
                setFareOpen(true);
              }
            : undefined
        }
      />
      <FareModal visible={fareOpen} onClose={() => setFareOpen(false)} routeId={r.id} routeNumber={r.number} color={r.color} stops={r.stops} initialFrom={fareFrom} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  err: { color: colors.error, fontSize: 16, fontWeight: "700" },
  map: { height: 240 },
  actionRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  actionBtn: { flex: 1, minHeight: 56, borderRadius: 12, borderWidth: 1.5, borderColor: colors.brandPrimary, backgroundColor: colors.brandSecondary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 8 },
  actionText: { fontSize: 15, fontWeight: "800", color: colors.onBrandSecondary, flexShrink: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  warn: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.warning, margin: 16, marginBottom: 0, padding: 14, borderRadius: 12 },
  warnText: { flex: 1, color: colors.onWarning, fontWeight: "700", fontSize: 15 },
  section: { fontSize: 14, fontWeight: "800", color: colors.muted, textTransform: "uppercase", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  list: { paddingHorizontal: 16 },
  stopRow: { flexDirection: "row", alignItems: "stretch", minHeight: 76, borderRadius: 12 },
  timeline: { width: 28, alignItems: "center" },
  line: { flex: 1, width: 4 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 4, backgroundColor: colors.surface },
  stopBody: { flex: 1, minWidth: 0, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  stopName: { fontSize: 17, fontWeight: "800", color: colors.onSurface, flexShrink: 1 },
  stopMeta: { fontSize: 13, color: colors.muted },
  etaCol: { alignItems: "flex-end", justifyContent: "center", gap: 6, paddingVertical: 8, paddingRight: 4, maxWidth: 120 },
  eta: { fontSize: 20, fontWeight: "900", color: colors.brandPrimary },
}));
