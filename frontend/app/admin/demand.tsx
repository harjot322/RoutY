import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { AdminGate } from "@/src/components/AdminGate";
import { Icon } from "@/src/components/Icon";
import { LeafletMap } from "@/src/components/LeafletMap";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

export default function AdminDemand() {
  return (
    <AdminGate>
      <Demand />
    </AdminGate>
  );
}

function Demand() {
  const { t } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const q = useQuery({ queryKey: ["admin-demand"], queryFn: api.admin.demand, refetchInterval: 10000 });
  const routesQ = useQuery({ queryKey: ["routes"], queryFn: api.routes, staleTime: 60000 });
  const mapRoutes = (routesQ.data ?? []).map((r) => ({ id: r.id, color: r.color, number: r.number, path: r.path.coordinates, stops: r.stops }));

  return (
    <View style={styles.root} testID="admin-demand-screen">
      <ScreenHeader title={t("demandHeatmap")} subtitle={q.data ? t("requests", { n: q.data.total }) : undefined} />
      <LeafletMap routes={mapRoutes} heat={q.data?.points ?? []} style={styles.map} testID="demand-map" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }} style={{ flex: 1 }}>
        <Text style={styles.intro}>{t("demandIntro")}</Text>
        {q.isLoading && <ActivityIndicator color={colors.brandPrimary} />}
        {q.data && q.data.pairs.length === 0 && <Text style={styles.empty} testID="demand-empty">{t("noDemand")}</Text>}
        {q.data?.pairs.map((p, i) => (
          <View key={`${p.from_text}-${p.to_text}`} style={styles.row} testID={`demand-pair-${i}`}>
            <View style={styles.count}>
              <Text style={styles.countText}>{p.count}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pair}>{p.from_text} → {p.to_text}</Text>
              <Text style={styles.meta}>{new Date(p.last).toLocaleString()}</Text>
            </View>
            <Icon name={p.lat != null ? "map-marker-check" : "map-marker-question"} size={22} color={colors.muted} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  map: { height: 300 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  empty: { color: colors.muted, fontSize: 15, textAlign: "center", paddingVertical: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, minHeight: 64 },
  count: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.error, alignItems: "center", justifyContent: "center" },
  countText: { color: colors.onError, fontWeight: "900", fontSize: 16 },
  pair: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
}));
