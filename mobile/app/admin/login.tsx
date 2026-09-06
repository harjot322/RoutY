import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

export default function AdminLogin() {
  const { t } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await api.admin.login(username.trim(), password);
      await qc.invalidateQueries({ queryKey: ["admin-me"] });
      router.replace("/admin");
    } catch {
      setError(t("loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root} testID="admin-login-screen">
      <ScreenHeader title={t("adminLogin")} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={16} style={{ flex: 1 }}>
        <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Icon name="shield-account" size={40} color={colors.onBrandPrimary} />
            </View>
            <Text style={styles.heroText}>{t("adminHint")}</Text>
          </View>
          <View style={styles.field}>
            <Icon name="account" size={24} color={colors.muted} />
            <TextInput testID="admin-username-input" style={styles.input} placeholder={t("username")} placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} returnKeyType="next" />
          </View>
          <View style={styles.field}>
            <Icon name="lock" size={24} color={colors.muted} />
            <TextInput testID="admin-password-input" style={styles.input} placeholder={t("password")} placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} returnKeyType="go" onSubmitEditing={submit} />
          </View>
          {!!error && <Text style={styles.error} testID="admin-login-error">{error}</Text>}
          <BigButton testID="admin-login-button" label={t("login")} icon="login" onPress={submit} loading={loading} disabled={!username || !password} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, padding: 16, gap: 16, justifyContent: "center" },
  hero: { alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  heroText: { color: colors.muted, fontSize: 14, textAlign: "center" },
  field: { height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderStrong, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 17, color: colors.onSurface, height: 56 },
  error: { color: colors.error, fontWeight: "700", fontSize: 15, textAlign: "center" },
}));
