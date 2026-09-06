import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";

type Props = {
  label: string;
  onPress: () => void;
  icon?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  testID: string;
  style?: any;
};

/** 56px-tall, high-contrast button for rural / outdoor use. */
export function BigButton({ label, onPress, icon, variant = "primary", loading, disabled, testID, style }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.brandPrimary, fg: colors.onBrandPrimary, border: colors.brandPrimary },
    secondary: { bg: colors.brandSecondary, fg: colors.onBrandSecondary, border: colors.brandSecondary },
    danger: { bg: colors.error, fg: colors.onError, border: colors.error },
    ghost: { bg: colors.surface, fg: colors.onSurface, border: colors.borderStrong },
  }[variant];
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={24} color={palette.fg} />}
          <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  btn: { minHeight: 56, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontSize: 17, fontWeight: "700" },
}));
