import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { RouteCard } from "@/src/components/RouteCard";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

export default function RoutesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [q, setQ] = useState("");
  const routesQ = useQuery({ queryKey: ["routes"], queryFn: api.routes, refetchInterval: 15000 });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = routesQ.data ?? [];
    if (!s) return all;
    return all.filter(
      (r) =>
        r.number.toLowerCase().includes(s) ||
        r.name.toLowerCase().includes(s) ||
        r.name_hi.includes(s) ||
        r.stops.some((st) => st.name.toLowerCase().includes(s) || st.name_hi.includes(s)),
    );
  }, [q, routesQ.data]);

  return (
    <View style={styles.root} testID="routes-screen">
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>{t("routesTitle")}</Text>
        <View style={styles.inputWrap}>
          <Icon name="magnify" size={24} color={colors.muted} />
          <TextInput
            testID="routes-search-input"
            style={styles.input}
            placeholder={t("searchRoutes")}
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
          />
        </View>
      </View>

      {routesQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : routesQ.isError ? (
        <View style={styles.center} testID="routes-error-state">
          <Icon name="cloud-off-outline" size={56} color={colors.muted} />
          <Text style={styles.emptyTitle}>{t("loadFailed")}</Text>
          <BigButton testID="routes-retry-button" label={t("retry")} icon="refresh" onPress={() => routesQ.refetch()} variant="secondary" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={routesQ.isRefetching} onRefresh={routesQ.refetch} tintColor={colors.brandPrimary} />}
          renderItem={({ item }) => <RouteCard route={item} onPress={() => router.push(`/route/${item.id}`)} />}
          ListEmptyComponent={
            <View style={styles.center} testID="routes-empty-state">
              <Icon name="bus-alert" size={56} color={colors.muted} />
              <Text style={styles.emptyTitle}>{t("noRoutes")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: "900", color: colors.onSurface },
  inputWrap: { height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderStrong, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, backgroundColor: colors.surface },
  input: { flex: 1, fontSize: 17, color: colors.onSurface, height: 56 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.onSurfaceSecondary, textAlign: "center" },
}));
