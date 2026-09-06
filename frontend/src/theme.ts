// Design tokens for this app. Light theme only.Always modify the colors and theme to Dark, Light or Dark and Light according to the design guidelines.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces: backgrounds, from the screen down to small fills.
  surface: "#FFFFFF", // primary canvas
  onSurface: "#0F172A", // high-contrast slate-900 text & icons
  surfaceSecondary: "#F8FAFC", // cards, sheets, list rows (slate-50)
  onSurfaceSecondary: "#1E293B", // slate-800
  surfaceTertiary: "#F1F5F9", // input backgrounds, chips (slate-100)
  onSurfaceTertiary: "#334155", // slate-700
  surfaceInverse: "#0F172A", // midnight carbon popouts
  onSurfaceInverse: "#FFFFFF",
  muted: "#64748B", // slate-500 captions, placeholders

  // Brand: Uber-grade modern midnight carbon with electric accents
  brand: "#0F172A",
  onBrand: "#FFFFFF",
  brandPrimary: "#0F172A", // deep carbon CTA / selected state
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#F1F5F9", // subtle slate accent
  onBrandSecondary: "#0F172A",
  brandTertiary: "#E2E8F0",
  onBrandTertiary: "#1E293B",

  // Status: Ride-hailing semantic indicators (Walk / Run / Wait / SOS)
  success: "#10B981", // Emerald 500 (Walk / Live)
  onSuccess: "#FFFFFF",
  warning: "#F59E0B", // Amber 500 (Run / Caution)
  onWarning: "#FFFFFF",
  error: "#EF4444", // Crimson 500 (Wait / SOS)
  onError: "#FFFFFF",
  info: "#3B82F6", // Blue 500
  onInfo: "#FFFFFF",
  successSoft: "#ECFDF5",
  warningSoft: "#FFFBEB",
  errorSoft: "#FEF2F2",

  // Lines & borders
  border: "#E2E8F0", // hairline outline (slate-200)
  borderStrong: "#0F172A", // selected outlines
  divider: "#F1F5F9",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
export function setColorScheme(scheme: ColorScheme | null) {
  (Appearance as any).setColorScheme?.(scheme);
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "dark" && themes.dark ? "dark" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}


