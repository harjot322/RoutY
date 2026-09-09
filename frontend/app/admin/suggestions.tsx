import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Suggestion, api } from "@/src/api";
import { AdminGate } from "@/src/components/AdminGate";
import { Icon } from "@/src/components/Icon";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

const STATUSES: Suggestion["status"][] = ["new", "reviewed", "approved", "rejected"];

export default function AdminSuggestions() {
  return (
    <AdminGate>
      <Suggestions />
    </AdminGate>
  );
}

function Suggestions() {
  const { t } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-suggestions"], queryFn: api.admin.suggestions, refetchInterval: 10000 });
  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Suggestion["status"] }) => api.admin.setSuggestionStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-suggestions"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });

  const convertMut = useMutation({
    mutationFn: (id: string) => api.admin.convertSuggestion(id, { bus_count: 2 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-suggestions"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["admin-buses"] });
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
      toast.show(t("routeArranged"), "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const statusColor: Record<Suggestion["status"], string> = { new: colors.brandPrimary, reviewed: colors.info, approved: colors.success, rejected: colors.error };
  const statusLabel: Record<Suggestion["status"], string> = { new: t("statusNew"), reviewed: t("statusReviewed"), approved: t("statusApproved"), rejected: t("statusRejected") };

  return (
    <View style={styles.root} testID="admin-suggestions-screen">
      <ScreenHeader title={t("suggestions")} subtitle={q.data ? t("requests", { n: q.data.length }) : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
        {q.isLoading && <ActivityIndicator color={colors.brandPrimary} />}
        {q.data && q.data.length === 0 && <Text style={styles.empty} testID="suggestions-empty">{t("noSuggestions")}</Text>}
        {q.data?.map((s) => (
          <View key={s.id} style={styles.card} testID={`suggestion-${s.id}`}>
            <View style={styles.head}>
              <Icon name="lightbulb-on-outline" size={22} color={colors.brandPrimary} />
              <Text style={styles.pair} numberOfLines={2}>{s.from_text} → {s.to_text}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor[s.status] }]}>
                <Text style={styles.badgeText}>{statusLabel[s.status]}</Text>
              </View>
            </View>
            {!!s.village && (
              <View style={styles.head}>
                <Icon name="home-group" size={18} color={colors.muted} />
                <Text style={styles.meta}>{s.village}</Text>
              </View>
            )}
            {!!s.notes && <Text style={styles.notes}>{s.notes}</Text>}
            <Text style={styles.meta}>
              {new Date(s.created_at).toLocaleString()}{s.contact ? ` · ${s.contact}` : ""}{s.lat != null ? ` · ${s.lat.toFixed(3)}, ${s.lng?.toFixed(3)}` : ""}
            </Text>

            {/* Arrange and deploy route button */}
            <Pressable
              style={styles.deployBtn}
              onPress={() => convertMut.mutate(s.id)}
              disabled={convertMut.isPending}
              testID={`deploy-suggestion-${s.id}`}
            >
              <Icon name="road-variant" size={18} color="#FFFFFF" />
              <Text style={styles.deployBtnText}>{t("arrangeRoute")}</Text>
            </Pressable>

            <View style={styles.actions}>
              {STATUSES.filter((st) => st !== s.status).map((st) => (
                <Pressable key={st} style={[styles.actionBtn, { borderColor: statusColor[st] }]} onPress={() => mut.mutate({ id: s.id, status: st })} testID={`suggestion-${s.id}-${st}`}>
                  <Text style={[styles.actionText, { color: statusColor[st] }]} numberOfLines={1}>{statusLabel[st]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  empty: { color: colors.muted, textAlign: "center", fontSize: 15, paddingVertical: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  pair: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.onSurface },
  badge: { paddingHorizontal: 10, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  badgeText: { color: colors.onBrand, fontWeight: "800", fontSize: 12 },
  notes: { fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.muted },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  deployBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brandPrimary,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  deployBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  actionBtn: { flexGrow: 1, flexBasis: "30%", height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  actionText: { fontWeight: "800", fontSize: 13 },
}));
