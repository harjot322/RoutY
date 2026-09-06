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
    walk: {
      bg: colors.success,
      soft: colors.successSoft,
      icon: "walk" as const,
      label: lang === "hi" ? "चलो · WALK" : "WALK",
      hint: t("walkHint"),
      badgeColor: "#10B981",
    },
    run: {
      bg: colors.warning,
      soft: colors.warningSoft,
      icon: "run-fast" as const,
      label: lang === "hi" ? "दौड़ो · RUN" : "RUN",
      hint: t("runHint"),
      badgeColor: "#F59E0B",
    },
    wait: {
      bg: colors.error,
      soft: colors.errorSoft,
      icon: "hand-back-left" as const,
      label: lang === "hi" ? "रुको · WAIT" : "WAIT",
      hint: t("waitHint"),
      badgeColor: "#EF4444",
    },
  }[verdict];

  const walkMin = Math.max(1, Math.round(walkS / 60));
  const busMin = Math.max(1, Math.round(etaS / 60));
  const progressRatio = Math.min(1, Math.max(0.1, walkS / (etaS || 1)));

  return (
    <View style={[styles.card, { borderLeftColor: cfg.badgeColor }]} testID={`catchability-${verdict}`}>
      <View style={styles.topRow}>
        <View style={[styles.pill, { backgroundColor: cfg.soft, borderColor: cfg.bg }]}>
          <Icon name={cfg.icon} size={18} color={cfg.badgeColor} />
          <Text style={[styles.pillText, { color: cfg.badgeColor }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.busEtaText}>
          {lang === "hi" ? "बस" : "Bus"} {busMin} {lang === "hi" ? "मिनट" : "min"}
        </Text>
      </View>

      <Text style={styles.hint}>{cfg.hint}</Text>

      {/* Walking Pace vs Bus ETA Progress Track */}
      <View style={styles.trackContainer}>
        <View style={styles.trackBg}>
          <View style={[styles.trackFill, { width: `${Math.round(progressRatio * 100)}%`, backgroundColor: cfg.badgeColor }]} />
        </View>
        <View style={styles.trackLabels}>
          <Text style={styles.trackLabelLeft}>
            🚶 {fmtDistance(distanceM, lang)} ({walkMin} {lang === "hi" ? "मिनट पैदल" : "min walk"})
          </Text>
          <Text style={styles.trackLabelRight}>
            🚍 {busMin} {lang === "hi" ? "मिनट में आगमन" : "min ETA"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  busEtaText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  hint: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  trackContainer: {
    gap: 6,
    marginTop: 2,
  },
  trackBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 3,
  },
  trackLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trackLabelLeft: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  trackLabelRight: {
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: "700",
  },
}));
