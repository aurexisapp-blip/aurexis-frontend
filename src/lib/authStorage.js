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
    const t0 = Date.now();
    console.log(`[auth] Preferences.set() starting, token len=${token?.length ?? 0}`);
    // Fire-and-forget: if the app backgrounds/gets killed before this
    // resolves, the mirror write could be lost. Logged so a real device
    // trace can show whether that's actually happening (a "starting" log
    // with no matching "completed" log right before a bad reproduction
    // would confirm it) rather than just theorizing about it.
    Preferences.set({ key: KEY, value: token })
      .then(() => console.log(`[auth] Preferences.set() completed in ${Date.now() - t0}ms`))
      .catch((e) => console.log(`[auth] Preferences.set() FAILED after ${Date.now() - t0}ms`, String(e)));
  }
}

export function clearToken() {
  try { localStorage.removeItem(KEY); } catch {}
  if (isNativeApp()) {
    Preferences.remove({ key: KEY })
      .then(() => console.log("[auth] Preferences.remove() completed"))
      .catch((e) => console.log("[auth] Preferences.remove() FAILED", String(e)));
  }
}

// Call once at boot, before the first render that might redirect to /login
// based on an empty token. No-op (resolves immediately) on web.
export async function restoreTokenIfMissing() {
  if (!isNativeApp()) {
    console.log("[auth] restoreTokenIfMissing: not native, skipping");
    return;
  }
  const t0 = Date.now();
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) {
      console.log(`[auth] restoreTokenIfMissing: localStorage already has a token (len=${existing.length}), no restore needed`);
      return;
    }
    console.log("[auth] restoreTokenIfMissing: localStorage is EMPTY, checking Preferences...");
    const { value } = await Preferences.get({ key: KEY });
    if (value) {
      localStorage.setItem(KEY, value);
      console.log(`[auth] restoreTokenIfMissing: RESTORED token from Preferences (len=${value.length}) in ${Date.now() - t0}ms -- localStorage had been wiped`);
    } else {
      console.log(`[auth] restoreTokenIfMissing: Preferences also has nothing (checked in ${Date.now() - t0}ms) -- genuinely logged out, or never logged in on this install`);
    }
  } catch (e) {
    console.log(`[auth] restoreTokenIfMissing: threw an error after ${Date.now() - t0}ms`, String(e));
    // Preferences unavailable or errored -- fall through with whatever
    // localStorage already had (possibly nothing), same as before this fix.
  }
}
