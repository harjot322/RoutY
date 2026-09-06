import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";
import { announce } from "@/src/utils/speech";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang, audio, setAudio } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.root} testID="settings-screen">
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>{t("tabSettings")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
        <View style={styles.card}>
          <View style={styles.rowHead}>
            <Icon name="translate" size={26} color={colors.brandPrimary} />
            <Text style={styles.cardTitle}>{t("language")}</Text>
          </View>
          <View style={styles.langRow}>
            <Pressable testID="language-en-button" onPress={() => setLang("en")} style={[styles.langBtn, lang === "en" && styles.langBtnActive]}>
              <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>English</Text>
            </Pressable>
            <Pressable testID="language-hi-button" onPress={() => setLang("hi")} style={[styles.langBtn, lang === "hi" && styles.langBtnActive]}>
              <Text style={[styles.langText, lang === "hi" && styles.langTextActive]}>हिन्दी</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowHead}>
              <Icon name="volume-high" size={26} color={colors.brandPrimary} />
              <View>
                <Text style={styles.cardTitle}>{t("audioAnnouncements")}</Text>
                <Text style={styles.sub}>{t("audioHint")}</Text>
              </View>
            </View>
            <Switch
              testID="audio-toggle"
              value={audio}
              onValueChange={setAudio}
              trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }}
              thumbColor={colors.surface}
            />
          </View>
          <BigButton
            testID="test-voice-button"
            label={t("testVoice")}
            icon="play"
            variant="secondary"
            onPress={() => announce(t("announcement", { r: "R2", m: 2, s: lang === "hi" ? "बाराबंकी बस स्टैंड" : "Barabanki Bus Stand" }), lang)}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowHead}>
            <Icon name="information-outline" size={26} color={colors.brandPrimary} />
            <Text style={styles.cardTitle}>{t("appName")}</Text>
          </View>
          <Text style={styles.about}>{t("about")}</Text>
          <Text style={styles.sub}>{t("version")}</Text>
        </View>

        <Pressable style={styles.adminRow} onPress={() => router.push("/suggest")} testID="suggest-route-link">
          <Icon name="lightbulb-on-outline" size={26} color={colors.brandPrimary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.adminText, { color: colors.onSurface }]}>{t("suggestRoute")}</Text>
            <Text style={styles.sub}>{t("suggestHint")}</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.muted} />
        </Pressable>

        <Pressable style={styles.adminRow} onPress={() => router.push("/admin/login")} testID="admin-access-link">
          <Icon name="shield-account-outline" size={24} color={colors.muted} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.adminText}>{t("adminAccess")}</Text>
            <Text style={styles.sub}>{t("adminHint")}</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.muted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: "900", color: colors.onSurface },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 16, borderWidth: 1, borderColor: colors.border },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  langRow: { flexDirection: "row", gap: 12 },
  langBtn: { flex: 1, height: 64, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  langBtnActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandPrimary },
  langText: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  langTextActive: { color: colors.onBrandPrimary },
  about: { fontSize: 15, color: colors.onSurfaceSecondary, lineHeight: 22 },
  adminRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  adminText: { fontSize: 16, fontWeight: "700", color: colors.muted },
}));
