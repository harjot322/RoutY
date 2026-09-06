import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";

type ToastType = "info" | "success" | "error" | "warning";
type Ctx = { show: (message: string, type?: ToastType) => void };
const ToastContext = createContext<Ctx>({ show: () => {} });

const icons: Record<ToastType, string> = { info: "information", success: "check-circle", error: "alert-circle", warning: "alert" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();

  const show = useCallback((message: string, type: ToastType = "info") => {
    setToast({ message, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const bg = toast ? { info: colors.surfaceInverse, success: colors.success, error: colors.error, warning: colors.warning }[toast.type] : colors.surfaceInverse;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          entering={FadeInUp.duration(250)}
          exiting={FadeOutUp.duration(200)}
          style={[styles.wrap, { top: insets.top + 8 }]}
          pointerEvents="none"
        >
          <View style={[styles.toast, { backgroundColor: bg }]} testID="toast-message">
            <Icon name={icons[toast.type]} size={24} color={colors.onSurfaceInverse} />
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const useStyles = makeStyles((colors) => ({
  wrap: { position: "absolute", left: 16, right: 16 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.borderStrong,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flex: 1, color: colors.onSurfaceInverse, fontSize: 16, fontWeight: "600" },
}));
