import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Platform, Text, View } from "react-native";

import { Icon } from "@/src/components/Icon";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";
import { Verdict, catchability, fmtDistance } from "@/src/utils/geo";

type Props = { distanceM: number; etaS: number };

/** Colour-coded verdict: Walk (green) / Run (yellow) / Wait (red). Always paired with icon + text. */
export function CatchabilityCard({ distanceM, etaS }: Props) {
  const { t, lang } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const { verdict, walkS } = catchability(distanceM, etaS);
  const prev = useRef<Verdict | null>(null);

  useEffect(() => {
    if (prev.current && prev.current !== verdict && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prev.current = verdict;
  }, [verdict]);

  const cfg = {
    walk: { bg: colors.success, soft: colors.successSoft, icon: "walk", label: t("walk"), hint: t("walkHint") },
    run: { bg: colors.warning, soft: colors.warningSoft, icon: "run-fast", label: t("run"), hint: t("runHint") },
    wait: { bg: colors.error, soft: colors.errorSoft, icon: "hand-back-left", label: t("wait"), hint: t("waitHint") },
  }[verdict];

  return (
    <View style={[styles.wrap, { backgroundColor: cfg.soft, borderColor: cfg.bg }]} testID={`catchability-${verdict}`}>
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Icon name={cfg.icon} size={34} color={colors.onSuccess} />
        <Text style={styles.badgeText}>{cfg.label}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.hint}>{cfg.hint}</Text>
        <Text style={styles.meta}>
          {fmtDistance(distanceM, lang)} · {t("walk")} {Math.max(1, Math.round(walkS / 60))} {lang === "hi" ? "मिनट" : "min"}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 2, padding: 8 },
  badge: { width: 72, height: 72, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.onSuccess, fontWeight: "800", fontSize: 14, marginTop: 2 },
  body: { flex: 1, gap: 4 },
  hint: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 13 },
}));
