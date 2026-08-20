import { Preferences } from "@capacitor/preferences";
import { isNativeApp } from "./platform";

// The native app stored aurexis_token in plain localStorage only, with no
// native persistent-storage fallback. A WKWebView's localStorage is NOT
// guaranteed to survive app backgrounding/termination -- iOS can and does
// evict it under memory pressure, which is the standard, well-documented
// cause of "app randomly logs me out after I leave and come back" in
// Capacitor apps. Capacitor Preferences (backed by UserDefaults, a real
// native persistent store) doesn't have that failure mode.
//
// This keeps localStorage as the synchronous primary (dozens of existing
// call sites read it synchronously mid-render/mid-fetch -- migrating all of
// those to the async Preferences API would be a much larger, riskier
// rewrite) and adds Preferences as a durable mirror: every write/clear here
// also fires a best-effort async mirror, and restoreIfMissing() -- called
// once at boot, before the app renders -- copies the token back into
// localStorage if iOS wiped it out from under us but Preferences still has it.

const KEY = "aurexis_token";

export function setToken(token) {
  try { localStorage.setItem(KEY, token); } catch {}
  if (isNativeApp()) {
    Preferences.set({ key: KEY, value: token }).catch(() => {});
  }
}

export function clearToken() {
  try { localStorage.removeItem(KEY); } catch {}
  if (isNativeApp()) {
    Preferences.remove({ key: KEY }).catch(() => {});
  }
}

// Call once at boot, before the first render that might redirect to /login
// based on an empty token. No-op (resolves immediately) on web.
export async function restoreTokenIfMissing() {
  if (!isNativeApp()) return;
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return;
    const { value } = await Preferences.get({ key: KEY });
    if (value) localStorage.setItem(KEY, value);
  } catch {
    // Preferences unavailable or errored -- fall through with whatever
    // localStorage already had (possibly nothing), same as before this fix.
  }
}
