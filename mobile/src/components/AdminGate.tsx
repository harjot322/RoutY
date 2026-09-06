import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { api } from "@/src/api";
import { useTheme } from "@/src/theme";

/** Redirects to the admin login when there is no valid token. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const me = useQuery({ queryKey: ["admin-me"], queryFn: api.admin.me, retry: 0, staleTime: 60000 });

  useEffect(() => {
    if (me.isError) router.replace("/admin/login");
  }, [me.isError, router]);

  if (me.isLoading || me.isError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }
  return <>{children}</>;
}
