import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Bus, Route, SearchResult, UnifiedSearchRoute, UnifiedSearchStop, api, fmtEta } from "@/src/api";
import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  routes: Route[];
  coords: { lat: number; lng: number } | null;
  onSelectBus?: (busId: string) => void;
  onSelectRoute?: (routeId: string) => void;
  onSelectStop?: (stop: { id: string; lat: number; lng: number; name: string }) => void;
};

export function SearchModal({ visible, onClose, routes, coords, onSelectBus, onSelectRoute, onSelectStop }: Props) {
  const insets = useSafeAreaInsets();
  const { t, tr, lang } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"search" | "plan">("search");
  const [searchQuery, setSearchQuery] = useState("");

  // Plan trip state
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [focused, setFocused] = useState<"from" | "to">("from");
  const [planningLoading, setPlanningLoading] = useState(false);
  const [planResults, setPlanResults] = useState<SearchResult[] | null>(null);

  // Unified search query
  const searchQ = useQuery({
    queryKey: ["unified-search", searchQuery],
    queryFn: () => api.unifiedSearch(searchQuery),
    enabled: visible && activeTab === "search",
    refetchInterval: 5000,
  });

  const stopNames = useMemo(() => {
    const seen = new Map<string, { en: string; hi: string }>();
    routes.forEach((r) => r.stops.forEach((s) => seen.set(s.name, { en: s.name, hi: s.name_hi })));
    return Array.from(seen.values());
  }, [routes]);

  const typed = (focused === "from" ? from : to).toLowerCase();
  const planSuggestions = stopNames.filter((s) => !typed || s.en.toLowerCase().includes(typed) || s.hi.includes(typed)).slice(0, 12);

  const runPlan = async () => {
    if (!from.trim() || !to.trim()) return;
    setPlanningLoading(true);
    try {
      const data = await api.search(from.trim(), to.trim(), coords?.lat, coords?.lng);
      setPlanResults(data.results);
    } catch {
      setPlanResults([]);
    } finally {
      setPlanningLoading(false);
    }
  };

  const reset = () => {
    setSearchQuery("");
    setPlanResults(null);
    setFrom("");
    setTo("");
    onClose();
  };

  const handleBusClick = (b: Bus) => {
    reset();
    if (onSelectBus) {
      onSelectBus(b.id);
    }
  };

  const handleRouteClick = (r: Route | UnifiedSearchRoute) => {
    reset();
    if (onSelectRoute) {
      onSelectRoute(r.id);
    } else {
      router.push(`/route/${r.id}`);
    }
  };

  const handleStopClick = (s: UnifiedSearchStop) => {
    reset();
    if (onSelectStop) {
      onSelectStop({ id: s.id, lat: s.lat, lng: s.lng, name: s.name });
    } else {
      router.push(`/route/${s.route_id}`);
    }
  };

  const searchData = searchQ.data;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={reset} presentationStyle="fullScreen">
      <View style={[styles.root, { paddingTop: insets.top + 8 }]} testID="search-modal">
        {/* Header with close button */}
        <View style={styles.header}>
          <Pressable onPress={reset} style={styles.back} testID="search-close-button">
            <Icon name="arrow-left" size={28} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>{t("searchPlaceholder")}</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === "search" && styles.tabButtonActive]}
            onPress={() => setActiveTab("search")}
            testID="search-tab-intelligent"
          >
            <Icon name="magnify" size={18} color={activeTab === "search" ? colors.onBrandPrimary : colors.muted} />
            <Text style={[styles.tabButtonText, activeTab === "search" && styles.tabButtonTextActive]}>
              {t("searchTabsIntelligent")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "plan" && styles.tabButtonActive]}
            onPress={() => setActiveTab("plan")}
            testID="search-tab-plan"
          >
            <Icon name="map-marker-path" size={18} color={activeTab === "plan" ? colors.onBrandPrimary : colors.muted} />
            <Text style={[styles.tabButtonText, activeTab === "plan" && styles.tabButtonTextActive]}>
              {t("searchTabsPlan")}
            </Text>
          </Pressable>
        </View>

        {/* Intelligent Unified Search Tab */}
        {activeTab === "search" && (
          <View style={{ flex: 1 }}>
            <View style={styles.inputWrap}>
              <Icon name="magnify" size={22} color={colors.brandPrimary} />
              <TextInput
                testID="unified-search-input"
                style={styles.input}
                placeholder={t("searchAll")}
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} style={styles.clearBtn} testID="search-clear-button">
                  <Icon name="close-circle" size={20} color={colors.muted} />
                </Pressable>
              )}
            </View>

            {searchQ.isLoading && !searchData ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brandPrimary} />
              </View>
            ) : searchData?.total === 0 ? (
              <View style={styles.empty} testID="search-empty-state">
                <Icon name="bus-alert" size={56} color={colors.muted} />
                <Text style={styles.emptyTitle}>{t("searchNoResults", { q: searchQuery })}</Text>
                <Text style={styles.emptyBody}>{t("searchSuggestionsHelp")}</Text>
                <View style={styles.chipSuggestions}>
                  {["R1", "R2", "Dewa Sharif", "Barabanki Bus Stand"].map((s) => (
                    <Pressable
                      key={s}
                      style={styles.chip}
                      onPress={() => setSearchQuery(s)}
                      testID={`suggest-chip-${s}`}
                    >
                      <Text style={styles.chipText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
                <BigButton
                  testID="search-suggest-route-button"
                  label={t("suggestRoute")}
                  icon="lightbulb-on-outline"
                  variant="secondary"
                  onPress={() => {
                    reset();
                    router.push("/suggest");
                  }}
                  style={{ alignSelf: "stretch", marginTop: 16 }}
                />
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Buses section */}
                {searchData && searchData.buses.length > 0 && (
                  <View style={styles.sectionWrap}>
                    <View style={styles.sectionHeader}>
                      <Icon name="bus-multiple" size={18} color={colors.brandPrimary} />
                      <Text style={styles.sectionTitle}>{t("suggestedBuses")}</Text>
                    </View>
                    {searchData.buses.map((b) => (
                      <Pressable
                        key={b.id}
                        style={styles.cardItem}
                        onPress={() => handleBusClick(b)}
                        testID={`bus-result-${b.plate.replace(/\s+/g, "-")}`}
                      >
                        <View style={[styles.badge, { backgroundColor: b.color }]}>
                          <Text style={styles.badgeText}>{b.route_number}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{b.plate}</Text>
                            <View style={[styles.statusPillSmall, { backgroundColor: b.status === "delayed" ? colors.warningSoft : colors.successSoft }]}>
                              <Text style={[styles.statusPillSmallText, { color: b.status === "delayed" ? colors.warning : colors.success }]}>
                                {b.status === "delayed" ? t("statusDelayed") : t("statusInService")}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.cardSub} numberOfLines={1}>
                            {t("toward", { t: tr(b.terminus, b.terminus_hi) })} · {b.speed_kmph} km/h
                          </Text>
                          {b.next_stop && (
                            <Text style={styles.cardEtaText} numberOfLines={1}>
                              {t("nextBus")}: {tr(b.next_stop.name, b.next_stop.name_hi)} ({fmtEta(b.next_stop.eta_s, lang)})
                            </Text>
                          )}
                        </View>
                        <Icon name="crosshairs-gps" size={24} color={colors.brandPrimary} />
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Routes section */}
                {searchData && searchData.routes.length > 0 && (
                  <View style={styles.sectionWrap}>
                    <View style={styles.sectionHeader}>
                      <Icon name="routes" size={18} color={colors.brandPrimary} />
                      <Text style={styles.sectionTitle}>{t("suggestedRoutes")}</Text>
                    </View>
                    {searchData.routes.map((r) => (
                      <Pressable
                        key={r.id}
                        style={styles.cardItem}
                        onPress={() => handleRouteClick(r)}
                        testID={`route-result-${r.number}`}
                      >
                        <View style={[styles.badge, { backgroundColor: r.color }]}>
                          <Text style={styles.badgeText}>{r.number}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{tr(r.name, r.name_hi)}</Text>
                          <Text style={styles.cardSub} numberOfLines={1}>
                            {t("stops", { n: r.stops.length })} · {t("liveBuses", { n: r.bus_count ?? 0 })}
                          </Text>
                        </View>
                        <Icon name="chevron-right" size={24} color={colors.muted} />
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Stops section */}
                {searchData && searchData.stops.length > 0 && (
                  <View style={styles.sectionWrap}>
                    <View style={styles.sectionHeader}>
                      <Icon name="bus-stop" size={18} color={colors.brandPrimary} />
                      <Text style={styles.sectionTitle}>{t("suggestedStops")}</Text>
                    </View>
                    {searchData.stops.map((s) => (
                      <Pressable
                        key={s.id}
                        style={styles.cardItem}
                        onPress={() => handleStopClick(s)}
                        testID={`stop-result-${s.id}`}
                      >
                        <View style={[styles.badge, { backgroundColor: s.color || colors.brandPrimary }]}>
                          <Icon name="bus-stop" size={20} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{tr(s.name, s.name_hi)}</Text>
                          <Text style={styles.cardSub} numberOfLines={1}>{s.route_name}</Text>
                          {s.best_eta && (
                            <Text style={styles.cardEtaText} numberOfLines={1}>
                              {s.best_eta.route_number}: {fmtEta(s.best_eta.eta_s, lang)} ({s.best_eta.plate})
                            </Text>
                          )}
                        </View>
                        <Icon name="map-marker-radius" size={24} color={colors.brandPrimary} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* Plan Journey Tab (Point to Point) */}
        {activeTab === "plan" && (
          <View style={{ flex: 1 }}>
            <View style={styles.inputWrap}>
              <Icon name="circle-outline" size={22} color={colors.success} />
              <TextInput
                testID="search-from-input"
                style={styles.input}
                placeholder={t("from")}
                placeholderTextColor={colors.muted}
                value={from}
                onChangeText={setFrom}
                onFocus={() => setFocused("from")}
                returnKeyType="next"
              />
            </View>
            <View style={styles.inputWrap}>
              <Icon name="map-marker" size={22} color={colors.error} />
              <TextInput
                testID="search-to-input"
                style={styles.input}
                placeholder={t("to")}
                placeholderTextColor={colors.muted}
                value={to}
                onChangeText={setTo}
                onFocus={() => setFocused("to")}
                returnKeyType="search"
                onSubmitEditing={runPlan}
              />
            </View>

            {/* Tap-to-fill stop chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow} keyboardShouldPersistTaps="handled">
              {planSuggestions.map((s) => (
                <Pressable
                  key={s.en}
                  style={styles.chip}
                  testID={`stop-chip-${s.en.replace(/\s+/g, "-").toLowerCase()}`}
                  onPress={() => {
                    if (focused === "from") {
                      setFrom(s.en);
                      setFocused("to");
                    } else setTo(s.en);
                  }}
                >
                  <Text style={styles.chipText}>{tr(s.en, s.hi)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ paddingHorizontal: 16 }}>
              <BigButton
                testID="search-submit-button"
                label={t("findBus")}
                icon="magnify"
                onPress={runPlan}
                loading={planningLoading}
                disabled={!from.trim() || !to.trim()}
              />
            </View>

            {planResults && (
              <FlatList
                data={planResults}
                keyExtractor={(r) => r.id}
                contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={planResults.length ? <Text style={styles.sectionHeaderTitle}>{t("resultsTitle")}</Text> : null}
                ListEmptyComponent={
                  <View style={styles.empty} testID="search-empty-state">
                    <Icon name="bus-alert" size={56} color={colors.muted} />
                    <Text style={styles.emptyTitle}>{t("noRouteFound")}</Text>
                    <Text style={styles.emptyBody}>{t("demandNoted")}</Text>
                    <BigButton
                      testID="search-suggest-route-button"
                      label={t("suggestRoute")}
                      icon="lightbulb-on-outline"
                      variant="secondary"
                      onPress={() => {
                        reset();
                        router.push("/suggest");
                      }}
                      style={{ alignSelf: "stretch", marginTop: 8 }}
                    />
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.resultCard}
                    testID={`search-result-${item.number}`}
                    onPress={() => {
                      reset();
                      router.push(`/route/${item.id}`);
                    }}
                  >
                    <View style={styles.resultTop}>
                      <View style={[styles.badge, { backgroundColor: item.color }]}>
                        <Text style={styles.badgeText}>{item.number}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.resultName} numberOfLines={1}>{tr(item.name, item.name_hi)}</Text>
                        <Text style={styles.resultMeta} numberOfLines={2}>
                          {tr(item.from_stop.name, item.from_stop.name_hi)} → {tr(item.to_stop.name, item.to_stop.name_hi)}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={28} color={colors.muted} />
                    </View>
                    <View style={styles.factRow}>
                      <View style={styles.fact}>
                        <Icon name="cash" size={18} color={colors.success} />
                        <Text style={[styles.factText, { color: colors.success }]} testID={`result-fare-${item.number}`}>
                          {item.fare_inr != null ? `₹${item.fare_inr}` : "—"}
                        </Text>
                      </View>
                      <View style={styles.fact}>
                        <Icon name="clock-outline" size={18} color={colors.onSurface} />
                        <Text style={styles.factText}>{item.travel_s != null ? fmtEta(item.travel_s, lang) : "—"}</Text>
                      </View>
                      <View style={styles.fact}>
                        <Icon name="map-marker-distance" size={18} color={colors.onSurface} />
                        <Text style={styles.factText}>{item.distance_km != null ? `${item.distance_km} km` : "—"}</Text>
                      </View>
                    </View>
                    <Text style={styles.via} numberOfLines={2}>
                      {item.via.length ? `${t("viaStops", { n: item.via.length })}: ${item.via.map((v) => tr(v.name, v.name_hi)).join(" · ")}` : t("noVia")}
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.surfaceTertiary },
  title: { fontSize: 20, fontWeight: "900", color: colors.onSurface },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.brandPrimary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.muted,
  },
  tabButtonTextActive: {
    color: colors.onBrandPrimary,
  },
  inputWrap: {
    marginHorizontal: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  input: { flex: 1, fontSize: 16, color: colors.onSurface, height: 52 },
  clearBtn: { padding: 4 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionWrap: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  cardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cardEtaText: { fontSize: 13, fontWeight: "700", color: colors.brandPrimary, marginTop: 3 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusPillSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillSmallText: { fontSize: 11, fontWeight: "800" },
  chipSuggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 },
  chipRow: { height: 50, flexGrow: 0 },
  chips: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  sectionHeaderTitle: { fontSize: 12, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  resultCard: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resultTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  factRow: { flexDirection: "row", gap: 8 },
  fact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 0,
  },
  factText: { fontSize: 13, fontWeight: "800", color: colors.onSurface },
  via: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  badge: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  resultName: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  resultMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { alignItems: "center", gap: 8, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  emptyBody: { fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
}));
