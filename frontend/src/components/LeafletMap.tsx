import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";

import { LeafletMapProps, MAP_HTML, useMapSync } from "@/src/components/leafletHtml";
import { makeStyles, useTheme } from "@/src/theme";

export function LeafletMap(props: LeafletMapProps) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const styles = useStyles();
  const { colors } = useTheme();
  const { onBusPress, onStopPress } = props;

  const send = useCallback((msg: object) => {
    ref.current?.injectJavaScript(`window.__rx(${JSON.stringify(JSON.stringify(msg))}); true;`);
  }, []);
  useMapSync(ready, send, props);

  return (
    <View style={[styles.wrap, props.style ?? styles.fill]} testID={props.testID ?? "leaflet-map"}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html: MAP_HTML, baseUrl: "https://routy.local/" }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        style={styles.web}
        onMessage={(e) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d.type === "ready") setReady(true);
            else if (d.type === "busTap") onBusPress?.(d.id);
            else if (d.type === "stopTap") onStopPress?.(d.id, d.routeId);
          } catch {}
        }}
      />
      {!ready && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={colors.brandPrimary} size="large" />
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  fill: { flex: 1 },
  web: { flex: 1, backgroundColor: colors.surfaceTertiary },
  loading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
}));
