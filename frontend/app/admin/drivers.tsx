import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Driver } from "@/src/api";
import { AdminGate } from "@/src/components/AdminGate";
import { BigButton } from "@/src/components/BigButton";
import { Icon } from "@/src/components/Icon";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

export default function AdminDriversScreen() {
  return (
    <AdminGate>
      <DriversManager />
    </AdminGate>
  );
}

function DriversManager() {
  const { t, tr, lang } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const driversQ = useQuery({ queryKey: ["admin-drivers"], queryFn: api.admin.drivers, refetchInterval: 3000 });
  const statesQ = useQuery({ queryKey: ["states"], queryFn: api.states, staleTime: 60000 });

  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");

  // Location Modal State
  const [locModalVisible, setLocModalVisible] = useState(false);
  const [locTargetDriver, setLocTargetDriver] = useState<Driver | null>(null);
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");

  // Edit/Create Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [conductorName, setConductorName] = useState("");
  const [conductorPhone, setConductorPhone] = useState("");
  const [depotAddress, setDepotAddress] = useState("");
  const [status, setStatus] = useState<string>("on_duty");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-drivers"] });
    qc.invalidateQueries({ queryKey: ["admin-buses"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["live"] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Driver> }) => api.admin.updateDriver(id, patch),
    onSuccess: () => {
      invalidate();
      toast.show(t("locationUpdated"), "success");
      setLocModalVisible(false);
      setEditModalVisible(false);
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Driver>) => api.admin.createDriver(data),
    onSuccess: () => {
      invalidate();
      toast.show("Crew record created", "success");
      setEditModalVisible(false);
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteDriver(id),
    onSuccess: () => {
      invalidate();
      toast.show("Driver removed", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const filteredDrivers = useMemo(() => {
    let list = driversQ.data ?? [];
    if (selectedState !== "all") {
      list = list.filter((d) => (d.state || "").toLowerCase() === selectedState.toLowerCase());
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q) ||
          (d.conductor_name && d.conductor_name.toLowerCase().includes(q)) ||
          (d.bus_plate && d.bus_plate.toLowerCase().includes(q)) ||
          (d.route_number && d.route_number.toLowerCase().includes(q)) ||
          (d.depot_address && d.depot_address.toLowerCase().includes(q)) ||
          (d.state && d.state.toLowerCase().includes(q))
      );
    }
    return list;
  }, [driversQ.data, selectedState, search]);

  const openLocationModal = (driver: Driver) => {
    setLocTargetDriver(driver);
    setNewLat(driver.lat ? driver.lat.toFixed(6) : "28.613900");
    setNewLng(driver.lng ? driver.lng.toFixed(6) : "77.209000");
    setLocModalVisible(true);
  };

  const handleSaveLocation = () => {
    if (!locTargetDriver) return;
    const latNum = parseFloat(newLat.trim());
    const lngNum = parseFloat(newLng.trim());
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      toast.show("Please enter valid latitude and longitude coordinates", "error");
      return;
    }
    updateMutation.mutate({
      id: locTargetDriver.id,
      patch: { lat: latNum, lng: lngNum },
    });
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setName(driver.name);
    setPhone(driver.phone);
    setConductorName(driver.conductor_name || "");
    setConductorPhone(driver.conductor_phone || "");
    setDepotAddress(driver.depot_address || "");
    setStatus(driver.status || "on_duty");
    setEditModalVisible(true);
  };

  const openCreateModal = () => {
    setEditingDriver(null);
    setName("");
    setPhone("+91 98");
    setConductorName("");
    setConductorPhone("+91 97");
    setDepotAddress("Central Transport Depot");
    setStatus("on_duty");
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!name.trim() || !phone.trim()) {
      toast.show("Driver name and phone are required", "error");
      return;
    }
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      conductor_name: conductorName.trim(),
      conductor_phone: conductorPhone.trim(),
      depot_address: depotAddress.trim(),
      status,
    };
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, patch: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <View style={styles.root} testID="admin-drivers-screen">
      <ScreenHeader
        title={t("driverDirectory")}
        subtitle={driversQ.data ? `${filteredDrivers.length} / ${driversQ.data.length} crew active` : undefined}
      />

      <View style={styles.topControls}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("searchDrivers")}
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            testID="search-drivers-input"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Icon name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* State Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stateRow}>
          <Pressable
            style={[styles.stateChip, selectedState === "all" && styles.stateChipActive]}
            onPress={() => setSelectedState("all")}
            testID="filter-state-all"
          >
            <Text style={[styles.stateChipText, selectedState === "all" && styles.stateChipTextActive]}>
              {t("allStates")}
            </Text>
          </Pressable>
          {(statesQ.data ?? []).map((s) => {
            const active = selectedState.toLowerCase() === s.state.toLowerCase();
            return (
              <Pressable
                key={s.state}
                style={[styles.stateChip, active && styles.stateChipActive]}
                onPress={() => setSelectedState(active ? "all" : s.state)}
                testID={`filter-state-${s.state}`}
              >
                <Text style={[styles.stateChipText, active && styles.stateChipTextActive]}>
                  {s.state} ({s.route_count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={driversQ.isRefetching} onRefresh={driversQ.refetch} tintColor={colors.brandPrimary} />}
      >
        {filteredDrivers.length === 0 && (
          <View style={styles.emptyWrap} testID="drivers-empty">
            <Icon name="account-search" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No crew records found</Text>
            <Text style={styles.emptySubtitle}>Try changing your search or state filter</Text>
          </View>
        )}

        {filteredDrivers.map((driver) => {
          const isOnDuty = driver.status !== "off_duty" && driver.status !== "maintenance";
          return (
            <View key={driver.id} style={styles.card} testID={`driver-card-${driver.id}`}>
              {/* Header: Driver Name & Badge */}
              <View style={styles.cardHeader}>
                <View style={styles.avatarWrap}>
                  <Icon name="account" size={24} color={colors.onBrandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.driverName} numberOfLines={1}>{driver.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: isOnDuty ? colors.successSoft : colors.surfaceTertiary }]}>
                      <Text style={[styles.statusBadgeText, { color: isOnDuty ? colors.success : colors.muted }]}>
                        {isOnDuty ? "On Duty" : "Off Duty"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.badgeText}>{driver.badge_id || "DRV-OFFICIAL"} · {driver.state || "India"}</Text>
                </View>
              </View>

              {/* Vehicle & Route Assigned */}
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Icon name="bus" size={16} color={colors.brandPrimary} />
                  <Text style={styles.infoLabel}>Assigned Bus:</Text>
                  <Text style={styles.infoValue}>{driver.bus_plate || "Standby Fleet"}</Text>
                </View>
                {driver.route_number && (
                  <View style={styles.infoRow}>
                    <Icon name="routes" size={16} color={colors.brandPrimary} />
                    <Text style={styles.infoLabel}>Active Corridor:</Text>
                    <Text style={styles.infoValue}>{driver.route_number} ({driver.route_name})</Text>
                  </View>
                )}
                {driver.depot_address && (
                  <View style={styles.infoRow}>
                    <Icon name="warehouse" size={16} color={colors.muted} />
                    <Text style={styles.infoLabel}>Depot:</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{driver.depot_address}</Text>
                  </View>
                )}
              </View>

              {/* Conductor Row */}
              {driver.conductor_name && (
                <View style={styles.conductorRow}>
                  <Icon name="badge-account-horizontal" size={18} color={colors.brandPrimary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.conductorLabel}>Conductor</Text>
                    <Text style={styles.conductorName}>{driver.conductor_name} · {driver.conductor_phone}</Text>
                  </View>
                  {driver.conductor_phone && (
                    <Pressable
                      style={styles.callSmallBtn}
                      onPress={() => Linking.openURL(`tel:${driver.conductor_phone}`)}
                      testID={`call-conductor-${driver.id}`}
                    >
                      <Icon name="phone" size={14} color={colors.brandPrimary} />
                    </Pressable>
                  )}
                </View>
              )}

              {/* Current GPS Coordinates */}
              <View style={styles.coordBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coordTitle}>GPS Telemetry Location</Text>
                  <Text style={styles.coordValue}>
                    {driver.lat?.toFixed(6)}, {driver.lng?.toFixed(6)}
                  </Text>
                </View>
                <Pressable
                  style={styles.updateLocBtn}
                  onPress={() => openLocationModal(driver)}
                  testID={`update-location-btn-${driver.id}`}
                >
                  <Icon name="map-marker-radius" size={16} color={colors.onBrandPrimary} />
                  <Text style={styles.updateLocText}>{t("updateDriverLocation")}</Text>
                </Pressable>
              </View>

              {/* Bottom Actions */}
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.actionBtnCall}
                  onPress={() => Linking.openURL(`tel:${driver.phone}`)}
                  testID={`call-driver-${driver.id}`}
                >
                  <Icon name="phone" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnCallText}>{driver.phone}</Text>
                </Pressable>

                <Pressable
                  style={styles.actionBtnEdit}
                  onPress={() => openEditModal(driver)}
                  testID={`edit-driver-${driver.id}`}
                >
                  <Icon name="pencil" size={16} color={colors.onSurface} />
                  <Text style={styles.actionBtnEditText}>Edit</Text>
                </Pressable>

                <Pressable
                  style={styles.actionBtnDel}
                  onPress={() => {
                    Alert.alert("Remove Driver", `Remove ${driver.name} from directory?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(driver.id) },
                    ]);
                  }}
                  testID={`delete-driver-${driver.id}`}
                >
                  <Icon name="delete-outline" size={16} color={colors.error} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL: Update Driver Current Location */}
      <Modal visible={locModalVisible} transparent animationType="slide" onRequestClose={() => setLocModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAwareScrollView contentContainerStyle={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHead}>
                <Icon name="crosshairs-gps" size={24} color={colors.brandPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Update Current Location</Text>
                  <Text style={styles.modalSubtitle}>{locTargetDriver?.name} · {locTargetDriver?.bus_plate}</Text>
                </View>
                <Pressable onPress={() => setLocModalVisible(false)}>
                  <Icon name="close" size={24} color={colors.onSurface} />
                </Pressable>
              </View>

              <Text style={styles.modalHint}>
                Input new GPS coordinates. This immediately moves the active bus pointer on commuters' live map in real time.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Latitude (-90 to +90)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newLat}
                  onChangeText={setNewLat}
                  placeholder="e.g. 28.613939"
                  placeholderTextColor={colors.muted}
                  testID="input-driver-lat"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Longitude (-180 to +180)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newLng}
                  onChangeText={setNewLng}
                  placeholder="e.g. 77.209021"
                  placeholderTextColor={colors.muted}
                  testID="input-driver-lng"
                />
              </View>

              {/* Coordinate quick presets */}
              <Text style={styles.presetsTitle}>Quick Regional Coordinates:</Text>
              <View style={styles.presetsRow}>
                <Pressable
                  style={styles.presetChip}
                  onPress={() => { setNewLat("28.629100"); setNewLng("77.218900"); }}
                >
                  <Text style={styles.presetChipText}>Delhi (CP)</Text>
                </Pressable>
                <Pressable
                  style={styles.presetChip}
                  onPress={() => { setNewLat("18.932000"); setNewLng("72.834000"); }}
                >
                  <Text style={styles.presetChipText}>Mumbai (CST)</Text>
                </Pressable>
                <Pressable
                  style={styles.presetChip}
                  onPress={() => { setNewLat("12.977000"); setNewLng("77.572000"); }}
                >
                  <Text style={styles.presetChipText}>Bengaluru (Majestic)</Text>
                </Pressable>
                <Pressable
                  style={styles.presetChip}
                  onPress={() => { setNewLat("13.083000"); setNewLng("80.278000"); }}
                >
                  <Text style={styles.presetChipText}>Chennai (Central)</Text>
                </Pressable>
              </View>

              <View style={styles.modalButtons}>
                <Pressable style={styles.modalCancel} onPress={() => setLocModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <BigButton
                  label="Apply GPS Location"
                  onPress={handleSaveLocation}
                  loading={updateMutation.isPending}
                  testID="save-driver-location-button"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* MODAL: Edit Driver Profile */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAwareScrollView contentContainerStyle={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHead}>
                <Icon name="card-account-details-outline" size={24} color={colors.brandPrimary} />
                <Text style={styles.modalTitle}>{editingDriver ? "Edit Crew Profile" : "Register New Crew"}</Text>
                <Pressable onPress={() => setEditModalVisible(false)}>
                  <Icon name="close" size={24} color={colors.onSurface} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Driver Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full Indian Name"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Driver Phone (+91 ...)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98112 45891"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Conductor Name</Text>
                <TextInput
                  style={styles.input}
                  value={conductorName}
                  onChangeText={setConductorName}
                  placeholder="Conductor Name"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Conductor Phone</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={conductorPhone}
                  onChangeText={setConductorPhone}
                  placeholder="+91 97654 32190"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Depot Address</Text>
                <TextInput
                  style={styles.input}
                  value={depotAddress}
                  onChangeText={setDepotAddress}
                  placeholder="Depot Name, City"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.modalButtons}>
                <Pressable style={styles.modalCancel} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <BigButton
                  label="Save Crew Record"
                  onPress={handleSaveEdit}
                  loading={updateMutation.isPending || createMutation.isPending}
                  testID="save-crew-record-button"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  topControls: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, height: 42, gap: 8, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface },
  stateRow: { gap: 8, paddingVertical: 4 },
  stateChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  stateChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  stateChipText: { fontSize: 12, fontWeight: "700", color: colors.onSurfaceSecondary },
  stateChipTextActive: { color: colors.onBrandPrimary },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  emptySubtitle: { fontSize: 14, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  driverName: { fontSize: 17, fontWeight: "800", color: colors.onSurface, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },
  badgeText: { fontSize: 12, color: colors.muted, marginTop: 2 },
  infoBox: { backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 10, gap: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 12, fontWeight: "600", color: colors.muted, width: 95 },
  infoValue: { fontSize: 12, fontWeight: "700", color: colors.onSurface, flex: 1 },
  conductorRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 10 },
  conductorLabel: { fontSize: 11, fontWeight: "700", color: colors.muted },
  conductorName: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  callSmallBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  coordBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 10, gap: 8 },
  coordTitle: { fontSize: 11, fontWeight: "700", color: colors.muted },
  coordValue: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary, marginTop: 2 },
  updateLocBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandPrimary, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  updateLocText: { fontSize: 12, fontWeight: "800", color: colors.onBrandPrimary },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  actionBtnCall: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.brandPrimary, height: 38, borderRadius: 8 },
  actionBtnCallText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  actionBtnEdit: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  actionBtnEditText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  actionBtnDel: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  modalContainer: { flexGrow: 1, justifyContent: "center" },
  modalContent: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  modalHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  modalSubtitle: { fontSize: 12, color: colors.muted },
  modalHint: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, fontSize: 14, color: colors.onSurface, backgroundColor: colors.surfaceSecondary },
  presetsTitle: { fontSize: 12, fontWeight: "700", color: colors.muted, marginTop: 4 },
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  presetChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  presetChipText: { fontSize: 11, fontWeight: "700", color: colors.onSurface },
  modalButtons: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  modalCancel: { paddingHorizontal: 16, height: 48, justifyContent: "center", alignItems: "center" },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: colors.muted },
}));
