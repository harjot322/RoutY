import React from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/Icon";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { useLive } from "@/src/live/LiveContext";
import { makeStyles, useTheme } from "@/src/theme";

/** Drops down from the top when the live feed is lost; last known ETAs stay visible. */
export function OfflineBanner() {
  const { status } = useLive();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  if (status !== "offline") return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={[styles.wrap, { paddingTop: insets.top + 4 }]} testID="offline-banner">
      <View style={styles.row}>
        <Icon name="wifi-off" size={20} color={colors.onSurfaceInverse} />
        <Text style={styles.text}>{t("reconnecting")}</Text>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.surfaceInverse, paddingBottom: 8, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  text: { color: colors.onSurfaceInverse, fontSize: 14, fontWeight: "600" },
}));
