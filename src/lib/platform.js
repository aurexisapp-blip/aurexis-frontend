import { Capacitor } from "@capacitor/core";

// True when running inside the native iOS/Android app shell (Capacitor),
// as opposed to a mobile browser.
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}
