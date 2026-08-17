// A minimal, dependency-free "share this text" helper.
//
// This exists in place of the social graph (add friends, see friends'
// purchases) from the original product plan — that idea was cut because
// cold-start is the #1 killer of consumer social features, and building a
// friend graph nobody uses would look worse than not having one. Sharing a
// list you already made, with whatever share sheet the platform already
// gives you, needs no backend and no other user on Pickly to be useful on
// day one.
import { Platform, Share, Alert } from "react-native";

export async function shareText(message, { subject } = {}) {
  if (Platform.OS !== "web") {
    try {
      await Share.share({ message, title: subject });
    } catch (_) {
      // User dismissed the share sheet — not an error worth surfacing.
    }
    return;
  }

  // Web: prefer the native browser share sheet where it exists (mobile
  // Safari/Chrome), fall back to clipboard, fall back to just showing the
  // text so it can be selected and copied by hand.
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text: message, title: subject });
      return;
    } catch (_) {
      // Fall through to clipboard.
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(message);
      Alert.alert("Copied", "Your list is on the clipboard — paste it anywhere.");
      return;
    } catch (_) {
      // Fall through to the manual-copy alert.
    }
  }
  Alert.alert(subject || "Your list", message);
}
