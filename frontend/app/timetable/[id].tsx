import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Icon } from "@/src/components/Icon";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

const COL_W = 64;
const STOP_W = 128;

/** Printed-style timetable: rows = stops, columns = trips. Works without live data. */
export default function TimetableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t, tr } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const [dir, setDir] = useState<"forward" | "backward">("forward");
  const routeQ = useQuery({ queryKey: ["route", id], queryFn: () => api.route(id as string), enabled: !!id });
  const ttQ = useQuery({ queryKey: ["timetable", id], queryFn: () => api.timetable(id as string), enabled: !!id, staleTime: 5 * 60_000 });
  const r = routeQ.data;
  const tt = ttQ.data;
  const d = tt?.[dir];

  return (
    <View style={styles.root} testID="timetable-screen">
      <ScreenHeader title={t("timetable")} subtitle={r ? tr(r.name, r.name_hi) : undefined} badgeText={r?.number} badgeColor={r?.color} />
      {!tt || !d ? (
        <View style={styles.center}>{ttQ.isError ? <Text style={styles.err}>{t("loadFailed")}</Text> : <ActivityIndicator size="large" color={colors.brandPrimary} />}</View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
          <View style={styles.paper}>
            <View style={styles.paperHead}>
              <Icon name="calendar-clock" size={22} color={colors.onSurface} />
              <Text style={styles.paperTitle} numberOfLines={2}>{t("timetableHint", { h: tt.headway_min, f: tt.first, l: tt.last })}</Text>
            </View>
            <View style={styles.dirRow}>
              {(["forward", "backward"] as const).map((k) => (
                <Pressable key={k} onPress={() => setDir(k)} style={[styles.dirBtn, dir === k && styles.dirBtnActive]} testID={`timetable-dir-${k}`}>
                  <Text style={[styles.dirText, dir === k && styles.dirTextActive]} numberOfLines={1}>
                    {tr(tt[k].from, tt[k].from_hi)} → {tr(tt[k].to, tt[k].to_hi)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.table}>
              {/* frozen stop column */}
              <View style={{ width: STOP_W }}>
                <View style={[styles.cell, styles.headCell, { width: STOP_W }]}>
                  <Text style={styles.headText}>{t("stopsOnRoute")}</Text>
                </View>
                {d.stops.map((s) => (
                  <View key={s.id} style={[styles.cell, styles.stopCell, { width: STOP_W }]}>
                    <Text style={styles.stopText} numberOfLines={2}>{tr(s.name, s.name_hi)}</Text>
                  </View>
                ))}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }} testID="timetable-grid">
                <View>
                  <View style={{ flexDirection: "row" }}>
                    {d.trips.map((trip) => (
                      <View key={trip.trip} style={[styles.cell, styles.headCell, { width: COL_W }]}>
                        <Text style={styles.headText}>{t("trip")} {trip.trip}</Text>
                      </View>
                    ))}
                  </View>
                  {d.stops.map((s, si) => (
                    <View key={s.id} style={{ flexDirection: "row" }}>
                      {d.trips.map((trip) => (
                        <View key={trip.trip} style={[styles.cell, { width: COL_W }, si % 2 === 1 && styles.altCell]}>
                          <Text style={styles.timeText}>{trip.times[si]}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={styles.paper}>
            <View style={styles.paperHead}>
              <Icon name="cash" size={22} color={colors.onSurface} />
              <Text style={styles.paperTitle}>{t("fare")} · {tr(tt.forward.from, tt.forward.from_hi)} →</Text>
            </View>
            {tt.fares_from_origin.map((f, i) => (
              <View key={f.id} style={[styles.fareRow, i % 2 === 1 && styles.altCell]} testID={`fare-row-${i}`}>
                <Text style={styles.fareName} numberOfLines={1}>{tr(f.name, d.stops.find((s) => s.id === f.id)?.name_hi)}</Text>
                <Text style={styles.fareVal}>{f.fare_inr ? `₹${f.fare_inr}` : "—"}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  err: { color: colors.error, fontWeight: "700" },
  paper: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderStrong, padding: 12, gap: 12 },
  paperHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  paperTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.onSurface },
  dirRow: { flexDirection: "row", gap: 8 },
  dirBtn: { flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  dirBtnActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  dirText: { fontSize: 12, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  dirTextActive: { color: colors.onSurfaceInverse },
  table: { flexDirection: "row", borderWidth: 1, borderColor: colors.borderStrong },
  cell: { height: 48, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  headCell: { backgroundColor: colors.surfaceInverse },
  headText: { color: colors.onSurfaceInverse, fontSize: 12, fontWeight: "800" },
  stopCell: { alignItems: "flex-start", backgroundColor: colors.surfaceSecondary },
  stopText: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  altCell: { backgroundColor: colors.surfaceSecondary },
  timeText: { fontSize: 15, fontWeight: "700", color: colors.onSurface, fontVariant: ["tabular-nums"] },
  fareRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, paddingHorizontal: 8, gap: 8 },
  fareName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.onSurface },
  fareVal: { fontSize: 16, fontWeight: "900", color: colors.success },
}));
