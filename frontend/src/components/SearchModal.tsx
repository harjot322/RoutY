import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Route, SearchResult, api } from "@/src/api";
import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

type Props = { visible: boolean; onClose: () => void; routes: Route[]; coords: { lat: number; lng: number } | null };

/** Full-screen "From → To" finder. Unmatched searches are silently logged as unserved demand. */
export function SearchModal({ visible, onClose, routes, coords }: Props) {
  const insets = useSafeAreaInsets();
  const { t, tr, lang } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [focused, setFocused] = useState<"from" | "to">("from");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);

  const stopNames = useMemo(() => {
    const seen = new Map<string, { en: string; hi: string }>();
    routes.forEach((r) => r.stops.forEach((s) => seen.set(s.name, { en: s.name, hi: s.name_hi })));
    return Array.from(seen.values());
  }, [routes]);

  const typed = (focused === "from" ? from : to).toLowerCase();
  const suggestions = stopNames.filter((s) => !typed || s.en.toLowerCase().includes(typed) || s.hi.includes(typed)).slice(0, 12);

  const run = async () => {
    if (!from.trim() || !to.trim()) return;
    setLoading(true);
    try {
      const data = await api.search(from.trim(), to.trim(), coords?.lat, coords?.lng);
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResults(null);
    setFrom("");
    setTo("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={reset} presentationStyle="fullScreen">
      <View style={[styles.root, { paddingTop: insets.top + 8 }]} testID="search-modal">
        <View style={styles.header}>
          <Pressable onPress={reset} style={styles.back} testID="search-close-button">
            <Icon name="arrow-left" size={28} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>{t("findBus")}</Text>
        </View>

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
            onSubmitEditing={run}
          />
        </View>

        {/* Tap-to-fill village chips: easier than typing for many users */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow} keyboardShouldPersistTaps="handled">
          {suggestions.map((s) => (
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
          <BigButton testID="search-submit-button" label={t("findBus")} icon="magnify" onPress={run} loading={loading} disabled={!from.trim() || !to.trim()} />
        </View>

        {results && (
          <FlatList
            data={results}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={results.length ? <Text style={styles.section}>{t("resultsTitle")}</Text> : null}
            ListEmptyComponent={
              <View style={styles.empty} testID="search-empty-state">
                <Icon name="bus-alert" size={56} color={colors.muted} />
                <Text style={styles.emptyTitle}>{t("noRouteFound")}</Text>
                <Text style={styles.emptyBody}>{t("demandNoted")}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.result}
                testID={`search-result-${item.number}`}
                onPress={() => {
                  reset();
                  router.push(`/route/${item.id}`);
                }}
              >
                <View style={[styles.badge, { backgroundColor: item.color }]}>
                  <Text style={styles.badgeText}>{item.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName}>{tr(item.name, item.name_hi)}</Text>
                  <Text style={styles.resultMeta}>
                    {tr(item.from_stop.name, item.from_stop.name_hi)} → {tr(item.to_stop.name, item.to_stop.name_hi)} · {t("stopsBetween", { n: item.stops_between })}
                  </Text>
                </View>
                <Icon name="chevron-right" size={28} color={colors.muted} />
              </Pressable>
            )}
          />
        )}
        {!results && lang === "hi" && <Text style={styles.tip}>गाँव का नाम ऊपर से चुनें या लिखें</Text>}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8 },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "900", color: colors.onSurface },
  inputWrap: { marginHorizontal: 16, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 17, color: colors.onSurface, height: 56 },
  chipRow: { height: 56, flexGrow: 0 },
  chips: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceTertiary },
  section: { fontSize: 14, fontWeight: "800", color: colors.muted, textTransform: "uppercase", marginBottom: 4 },
  result: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  badge: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.onBrand, fontWeight: "800" },
  resultName: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  resultMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { alignItems: "center", gap: 8, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  emptyBody: { fontSize: 14, color: colors.muted, textAlign: "center" },
  tip: { textAlign: "center", color: colors.muted, fontSize: 14 },
}));
