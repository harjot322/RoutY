import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import { useUserLocation } from "@/src/hooks/useUserLocation";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

/** Commuters request a bus to their village / a new route; admins review it. */
export default function SuggestRouteScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const loc = useUserLocation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [village, setVillage] = useState("");
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [attach, setAttach] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.suggest({
        from_text: from.trim(),
        to_text: to.trim(),
        village: village.trim(),
        notes: notes.trim(),
        contact: contact.trim(),
        lat: attach && loc.coords ? loc.coords.lat : undefined,
        lng: attach && loc.coords ? loc.coords.lng : undefined,
      });
      toast.show(t("suggestSent"), "success");
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/settings");
    } catch (e: any) {
      toast.show(e.message ?? t("loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  const Field = FieldInput;

  return (
    <View style={styles.root} testID="suggest-screen">
      <ScreenHeader title={t("suggestTitle")} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }} bottomOffset={24}>
        <View style={styles.intro}>
          <Icon name="lightbulb-on-outline" size={28} color={colors.brandPrimary} />
          <Text style={styles.introText}>{t("suggestIntro")}</Text>
        </View>
        <Field icon="circle-outline" value={from} onChange={setFrom} placeholder={t("from")} testID="suggest-from-input" />
        <Field icon="map-marker" value={to} onChange={setTo} placeholder={t("to")} testID="suggest-to-input" />
        <Field icon="home-group" value={village} onChange={setVillage} placeholder={t("yourVillage")} testID="suggest-village-input" />
        <Field icon="note-text-outline" value={notes} onChange={setNotes} placeholder={t("notes")} testID="suggest-notes-input" multiline />
        <Field icon="phone-outline" value={contact} onChange={setContact} placeholder={t("contact")} testID="suggest-contact-input" />
        <Pressable
          style={[styles.attach, attach && loc.coords && { borderColor: colors.brandPrimary, backgroundColor: colors.brandSecondary }]}
          testID="suggest-attach-location"
          onPress={() => {
            if (loc.status !== "granted") loc.request();
            setAttach((a) => !a);
          }}
        >
          <Icon name={attach && loc.coords ? "map-marker-check" : "map-marker-plus"} size={24} color={colors.brandPrimary} />
          <Text style={styles.attachText}>{t("attachLocation")}</Text>
          {attach && loc.coords && <Icon name="check" size={22} color={colors.success} />}
        </Pressable>
        <BigButton testID="suggest-submit-button" label={t("send")} icon="send" onPress={submit} loading={loading} disabled={!from.trim() || !to.trim()} />
      </KeyboardAwareScrollView>
    </View>
  );
}

function FieldInput({ icon, value, onChange, placeholder, testID, multiline }: { icon: string; value: string; onChange: (v: string) => void; placeholder: string; testID: string; multiline?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.field, multiline && { height: 96, alignItems: "flex-start", paddingVertical: 12 }]}>
      <Icon name={icon} size={22} color={colors.muted} />
      <TextInput testID={testID} style={[styles.input, multiline && { height: 72, textAlignVertical: "top" }]} placeholder={placeholder} placeholderTextColor={colors.muted} value={value} onChangeText={onChange} multiline={multiline} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  intro: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.brandSecondary, borderRadius: 12, padding: 14 },
  introText: { flex: 1, color: colors.onBrandSecondary, fontSize: 15, lineHeight: 21 },
  field: { minHeight: 56, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, backgroundColor: colors.surface },
  input: { flex: 1, fontSize: 17, color: colors.onSurface, height: 56 },
  attach: { minHeight: 56, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 },
  attachText: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface },
}));
