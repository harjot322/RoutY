import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { LeafletMapProps, MAP_HTML, useMapSync } from "@/src/components/leafletHtml";
import { makeStyles } from "@/src/theme";

export function LeafletMap(props: LeafletMapProps) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const styles = useStyles();
  const { onBusPress, onStopPress } = props;

  const send = useCallback((msg: object) => {
    ref.current?.contentWindow?.postMessage(JSON.stringify(msg), "*");
  }, []);
  useMapSync(ready, send, props);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d.type === "ready") setReady(true);
        else if (d.type === "busTap") onBusPress?.(d.id);
        else if (d.type === "stopTap") onStopPress?.(d.id, d.routeId);
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onBusPress, onStopPress]);

  return (
    <View style={[styles.wrap, props.style ?? styles.fill]} testID={props.testID ?? "leaflet-map"}>
      {React.createElement("iframe", {
        ref,
        srcDoc: MAP_HTML,
        style: { border: 0, width: "100%", height: "100%", display: "block" },
        title: "map",
        sandbox: "allow-scripts allow-same-origin",
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  fill: { flex: 1 },
}));
