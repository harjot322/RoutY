import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";

type Props = { title: string; subtitle?: string; right?: React.ReactNode; badgeColor?: string; badgeText?: string; testID?: string };

/** Sticky, safe-area aware header with a big back button. */
export function ScreenHeader({ title, subtitle, right, badgeColor, badgeText, testID }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]} testID={testID}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/map"))} style={styles.back} testID="header-back-button">
        <Icon name="arrow-left" size={28} color={colors.onSurface} />
      </Pressable>
      {badgeText && (
        <View style={[styles.badge, { backgroundColor: badgeColor ?? colors.brandPrimary }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingBottom: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  badge: { height: 44, minWidth: 48, paddingHorizontal: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.onBrand, fontWeight: "800", fontSize: 15 },
  title: { fontSize: 19, fontWeight: "800", color: colors.onSurface },
  sub: { fontSize: 13, color: colors.muted },
}));
