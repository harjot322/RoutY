import React from "react";
import { Pressable, Text, View } from "react-native";

import { Route } from "@/src/api";
import { Icon } from "@/src/components/Icon";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

export function RouteCard({ route, onPress }: { route: Route; onPress: () => void }) {
  const { t, lang } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]} testID={`route-card-${route.number}`}>
      <View style={[styles.numBadge, { backgroundColor: route.color }]}>
        <Icon name="bus" size={18} color="#FFFFFF" />
        <Text style={styles.numText}>{route.number}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {lang === "hi" ? (route.name_hi || route.name) : route.name}
        </Text>
        <Text style={styles.subName} numberOfLines={1}>
          {lang === "hi" ? route.name : (route.name_hi || "")}
        </Text>
        <Text style={styles.meta}>
          {t("liveBuses", { n: route.bus_count ?? 0 })} · {t("stops", { n: route.stops.length })}
        </Text>
      </View>
      <View style={styles.arrowWrap}>
        <Icon name="chevron-right" size={24} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: { backgroundColor: colors.surfaceSecondary, opacity: 0.9 },
  numBadge: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 2 },
  numText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  subName: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: "600" },
  arrowWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
}));
