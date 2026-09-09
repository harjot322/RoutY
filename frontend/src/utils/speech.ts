import * as Speech from "expo-speech";

import { Lang } from "@/src/i18n/strings";

/** On-device voice announcement (works offline, free, native TTS). */
export function announce(text: string, lang: Lang = "hi") {
  try {
    Speech.stop();
    Speech.speak(text, {
      language: lang === "hi" ? "hi-IN" : "en-IN",
      rate: lang === "hi" ? 0.90 : 0.95,
      pitch: 1.0,
    });
  } catch {}
}

export function stopAnnouncing() {
  try {
    Speech.stop();
  } catch {}
}

/** Spoken dialogue when voice assistance is activated or toggled ON. */
export function speakAssistantActivated(lang: Lang = "hi") {
  if (lang === "hi") {
    announce(
      "नमस्ते! RoutY वॉयस असिस्टेंट अब सक्रिय है। मैं आपकी यात्रा के दौरान बसों के लाइव आगमन, स्टॉप्स और सीट उपलब्धता की सटीक जानकारी देता रहूँगा। सुखद और सुरक्षित यात्रा की शुभकामनाएँ!",
      "hi"
    );
  } else {
    announce(
      "Welcome! RoutY Voice Assistant is now active. I will announce live bus arrivals, upcoming stops, and seat occupancy throughout your journey. Have a safe trip!",
      "en"
    );
  }
}

/** Spoken dialogue when a user selects / tracks a bus on the map. */
export function speakTrackedBus(
  bus: {
    route_number: string;
    route_name?: string;
    plate?: string;
    terminus?: string;
    terminus_hi?: string;
    speed_kmph?: number;
    driver?: string;
    conductor?: string;
    capacity?: number;
    passengers_opted_in?: number;
    next_stop?: { name: string; name_hi?: string; eta_s: number } | null;
  },
  lang: Lang = "hi"
) {
  const rNum = bus.route_number || "बस";
  const term = lang === "hi" ? bus.terminus_hi || bus.terminus || "गंतव्य" : bus.terminus || "destination";
  const speed = bus.speed_kmph || 0;
  const driver = bus.driver ? (lang === "hi" ? `चालक ${bus.driver}` : `Driver ${bus.driver}`) : "";
  const conductor = bus.conductor ? (lang === "hi" ? `परिचालक ${bus.conductor}` : `Conductor ${bus.conductor}`) : "";
  const seats = bus.passengers_opted_in ?? 18;
  const totalSeats = bus.capacity ?? 42;

  let nextInfo = "";
  if (bus.next_stop) {
    const sName = lang === "hi" ? bus.next_stop.name_hi || bus.next_stop.name : bus.next_stop.name;
    const mins = Math.max(1, Math.round(bus.next_stop.eta_s / 60));
    if (lang === "hi") {
      nextInfo = mins <= 1 ? `अगला स्टॉप ${sName} बस पहुँचने ही वाली है।` : `अगला स्टॉप ${sName} है, जहाँ यह लगभग ${mins} मिनट में पहुँचेगी।`;
    } else {
      nextInfo = mins <= 1 ? `Approaching next stop at ${sName} right now.` : `Next stop is ${sName}, arriving in approximately ${mins} minutes.`;
    }
  }

  if (lang === "hi") {
    const speech = `बस संख्या ${rNum} की लाइव ट्रैकिंग शुरू हो गई है। यह बस ${term} की ओर जा रही है। गति ${speed} किलोमीटर प्रति घंटा है। ${driver}${driver && conductor ? " और " : ""}${conductor} इस बस में तैनात हैं। बयालीस में से ${seats} सीटें भरी हैं। ${nextInfo}`;
    announce(speech, "hi");
  } else {
    const crewInfo = driver && conductor ? `Operated by ${driver} and ${conductor}.` : "";
    const speech = `Tracking Route ${rNum} toward ${term}. Current speed ${speed} km per hour. ${crewInfo} ${seats} of ${totalSeats} passenger seats occupied. ${nextInfo}`;
    announce(speech, "en");
  }
}

/** Spoken dialogue summarizing nearby buses around commuter's location. */
export function speakNearbyBusesSummary(
  count: number,
  closestBus?: { route_number: string; terminus?: string; terminus_hi?: string; distance_m?: number } | null,
  lang: Lang = "hi"
) {
  if (count === 0) {
    if (lang === "hi") {
      announce("वर्तमान में आपके निकटतम पाँच किलोमीटर के दायरे में कोई बस नहीं है। कृपया राज्य सूची से बस चुनें।", "hi");
    } else {
      announce("There are currently no buses within your immediate vicinity. Please select a route or state.", "en");
    }
    return;
  }

  if (closestBus) {
    const rNum = closestBus.route_number;
    const term = lang === "hi" ? closestBus.terminus_hi || closestBus.terminus : closestBus.terminus;
    const distText = closestBus.distance_m
      ? closestBus.distance_m < 1000
        ? `${closestBus.distance_m} मीटर`
        : `${(closestBus.distance_m / 1000).toFixed(1)} किलोमीटर`
      : "पास";
    const distTextEn = closestBus.distance_m
      ? closestBus.distance_m < 1000
        ? `${closestBus.distance_m} meters`
        : `${(closestBus.distance_m / 1000).toFixed(1)} kilometers`
      : "nearby";

    if (lang === "hi") {
      announce(
        `आपके आस-पास ${count} बसें चल रही हैं। सबसे नज़दीकी बस संख्या ${rNum} है, जो ${term} की ओर जा रही है और केवल ${distText} दूर है।`,
        "hi"
      );
    } else {
      announce(
        `Found ${count} buses near your location. The closest is Route ${rNum} toward ${term}, approximately ${distTextEn} away.`,
        "en"
      );
    }
  } else {
    if (lang === "hi") {
      announce(`आपके निकटतम क्षेत्र में ${count} बसें सक्रिय हैं। ट्रैक करने के लिए किसी भी बस पर टैप करें।`, "hi");
    } else {
      announce(`There are ${count} active buses in your area. Tap on any bus to begin live tracking.`, "en");
    }
  }
}

/** General spoken status briefing. */
export function speakTransitBriefing(
  trackedBus?: any,
  nearbyCount: number = 0,
  lang: Lang = "hi"
) {
  if (trackedBus) {
    speakTrackedBus(trackedBus, lang);
  } else {
    speakNearbyBusesSummary(nearbyCount, null, lang);
  }
}
