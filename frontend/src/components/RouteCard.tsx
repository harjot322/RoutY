import React from "react";
import { Pressable, Text, View } from "react-native";

import { Route } from "@/src/api";
import { Icon } from "@/src/components/Icon";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

export function RouteCard({ route, onPress }: { route: Route; onPress: () => void }) {
  const { t, tr } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]} testID={`route-card-${route.number}`}>
      <View style={[styles.bar, { backgroundColor: route.color }]} />
      <View style={[styles.numBadge, { backgroundColor: route.color }]}>
        <Icon name="bus" size={20} color={colors.onBrand} />
        <Text style={styles.numText}>{route.number}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{tr(route.name, route.name_hi)}</Text>
        <Text style={styles.meta}>
          {t("liveBuses", { n: route.bus_count ?? 0 })} · {t("stops", { n: route.stops.length })}
        </Text>
      </View>
      <Icon name="chevron-right" size={28} color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 72,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 12,
    overflow: "hidden",
    gap: 12,
  },
  pressed: { backgroundColor: colors.surfaceSecondary },
  bar: { width: 8, alignSelf: "stretch" },
  numBadge: { width: 56, height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  numText: { color: colors.onBrand, fontWeight: "800", fontSize: 14 },
  body: { flex: 1, gap: 4, paddingVertical: 8 },
  name: { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 13, color: colors.muted },
}));
