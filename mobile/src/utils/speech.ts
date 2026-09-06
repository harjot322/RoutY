import * as Speech from "expo-speech";

import { Lang } from "@/src/i18n/strings";

/** On-device voice announcement (works offline, free). */
export function announce(text: string, lang: Lang) {
  try {
    Speech.stop();
    Speech.speak(text, { language: lang === "hi" ? "hi-IN" : "en-IN", rate: 0.95, pitch: 1.0 });
  } catch {}
}

export function stopAnnouncing() {
  try {
    Speech.stop();
  } catch {}
}
