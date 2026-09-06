import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { AdminGate } from "@/src/components/AdminGate";
import { Icon } from "@/src/components/Icon";
import { LeafletMap } from "@/src/components/LeafletMap";
import { MapBus } from "@/src/components/leafletHtml";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { useLive } from "@/src/live/LiveContext";
import { makeStyles, useTheme } from "@/src/theme";

export default function AdminDashboard() {
  return (
    <AdminGate>
      <Dashboard />
    </AdminGate>
  );
}

function Dashboard() {
  const { t } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { snapshot } = useLive();
  const routesQ = useQuery({ queryKey: ["routes"], queryFn: api.routes, staleTime: 60000 });
  const ov = useQuery({ queryKey: ["admin-overview"], queryFn: api.admin.overview, refetchInterval: 4000 });

  const resolve = useMutation({
    mutationFn: api.admin.resolveSos,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.show("SOS resolved", "success");
    },
  });

  const mapRoutes = useMemo(() => (routesQ.data ?? []).map((r) => ({ id: r.id, color: r.color, number: r.number, path: r.path.coordinates, stops: r.stops })), [routesQ.data]);
  const mapBuses = useMemo<MapBus[]>(
    () => (snapshot?.buses ?? []).map((b) => ({ id: b.id, lat: b.lat, lng: b.lng, color: b.sos ? colors.error : b.color, label: b.route_number, sos: !!b.sos, heading: b.heading })),
    [snapshot, colors.error],
  );

  const logout = async () => {
    await api.admin.logout();
    qc.removeQueries({ queryKey: ["admin-me"] });
    router.replace("/(tabs)/settings");
  };

  const d = ov.data;
  const stats = [
    { label: t("routesCount"), value: d?.routes ?? "—", icon: "routes", color: colors.brandPrimary, testID: "stat-routes" },
    { label: t("activeBuses"), value: d?.buses ?? "—", icon: "bus-multiple", color: colors.success, testID: "stat-buses" },
    { label: t("sosActive"), value: d?.sos_active ?? "—", icon: "alarm-light", color: colors.error, testID: "stat-sos" },
    { label: t("demandCount"), value: d?.demand_count ?? "—", icon: "chart-bubble", color: colors.warning, testID: "stat-demand" },
  ];

  return (
    <View style={styles.root} testID="admin-dashboard">
      <ScreenHeader
        title={t("dashboard")}
        subtitle={d ? new Date(d.ts).toLocaleTimeString() : undefined}
        right={
          <Pressable onPress={logout} style={styles.logout} testID="admin-logout-button">
            <Icon name="logout" size={24} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={ov.isRefetching} onRefresh={ov.refetch} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat} testID={s.testID}>
              <Icon name={s.icon} size={24} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <LeafletMap routes={mapRoutes} buses={mapBuses} style={styles.map} testID="admin-live-map" />

        <View style={styles.navRow}>
          <NavTile icon="map-marker-path" label={t("manageRoutes")} onPress={() => router.push("/admin/routes")} testID="nav-manage-routes" />
          <NavTile icon="history" label={t("replay")} onPress={() => router.push("/admin/replay")} testID="nav-replay" />
          <NavTile icon="fire" label={t("demandHeatmap")} onPress={() => router.push("/admin/demand")} testID="nav-demand" />
        </View>

        <Text style={styles.section}>{t("sosAlerts")}</Text>
        {d && d.sos.length === 0 && <Text style={styles.empty}>{t("noSos")}</Text>}
        {d?.sos.map((s) => (
          <View key={s.id} style={[styles.alert, { borderColor: colors.error }]} testID={`sos-alert-${s.id}`}>
            <View style={[styles.alertIcon, { backgroundColor: colors.error }]}>
              <Icon name="alarm-light" size={22} color={colors.onError} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{s.route_number ?? "—"} · {s.plate ?? "—"}</Text>
              <Text style={styles.alertMeta}>{s.message} · {new Date(s.created_at).toLocaleTimeString()}</Text>
            </View>
            <Pressable style={styles.resolveBtn} onPress={() => resolve.mutate(s.id)} testID={`resolve-sos-${s.id}`}>
              <Text style={styles.resolveText}>{t("resolve")}</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.section}>{t("bunchingTitle")}</Text>
        {d && d.bunching.length === 0 && <Text style={styles.empty}>{t("noBunching")}</Text>}
        {d?.bunching.map((w, i) => (
          <View key={`${w.bus_a}-${w.bus_b}-${i}`} style={[styles.alert, { borderColor: colors.warning }]} testID={`bunching-warning-${i}`}>
            <View style={[styles.alertIcon, { backgroundColor: colors.warning }]}>
              <Icon name="alert" size={22} color={colors.onWarning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{w.route_number} · {w.route_name}</Text>
              <Text style={styles.alertMeta}>{w.bus_a} ↔ {w.bus_b} · {w.gap_s}s apart</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function NavTile({ icon, label, onPress, testID }: { icon: string; label: string; onPress: () => void; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={styles.tile} onPress={onPress} testID={testID}>
      <Icon name={icon} size={28} color={colors.brandPrimary} />
      <Text style={styles.tileText} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  logout: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flexBasis: "47%", flexGrow: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 28, fontWeight: "900", color: colors.onSurface },
  statLabel: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  map: { height: 260, flex: 0, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  navRow: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, minHeight: 96, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 8, padding: 8 },
  tileText: { fontSize: 13, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  section: { fontSize: 14, fontWeight: "800", color: colors.muted, textTransform: "uppercase", marginTop: 4 },
  empty: { color: colors.muted, fontSize: 14 },
  alert: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1.5, padding: 12 },
  alertIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  alertTitle: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  alertMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  resolveBtn: { height: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  resolveText: { color: colors.onBrandPrimary, fontWeight: "800" },
}));
