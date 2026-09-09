import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Stop, api, fmtEta } from "@/src/api";
import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";
import { shareMessage } from "@/src/utils/share";

type Props = { visible: boolean; onClose: () => void; routeId: string; routeNumber: string; color: string; stops: Stop[]; initialFrom?: string | null };

/** Fare & travel-time calculator between any two stops, with the stop-by-stop breakdown. */
export function FareModal(props: Props) {
  if (!props.visible) return null;
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose} presentationStyle="pageSheet">
      <FareModalInner {...props} />
    </Modal>
  );
}

function FareModalInner({ onClose, routeId, routeNumber, color, stops, initialFrom }: Props) {
  const insets = useSafeAreaInsets();
  const { t, tr, lang } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const [from, setFrom] = useState<string | null>(initialFrom ?? stops[0]?.id ?? null);
  const [to, setTo] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["fare", routeId, from, to], queryFn: () => api.fare(routeId, from as string, to as string), enabled: !!from && !!to && from !== to });
  const d = q.data;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]} testID="fare-modal">
      <View style={styles.header}>
        <Text style={styles.title}>{t("fareCalc")}</Text>
        <Pressable onPress={onClose} style={styles.close} testID="fare-close">
          <Icon name="close" size={26} color={colors.onSurface} />
        </Pressable>
      </View>
      <Text style={styles.label}>{t("selectFrom")}</Text>
      <StopChips stops={stops} color={color} value={from} onChange={setFrom} exclude={to} testPrefix="fare-from" />
      <Text style={styles.label}>{t("selectTo")}</Text>
        <StopChips stops={stops} color={color} value={to} onChange={setTo} exclude={from} testPrefix="fare-to" />

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
          {q.isLoading && <ActivityIndicator color={colors.brandPrimary} />}
          {!to && <Text style={styles.hint}>{t("selectTo")} →</Text>}
          {d && (
            <>
              <View style={styles.summary} testID="fare-summary">
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>{t("fare")}</Text>
                  <Text style={[styles.statValue, { color: colors.success }]} testID="fare-amount">₹{d.fare_inr}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>{t("travelTime")}</Text>
                  <Text style={styles.statValue}>{fmtEta(d.travel_s, lang)}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>{t("distance")}</Text>
                  <Text style={styles.statValue}>{d.distance_km} km</Text>
                </View>
              </View>
              <Text style={styles.sub}>{d.via.length ? t("viaStops", { n: d.via.length }) : t("noVia")}</Text>
              <Text style={styles.section}>{t("perStop")}</Text>
              <View style={styles.legRow}>
                <View style={[styles.dot, { borderColor: color }]} />
                <Text style={[styles.legName, { flex: 1 }]} numberOfLines={1}>{tr(d.from.name, d.from.name_hi)}</Text>
                <Text style={styles.legMeta}>0 min · ₹0</Text>
              </View>
              {d.legs.map((l) => (
                <View key={l.stop_id} style={styles.legRow} testID={`fare-leg-${l.stop_id}`}>
                  <View style={[styles.dot, { borderColor: color }]} />
                  <Text style={[styles.legName, { flex: 1 }]} numberOfLines={1}>{tr(l.name, l.name_hi)}</Text>
                  <Text style={styles.legMeta}>{fmtEta(l.eta_from_start_s, lang)} · ₹{l.fare_inr}</Text>
                </View>
              ))}
              <BigButton
                testID="fare-share-button"
                label={t("shareEta")}
                icon="share-variant"
                variant="secondary"
                onPress={() =>
                  shareMessage(t("shareFare", { r: routeNumber, a: tr(d.from.name, d.from.name_hi), b: tr(d.to.name, d.to.name_hi), f: d.fare_inr, m: Math.round(d.travel_s / 60), k: d.distance_km }))
                }
              />
            </>
          )}
        </ScrollView>
      </View>
  );
}

function StopChips({ stops, color, value, onChange, exclude, testPrefix }: { stops: Stop[]; color: string; value: string | null; onChange: (id: string) => void; exclude: string | null; testPrefix: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { tr } = useLanguage();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips}>
      {stops.map((s) => {
        const active = s.id === value;
        const disabled = s.id === exclude;
        return (
          <Pressable key={s.id} disabled={disabled} onPress={() => onChange(s.id)} style={[styles.chip, active && { backgroundColor: color, borderColor: color }, disabled && { opacity: 0.35 }]} testID={`${testPrefix}-${s.id}`}>
            <Text style={[styles.chipText, active && { color: colors.onBrand }]} numberOfLines={1}>{tr(s.name, s.name_hi)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: "900", color: colors.onSurface },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, fontWeight: "800", color: colors.muted, textTransform: "uppercase", paddingHorizontal: 16, paddingTop: 8 },
  chipRow: { height: 56, flexGrow: 0 },
  chips: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: { height: 36, maxWidth: 220, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipText: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  hint: { color: colors.muted, fontSize: 15, textAlign: "center", paddingVertical: 24 },
  summary: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 12, gap: 4, minWidth: 0 },
  statLabel: { fontSize: 12, fontWeight: "700", color: colors.muted },
  statValue: { fontSize: 20, fontWeight: "900", color: colors.onSurface },
  sub: { color: colors.muted, fontSize: 14 },
  section: { fontSize: 13, fontWeight: "800", color: colors.muted, textTransform: "uppercase", marginTop: 8 },
  legRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, backgroundColor: colors.surface },
  legName: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  legMeta: { fontSize: 14, fontWeight: "700", color: colors.brandPrimary, flexShrink: 0 },
}));
