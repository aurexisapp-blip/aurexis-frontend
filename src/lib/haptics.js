import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { isNativeApp } from "./platform";

// Light physical feedback for the iOS app only; a no-op on the web.
export function tapHaptic(style = "light") {
  if (!isNativeApp()) return;
  Haptics.impact({ style: style === "medium" ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
}

// Selection tick for tab switches, segmented controls and toggles.
export function selectionHaptic() {
  if (!isNativeApp()) return;
  Haptics.selectionChanged().catch(() => {});
}
