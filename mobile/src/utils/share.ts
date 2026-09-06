import { Linking, Platform, Share } from "react-native";

/** Shares a message via the native share sheet (WhatsApp etc.); on web opens WhatsApp directly. */
export async function shareMessage(message: string) {
  if (Platform.OS === "web") {
    const nav: any = typeof navigator !== "undefined" ? navigator : null;
    if (nav?.share) {
      try {
        await nav.share({ text: message });
        return;
      } catch {}
    }
    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
    return;
  }
  try {
    await Share.share({ message });
  } catch {}
}
