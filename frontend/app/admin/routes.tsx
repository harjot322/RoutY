import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { AdminGate } from "@/src/components/AdminGate";
import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

const COLORS = ["#C04A00", "#1B7F31", "#4A4A4A", "#B87503", "#7A2F00", "#D32F2F"];
type StopDraft = { name: string; name_hi: string; lat: string; lng: string };
const emptyStop = (): StopDraft => ({ name: "", name_hi: "", lat: "", lng: "" });

export default function AdminRoutes() {
  return (
    <AdminGate>
      <RoutesManager />
    </AdminGate>
  );
}

function RoutesManager() {
  const { t, tr } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const routesQ = useQuery({ queryKey: ["routes"], queryFn: api.routes });
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [nameHi, setNameHi] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [stops, setStops] = useState<StopDraft[]>([emptyStop(), emptyStop()]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["routes"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };
  const create = useMutation({
    mutationFn: api.admin.createRoute,
    onSuccess: () => {
      invalidate();
      toast.show(t("routeCreated"), "success");
      setNumber("");
      setName("");
      setNameHi("");
      setStops([emptyStop(), emptyStop()]);
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });
  const del = useMutation({ mutationFn: api.admin.deleteRoute, onSuccess: invalidate, onError: (e: Error) => toast.show(e.message, "error") });
  const addBus = useMutation({
    mutationFn: api.admin.addBus,
    onSuccess: () => {
      invalidate();
      toast.show("Bus added", "success");
    },
  });

  const validStops = stops.filter((s) => s.name.trim() && !isNaN(parseFloat(s.lat)) && !isNaN(parseFloat(s.lng)));
  const canCreate = number.trim() && name.trim() && validStops.length >= 2;

  const submit = () =>
    create.mutate({
      number: number.trim(),
      name: name.trim(),
      name_hi: nameHi.trim(),
      color,
      bus_count: 2,
      stops: validStops.map((s) => ({ name: s.name.trim(), name_hi: s.name_hi.trim(), lat: parseFloat(s.lat), lng: parseFloat(s.lng) })),
    });

  const updateStop = (i: number, patch: Partial<StopDraft>) => setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <View style={styles.root} testID="admin-routes-screen">
      <ScreenHeader title={t("manageRoutes")} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }} bottomOffset={24}>
        {(routesQ.data ?? []).map((r) => (
          <View key={r.id} style={styles.row} testID={`admin-route-${r.number}`}>
            <View style={[styles.badge, { backgroundColor: r.color }]}>
              <Text style={styles.badgeText}>{r.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{tr(r.name, r.name_hi)}</Text>
              <Text style={styles.meta}>{t("stops", { n: r.stops.length })} · {t("liveBuses", { n: r.bus_count ?? 0 })}</Text>
            </View>
            <Pressable style={styles.iconBtn} onPress={() => addBus.mutate(r.id)} testID={`admin-add-bus-${r.number}`}>
              <Icon name="bus-plus" size={24} color={colors.brandPrimary} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => del.mutate(r.id)} testID={`admin-delete-route-${r.number}`}>
              <Icon name="delete-outline" size={24} color={colors.error} />
            </Pressable>
          </View>
        ))}

        <Text style={styles.section}>{t("newRoute")}</Text>
        <TextInput testID="new-route-number" style={styles.input} placeholder={t("routeNumber")} placeholderTextColor={colors.muted} value={number} onChangeText={setNumber} />
        <TextInput testID="new-route-name" style={styles.input} placeholder={t("routeName")} placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
        <TextInput testID="new-route-name-hi" style={styles.input} placeholder={t("routeNameHi")} placeholderTextColor={colors.muted} value={nameHi} onChangeText={setNameHi} />
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]} testID={`color-${c.slice(1)}`} />
          ))}
        </View>

        {stops.map((s, i) => (
          <View key={i} style={styles.stopCard}>
            <View style={styles.stopHead}>
              <Text style={styles.stopIdx}>{i + 1}</Text>
              {stops.length > 2 && (
                <Pressable onPress={() => setStops((p) => p.filter((_, idx) => idx !== i))} style={styles.iconBtn} testID={`remove-stop-${i}`}>
                  <Icon name="close" size={22} color={colors.muted} />
                </Pressable>
              )}
            </View>
            <TextInput testID={`stop-name-${i}`} style={styles.input} placeholder={t("stopName")} placeholderTextColor={colors.muted} value={s.name} onChangeText={(v) => updateStop(i, { name: v })} />
            <View style={styles.pair}>
              <TextInput testID={`stop-lat-${i}`} style={[styles.input, { flex: 1 }]} placeholder={t("lat")} placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={s.lat} onChangeText={(v) => updateStop(i, { lat: v })} />
              <TextInput testID={`stop-lng-${i}`} style={[styles.input, { flex: 1 }]} placeholder={t("lng")} placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={s.lng} onChangeText={(v) => updateStop(i, { lng: v })} />
            </View>
          </View>
        ))}
        <BigButton testID="add-stop-button" label={t("addStop")} icon="plus" variant="secondary" onPress={() => setStops((p) => [...p, emptyStop()])} />
        <BigButton testID="create-route-button" label={t("createRoute")} icon="check" onPress={submit} loading={create.isPending} disabled={!canCreate} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, minHeight: 64 },
  badge: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.onBrand, fontWeight: "800" },
  name: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  section: { fontSize: 14, fontWeight: "800", color: colors.muted, textTransform: "uppercase", marginTop: 12 },
  input: { height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: 16, color: colors.onSurface },
  colorRow: { flexDirection: "row", gap: 12 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: colors.surface },
  swatchActive: { borderColor: colors.borderStrong },
  stopCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
  stopHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stopIdx: { fontWeight: "900", color: colors.brandPrimary, fontSize: 16 },
  pair: { flexDirection: "row", gap: 8 },
}));
