import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, fmtEta } from "@/src/api";
import { Icon } from "@/src/components/Icon";
import { LeafletMap } from "@/src/components/LeafletMap";
import { MapBus } from "@/src/components/leafletHtml";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { useLive } from "@/src/live/LiveContext";
import { makeStyles, useTheme } from "@/src/theme";
import { announce } from "@/src/utils/speech";

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t, tr, lang } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { setTrackedBusId, trackedBusId } = useLive();
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [tick, setTick] = useState(0);

  const q = useQuery({ queryKey: ["route", id], queryFn: () => api.route(id as string), refetchInterval: 3000, enabled: !!id });
  useEffect(() => {
    if (q.data) setReceivedAt(Date.now());
  }, [q.data]);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const elapsed = Math.floor((Date.now() - receivedAt) / 1000) + tick * 0;

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

  return (
    <View style={styles.root} testID="route-detail-screen">
      <ScreenHeader title={tr(r.name, r.name_hi)} subtitle={`${t("liveBuses", { n: r.buses.length })} · ${t("stops", { n: r.stops.length })}`} badgeText={r.number} badgeColor={r.color} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <LeafletMap routes={mapRoutes} buses={mapBuses} highlightRouteId={r.id} style={styles.map} testID="route-map" onBusPress={(bid) => setTrackedBusId(bid)} />

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
              <View key={s.id} style={styles.stopRow} testID={`stop-row-${i}`}>
                <View style={styles.timeline}>
                  <View style={[styles.line, i === 0 && { opacity: 0 }, { backgroundColor: r.color }]} />
                  <View style={[styles.dot, { borderColor: r.color }]} />
                  <View style={[styles.line, i === r.stops.length - 1 && { opacity: 0 }, { backgroundColor: r.color }]} />
                </View>
                <View style={styles.stopBody}>
                  <Text style={styles.stopName}>{tr(s.name, s.name_hi)}</Text>
                  {s.best ? (
                    <Text style={styles.stopMeta}>
                      {s.best.plate} · {t("toward", { t: tr(s.best.terminus, s.best.terminus_hi) })}
                    </Text>
                  ) : (
                    <Text style={styles.stopMeta}>{t("noBusSoon")}</Text>
                  )}
                </View>
                <View style={styles.etaCol}>
                  <Text style={[styles.eta, !s.best && { color: colors.muted }]} testID={`stop-eta-${i}`}>{s.best ? countdown(s.best.eta_s) : "—"}</Text>
                  {s.best && (
                    <View style={styles.rowBtns}>
                      <Pressable
                        style={styles.miniBtn}
                        testID={`stop-announce-${i}`}
                        onPress={() => {
                          const m = Math.round(Math.max(0, s.best!.eta_s - elapsed) / 60);
                          announce(m < 1 ? t("announcementNow", { r: r.number, s: tr(s.name, s.name_hi) }) : t("announcement", { r: r.number, m, s: tr(s.name, s.name_hi) }), lang);
                        }}
                      >
                        <Icon name="volume-high" size={22} color={colors.onBrandSecondary} />
                      </Pressable>
                      <Pressable
                        style={[styles.miniBtn, styles.trackBtn, isTracked && { backgroundColor: colors.success }]}
                        testID={`stop-track-${i}`}
                        onPress={() => {
                          setTrackedBusId(s.best!.bus_id);
                          router.replace("/(tabs)/map");
                        }}
                      >
                        <Icon name={isTracked ? "check" : "bus-marker"} size={22} color={colors.onBrandPrimary} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  err: { color: colors.error, fontSize: 16, fontWeight: "700" },
  map: { height: 240, flex: 0 },
  warn: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.warning, margin: 16, marginBottom: 0, padding: 14, borderRadius: 12 },
  warnText: { flex: 1, color: colors.onWarning, fontWeight: "700", fontSize: 15 },
  section: { fontSize: 14, fontWeight: "800", color: colors.muted, textTransform: "uppercase", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  list: { paddingHorizontal: 16 },
  stopRow: { flexDirection: "row", alignItems: "stretch", minHeight: 76 },
  timeline: { width: 28, alignItems: "center" },
  line: { flex: 1, width: 4 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 4, backgroundColor: colors.surface },
  stopBody: { flex: 1, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  stopName: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  stopMeta: { fontSize: 13, color: colors.muted },
  etaCol: { alignItems: "flex-end", justifyContent: "center", gap: 8, paddingVertical: 8 },
  eta: { fontSize: 20, fontWeight: "900", color: colors.brandPrimary },
  rowBtns: { flexDirection: "row", gap: 8 },
  miniBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  trackBtn: { backgroundColor: colors.brandPrimary },
}));
