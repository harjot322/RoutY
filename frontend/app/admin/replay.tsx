import Slider from "@react-native-community/slider";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { AdminGate } from "@/src/components/AdminGate";
import { Icon } from "@/src/components/Icon";
import { LeafletMap } from "@/src/components/LeafletMap";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { useLive } from "@/src/live/LiveContext";
import { makeStyles, useTheme } from "@/src/theme";

const WINDOWS = [10, 30, 60];

export default function AdminReplay() {
  return (
    <AdminGate>
      <Replay />
    </AdminGate>
  );
}

function Replay() {
  const { t } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { snapshot } = useLive();
  const buses = useMemo(() => snapshot?.buses ?? [], [snapshot]);
  const [busId, setBusId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const routesQ = useQuery({ queryKey: ["routes"], queryFn: api.routes, staleTime: 60000 });

  useEffect(() => {
    if (!busId && buses.length) setBusId(buses[0].id);
  }, [buses, busId]);

  const hist = useQuery({ queryKey: ["history", busId, minutes], queryFn: () => api.admin.history(busId as string, minutes), enabled: !!busId });
  const points = useMemo(() => hist.data?.points ?? [], [hist.data]);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [busId, minutes, hist.data]);

  useEffect(() => {
    if (!playing || points.length < 2) return;
    const i = setInterval(() => {
      setIdx((x) => {
        if (x >= points.length - 1) {
          setPlaying(false);
          return x;
        }
        return x + 1;
      });
    }, 150);
    return () => clearInterval(i);
  }, [playing, points.length]);

  const bus = buses.find((b) => b.id === busId);
  const mapRoutes = useMemo(
    () => (routesQ.data ?? []).filter((r) => !bus || r.id === bus.route_id).map((r) => ({ id: r.id, color: r.color, number: r.number, path: r.path.coordinates, stops: r.stops })),
    [routesQ.data, bus],
  );
  const trail = useMemo(() => points.slice(0, idx + 1).map((p) => ({ lat: p.lat, lng: p.lng })), [points, idx]);
  const cur = points[idx];
  const marker = cur && bus ? { lat: cur.lat, lng: cur.lng, label: bus.route_number } : null;

  return (
    <View style={styles.root} testID="admin-replay-screen">
      <ScreenHeader title={t("replay")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips}>
        {buses.map((b) => (
          <Pressable key={b.id} onPress={() => setBusId(b.id)} style={[styles.chip, busId === b.id && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]} testID={`replay-bus-${b.plate.replace(/\s+/g, "-")}`}>
            <Text style={[styles.chipText, busId === b.id && { color: colors.onBrandPrimary }]}>{b.route_number} · {b.plate}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.windows}>
        {WINDOWS.map((m) => (
          <Pressable key={m} onPress={() => setMinutes(m)} style={[styles.chip, minutes === m && { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse }]} testID={`replay-window-${m}`}>
            <Text style={[styles.chipText, minutes === m && { color: colors.onSurfaceInverse }]}>{t("lastMinutes", { m })}</Text>
          </Pressable>
        ))}
      </View>

      <LeafletMap routes={mapRoutes} trail={trail} marker={marker} highlightRouteId={bus?.route_id ?? null} style={styles.map} testID="replay-map" />

      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        {hist.isLoading ? (
          <ActivityIndicator color={colors.brandPrimary} />
        ) : points.length < 2 ? (
          <Text style={styles.empty} testID="replay-empty">{t("noHistory")}</Text>
        ) : (
          <>
            <View style={styles.timeRow}>
              <Text style={styles.time} testID="replay-time">{cur ? new Date(cur.ts).toLocaleTimeString() : "—"}</Text>
              <Text style={styles.meta}>{cur ? `${cur.speed_kmph} km/h` : ""} · {idx + 1}/{points.length}</Text>
            </View>
            <View style={styles.sliderRow}>
              <Pressable style={styles.playBtn} onPress={() => setPlaying((p) => !p)} testID="replay-play-button">
                <Icon name={playing ? "pause" : "play"} size={30} color={colors.onBrandPrimary} />
              </Pressable>
              <Slider
                testID="replay-slider"
                style={{ flex: 1, height: 44 }}
                minimumValue={0}
                maximumValue={Math.max(1, points.length - 1)}
                step={1}
                value={idx}
                onValueChange={(v) => {
                  setPlaying(false);
                  setIdx(Math.round(v));
                }}
                minimumTrackTintColor={colors.brandPrimary}
                maximumTrackTintColor={colors.surfaceTertiary}
                thumbTintColor={colors.brandPrimary}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  chipRow: { height: 56, flexGrow: 0 },
  chips: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  windows: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  map: { flex: 1 },
  controls: { padding: 16, gap: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  timeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 20, fontWeight: "900", color: colors.onSurface },
  meta: { fontSize: 13, color: colors.muted },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  playBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  empty: { color: colors.muted, textAlign: "center", fontSize: 15, paddingVertical: 12 },
}));
