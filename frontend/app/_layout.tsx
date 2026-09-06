import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { OfflineBanner } from "@/src/components/OfflineBanner";
import { ToastProvider } from "@/src/components/Toast";
import { FavoritesProvider } from "@/src/favorites/FavoritesContext";
import { LanguageProvider } from "@/src/i18n/LanguageContext";
import { LiveProvider } from "@/src/live/LiveContext";
import { queryClient } from "@/src/query-client";
import { useTheme } from "@/src/theme";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  // Prewarm the icon font so glyphs render immediately (Expo Go on Android needs this).
  useFonts({
    MaterialDesignIcons: require("@react-native-vector-icons/material-design-icons/fonts/MaterialDesignIcons.ttf"),
  });
  const { colors } = useTheme();

  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <LanguageProvider>
              <LiveProvider>
                <FavoritesProvider>
                <ToastProvider>
                  <View style={{ flex: 1, backgroundColor: colors.surface }}>
                    <StatusBar style="dark" />
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="route/[id]" />
                      <Stack.Screen name="timetable/[id]" />
                      <Stack.Screen name="suggest" />
                      <Stack.Screen name="admin" />
                    </Stack>
                    <OfflineBanner />
                  </View>
                </ToastProvider>
                </FavoritesProvider>
              </LiveProvider>
            </LanguageProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
