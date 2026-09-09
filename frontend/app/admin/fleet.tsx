import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Bus } from "@/src/api";
import { AdminGate } from "@/src/components/AdminGate";
import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

const SCHEDULE_PRESETS = [
  "06:00 - 22:00 (Regular · 15m)",
  "07:30 - 20:30 (Peak Frequency · 8m)",
  "08:00 - 18:00 (Express Service)",
  "05:30 - 23:00 (Full-Day Metro Feeder)",
];

export default function AdminFleetScreen() {
  return (
    <AdminGate>
      <FleetManager />
    </AdminGate>
  );
}

function FleetManager() {
  const { t, tr } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const routesQ = useQuery({ queryKey: ["routes"], queryFn: api.routes, staleTime: 60000 });
  const busesQ = useQuery({ queryKey: ["admin-buses"], queryFn: api.admin.buses, refetchInterval: 3000 });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);

  // Form State
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [plate, setPlate] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [driverPhone, setDriverPhone] = useState<string>("");
  const [status, setStatus] = useState<"in_service" | "delayed" | "maintenance">("in_service");
  const [occupancy, setOccupancy] = useState<"seats_available" | "low" | "medium" | "standing_only">("low");
  const [schedule, setSchedule] = useState<string>(SCHEDULE_PRESETS[0]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-buses"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["routes"] });
  };

  const createMutation = useMutation({
    mutationFn: api.admin.createBus,
    onSuccess: () => {
      invalidate();
      toast.show(t("busSaved"), "success");
      closeModal();
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ busId, payload }: { busId: string; payload: any }) => api.admin.updateBus(busId, payload),
    onSuccess: () => {
      invalidate();
      toast.show(t("busSaved"), "success");
      closeModal();
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: api.admin.deleteBus,
    onSuccess: () => {
      invalidate();
      toast.show(t("busDeleted"), "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const openCreateModal = () => {
    setEditingBus(null);
    setSelectedRouteId(routesQ.data?.[0]?.id ?? "");
    setPlate("");
    setDriverName("");
    setDriverPhone("");
    setStatus("in_service");
    setOccupancy("low");
    setSchedule(SCHEDULE_PRESETS[0]);
    setModalVisible(true);
  };

  const openEditModal = (bus: Bus) => {
    setEditingBus(bus);
    setSelectedRouteId(bus.route_id ?? "");
    setPlate(bus.plate ?? "");
    setDriverName(bus.driver_name ?? bus.driver ?? "");
    setDriverPhone(bus.driver_phone ?? "");
    setStatus((bus.status as any) || "in_service");
    setOccupancy((bus.occupancy as any) || "low");
    setSchedule(bus.schedule ?? SCHEDULE_PRESETS[0]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBus(null);
  };

  const handleSave = () => {
    if (!selectedRouteId) {
      toast.show(t("selectRoutePrompt"), "warning");
      return;
    }
    if (editingBus) {
      updateMutation.mutate({
        busId: editingBus.id,
        payload: {
          route_id: selectedRouteId,
          plate: plate.trim() || undefined,
          driver_name: driverName.trim() || undefined,
          driver_phone: driverPhone.trim() || undefined,
          status,
          occupancy,
          schedule: schedule.trim() || undefined,
        },
      });
    } else {
      createMutation.mutate({
        route_id: selectedRouteId,
        plate: plate.trim() || undefined,
        driver_name: driverName.trim() || undefined,
        driver_phone: driverPhone.trim() || undefined,
        status,
        occupancy,
        schedule: schedule.trim() || undefined,
      });
    }
  };

  const confirmDelete = (bus: Bus) => {
    Alert.alert(
      t("delete"),
      t("confirmDelete"),
      [
        { text: t("close"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: () => deleteMutation.mutate(bus.id) },
      ],
      { cancelable: true }
    );
  };

  const buses = useMemo(() => busesQ.data ?? [], [busesQ.data]);
  const filteredBuses = useMemo(() => {
    if (statusFilter === "all") return buses;
    return buses.filter((b) => b.status === statusFilter);
  }, [buses, statusFilter]);

  const routesMap = useMemo(() => {
    const map = new Map<string, { number: string; name: string; name_hi?: string; color: string }>();
    (routesQ.data ?? []).forEach((r) => map.set(r.id, { number: r.number, name: r.name, name_hi: r.name_hi, color: r.color }));
    return map;
  }, [routesQ.data]);

  return (
    <View style={styles.root} testID="admin-fleet-screen">
      <ScreenHeader
        title={t("manageFleet")}
        subtitle={`${buses.length} active fleet vehicles`}
        right={
          <Pressable onPress={openCreateModal} style={styles.addHeaderBtn} testID="admin-add-vehicle-btn">
            <Icon name="plus" size={24} color={colors.onBrandPrimary} />
          </Pressable>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: "all", label: t("filterAll") },
          { key: "in_service", label: t("statusInService") },
          { key: "delayed", label: t("statusDelayed") },
          { key: "maintenance", label: t("statusMaintenance") },
        ].map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setStatusFilter(tab.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              testID={`fleet-filter-${tab.key}`}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={busesQ.isRefetching} onRefresh={busesQ.refetch} tintColor={colors.brandPrimary} />}
      >
        {filteredBuses.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="bus-alert" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No vehicles in this status</Text>
            <Text style={styles.emptySubtitle}>Tap + to register a vehicle into the operational fleet</Text>
          </View>
        )}

        {filteredBuses.map((bus) => {
          const routeInfo = routesMap.get(bus.route_id) ?? {
            number: bus.route_number || "—",
            name: "Assigned Route",
            color: bus.color || colors.brandPrimary,
          };
          const busStatus = bus.status || "in_service";
          const statusColor =
            busStatus === "in_service" ? colors.success : busStatus === "delayed" ? colors.warning : colors.error;

          return (
            <View key={bus.id} style={styles.busCard} testID={`admin-bus-card-${bus.id}`}>
              <View style={styles.busCardTop}>
                <View style={[styles.routeBadge, { backgroundColor: routeInfo.color }]}>
                  <Text style={styles.routeBadgeText}>{routeInfo.number}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.busPlate}>{bus.plate || `Vehicle #${bus.id.slice(-4)}`}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "22", borderColor: statusColor }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {busStatus === "in_service"
                          ? t("statusInService")
                          : busStatus === "delayed"
                          ? t("statusDelayed")
                          : t("statusMaintenance")}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.routeName} numberOfLines={1}>
                    {tr(routeInfo.name, routeInfo.name_hi)}
                  </Text>
                </View>

                <View style={styles.actionGroup}>
                  <Pressable onPress={() => openEditModal(bus)} style={styles.actionBtn} testID={`edit-bus-${bus.id}`}>
                    <Icon name="pencil-outline" size={20} color={colors.brandPrimary} />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(bus)} style={styles.actionBtn} testID={`delete-bus-${bus.id}`}>
                    <Icon name="delete-outline" size={20} color={colors.error} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.busMetaRow}>
                <View style={styles.metaItem}>
                  <Icon name="account" size={15} color={colors.muted} />
                  <Text style={styles.metaText}>{bus.driver_name || bus.driver || "Unassigned Driver"}</Text>
                </View>
                {!!bus.driver_phone && (
                  <View style={styles.metaItem}>
                    <Icon name="phone" size={15} color={colors.muted} />
                    <Text style={styles.metaText}>{bus.driver_phone}</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Icon name="speedometer" size={15} color={colors.muted} />
                  <Text style={styles.metaText}>{Math.round(bus.speed_kmph ?? 25)} km/h</Text>
                </View>
              </View>

              {!!bus.schedule && (
                <View style={styles.scheduleRow}>
                  <Icon name="clock-outline" size={15} color={colors.brandPrimary} />
                  <Text style={styles.scheduleText} numberOfLines={1}>
                    {bus.schedule}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Modal: Add or Edit Vehicle */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollView contentContainerStyle={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]} bottomOffset={24}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBus ? t("editBusTitle") : t("addBusTitle")}</Text>
              <Pressable onPress={closeModal} style={styles.closeBtn}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* Select Route */}
            <Text style={styles.fieldLabel}>{t("selectRoutePrompt")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routePickRow}>
              {(routesQ.data ?? []).map((r) => {
                const selected = selectedRouteId === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelectedRouteId(r.id)}
                    style={[
                      styles.routePickItem,
                      { borderColor: selected ? r.color : colors.border },
                      selected && { backgroundColor: r.color + "18" },
                    ]}
                    testID={`select-route-${r.id}`}
                  >
                    <View style={[styles.routeBadgeSmall, { backgroundColor: r.color }]}>
                      <Text style={styles.routeBadgeSmallText}>{r.number}</Text>
                    </View>
                    <Text style={[styles.routePickName, selected && { color: r.color, fontWeight: "800" }]} numberOfLines={1}>
                      {tr(r.name, r.name_hi)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Plate Number */}
            <Text style={styles.fieldLabel}>{t("plateNumber")}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. UP41 AA 1042"
              placeholderTextColor={colors.muted}
              value={plate}
              onChangeText={setPlate}
              autoCapitalize="characters"
              testID="bus-plate-input"
            />

            {/* Driver Info */}
            <Text style={styles.fieldLabel}>{t("driverName")}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor={colors.muted}
              value={driverName}
              onChangeText={setDriverName}
              testID="bus-driver-name-input"
            />

            <Text style={styles.fieldLabel}>Driver Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={colors.muted}
              value={driverPhone}
              onChangeText={setDriverPhone}
              keyboardType="phone-pad"
              testID="bus-driver-phone-input"
            />

            {/* Operational Status */}
            <Text style={styles.fieldLabel}>{t("operationalStatus")}</Text>
            <View style={styles.segmentedRow}>
              {[
                { id: "in_service", label: t("statusInService"), icon: "check-circle", color: colors.success },
                { id: "delayed", label: t("statusDelayed"), icon: "clock-alert", color: colors.warning },
                { id: "maintenance", label: t("statusMaintenance"), icon: "wrench", color: colors.error },
              ].map((st) => {
                const active = status === st.id;
                return (
                  <Pressable
                    key={st.id}
                    onPress={() => setStatus(st.id as any)}
                    style={[styles.segBtn, active && { backgroundColor: st.color + "22", borderColor: st.color }]}
                    testID={`status-select-${st.id}`}
                  >
                    <Icon name={st.icon} size={18} color={active ? st.color : colors.muted} />
                    <Text style={[styles.segBtnText, active && { color: st.color, fontWeight: "800" }]}>{st.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Occupancy */}
            <Text style={styles.fieldLabel}>{t("occupancyLabel")}</Text>
            <View style={styles.segmentedRow}>
              {[
                { id: "low", label: t("occupancyLow") },
                { id: "medium", label: t("occupancyMedium") },
                { id: "standing_only", label: t("occupancyHigh") },
              ].map((occ) => {
                const active = occupancy === occ.id;
                return (
                  <Pressable
                    key={occ.id}
                    onPress={() => setOccupancy(occ.id as any)}
                    style={[styles.segBtn, active && { backgroundColor: colors.brandPrimary + "22", borderColor: colors.brandPrimary }]}
                    testID={`occupancy-select-${occ.id}`}
                  >
                    <Text style={[styles.segBtnText, active && { color: colors.brandPrimary, fontWeight: "800" }]}>
                      {occ.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Schedule Presets */}
            <Text style={styles.fieldLabel}>{t("manageSchedules")}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 06:00 - 22:00 (Every 15 min)"
              placeholderTextColor={colors.muted}
              value={schedule}
              onChangeText={setSchedule}
              testID="bus-schedule-input"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
              {SCHEDULE_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setSchedule(preset)}
                  style={[styles.presetChip, schedule === preset && styles.presetChipActive]}
                >
                  <Text style={[styles.presetChipText, schedule === preset && styles.presetChipTextActive]}>{preset}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ marginTop: 24 }}>
              <BigButton
                label={editingBus ? "Save Changes" : "Register Vehicle"}
                icon="check"
                onPress={handleSave}
                loading={createMutation.isPending || updateMutation.isPending}
                testID="save-vehicle-btn"
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  addHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  filterChipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  filterChipTextActive: { color: colors.onBrandPrimary, fontWeight: "800" },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  emptySubtitle: { fontSize: 13, color: colors.muted, textAlign: "center" },
  busCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  busCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  routeBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  routeBadgeText: { color: colors.onBrand, fontWeight: "900", fontSize: 15 },
  busPlate: { fontSize: 16, fontWeight: "900", color: colors.onSurface },
  routeName: { fontSize: 13, color: colors.muted, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "800" },
  actionGroup: { flexDirection: "row", gap: 4 },
  actionBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  busMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, color: colors.onSurface, fontWeight: "600" },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scheduleText: { fontSize: 12, color: colors.brandPrimary, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: colors.onSurface },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.onSurface,
  },
  routePickRow: { gap: 8, paddingVertical: 4 },
  routePickItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  routeBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  routeBadgeSmallText: { color: colors.onBrand, fontWeight: "900", fontSize: 12 },
  routePickName: { fontSize: 13, fontWeight: "700", color: colors.onSurface, maxWidth: 140 },
  segmentedRow: { flexDirection: "row", gap: 8 },
  segBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 6,
  },
  segBtnText: { fontSize: 12, fontWeight: "700", color: colors.muted },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandPrimary + "15",
  },
  presetChipText: { fontSize: 11, fontWeight: "700", color: colors.muted },
  presetChipTextActive: { color: colors.brandPrimary },
}));
