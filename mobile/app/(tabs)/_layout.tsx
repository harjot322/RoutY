import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { Platform } from "react-native";

import { Icon } from "@/src/components/Icon";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { useTheme } from "@/src/theme";

const isIOS26 = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

export default function TabsLayout() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  if (isIOS26) {
    return (
      <NativeTabs tintColor={colors.brandPrimary}>
        <NativeTabs.Trigger name="map">
          <NativeTabs.Trigger.Icon sf="map.fill" />
          <NativeTabs.Trigger.Label>{t("tabMap")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="routes">
          <NativeTabs.Trigger.Icon sf="bus.fill" />
          <NativeTabs.Trigger.Label>{t("tabRoutes")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon sf="gearshape.fill" />
          <NativeTabs.Trigger.Label>{t("tabSettings")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{ title: t("tabMap"), tabBarIcon: ({ color, size }) => <Icon name="map" size={size} color={color} />, tabBarButtonTestID: "tab-map" }}
      />
      <Tabs.Screen
        name="routes"
        options={{ title: t("tabRoutes"), tabBarIcon: ({ color, size }) => <Icon name="bus" size={size} color={color} />, tabBarButtonTestID: "tab-routes" }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t("tabSettings"), tabBarIcon: ({ color, size }) => <Icon name="cog" size={size} color={color} />, tabBarButtonTestID: "tab-settings" }}
      />
    </Tabs>
  );
}
