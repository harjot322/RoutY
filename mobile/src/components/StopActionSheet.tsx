import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BestEta, Stop } from "@/src/api";
import { Icon } from "@/src/components/Icon";
import { FAV_ICONS, FavLabel, useFavourites } from "@/src/favorites/FavoritesContext";
import { useLanguage } from "@/src/i18n/LanguageContext";
import { makeStyles, useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  stop: (Stop & { best?: BestEta }) | null;
  routeId: string;
  routeNumber: string;
  etaText: string;
  onTrack?: () => void;
  onAnnounce?: () => void;
  onShare?: () => void;
  onFare?: () => void;
};

/** Bottom sheet with the actions for one stop: track, announce, share, favourite, fare. */
export function StopActionSheet({ visible, onClose, stop, routeId, routeNumber, etaText, onTrack, onAnnounce, onShare, onFare }: Props) {
  const insets = useSafeAreaInsets();
  const { t, tr } = useLanguage();
  const styles = useStyles();
  const { colors } = useTheme();
  const fav = useFavourites();
  const [pickLabel, setPickLabel] = useState(false);
  if (!stop) return null;
  const isFav = fav.isFavourite(stop.id);

  const Row = RowItem;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="stop-sheet-backdrop">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}} testID="stop-action-sheet">
          <View style={styles.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={2}>{tr(stop.name, stop.name_hi)}</Text>
              <Text style={styles.sub} numberOfLines={1}>{routeNumber} · {t("nextBus")}: {etaText}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.close} testID="stop-sheet-close">
              <Icon name="close" size={26} color={colors.onSurface} />
            </Pressable>
          </View>

          {pickLabel ? (
            <View style={styles.labelRow}>
              {(["home", "market", "other"] as FavLabel[]).map((l) => (
                <Pressable
                  key={l}
                  style={styles.labelBtn}
                  testID={`fav-label-${l}`}
                  onPress={() => {
                    fav.add({ stop_id: stop.id, route_id: routeId, name: stop.name, name_hi: stop.name_hi, label: l });
                    setPickLabel(false);
                    onClose();
                  }}
                >
                  <Icon name={FAV_ICONS[l]} size={28} color={colors.brandPrimary} />
                  <Text style={styles.labelText}>{t(l === "home" ? "favHome" : l === "market" ? "favMarket" : "favOther")}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <Row icon="bus-marker" label={t("track")} onPress={onTrack} testID="sheet-track" tint={colors.brandPrimary} />
              <Row icon="volume-high" label={t("announce")} onPress={onAnnounce} testID="sheet-announce" />
              <Row icon="share-variant" label={t("shareEta")} onPress={onShare} testID="sheet-share" />
              <Row icon="cash" label={t("fareCalc")} onPress={onFare} testID="sheet-fare" />
              <Row
                icon={isFav ? "star-off" : "star"}
                label={isFav ? t("removeFavourite") : t("addFavourite")}
                testID="sheet-favourite"
                onPress={() => {
                  if (isFav) {
                    fav.remove(stop.id);
                    onClose();
                  } else setPickLabel(true);
                }}
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RowItem({ icon, label, onPress, testID, tint }: { icon: string; label: string; onPress?: () => void; testID: string; tint?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed, !onPress && { opacity: 0.4 }]} onPress={onPress} disabled={!onPress} testID={testID}>
      <View style={[styles.rowIcon, tint ? { backgroundColor: tint } : null]}>
        <Icon name={icon} size={24} color={tint ? colors.onBrandPrimary : colors.brandPrimary} />
      </View>
      <Text style={styles.rowText} numberOfLines={1}>{label}</Text>
      <Icon name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "900", color: colors.onSurface },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingHorizontal: 4, borderRadius: 12 },
  pressed: { backgroundColor: colors.surfaceSecondary },
  rowIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.onSurface },
  labelRow: { flexDirection: "row", gap: 12, paddingVertical: 8 },
  labelBtn: { flex: 1, height: 88, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 6 },
  labelText: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
}));
