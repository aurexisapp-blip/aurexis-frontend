import { Preferences } from "@capacitor/preferences";
import { isNativeApp } from "./platform";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Temporary diagnostic sink for the iOS session-logout investigation.
// console.log alone requires a cable + Safari Web Inspector attached to the
// device to read; this also fire-and-forget POSTs to a public backend
// endpoint that just writes it into server logs (`railway logs`), so the
// trace can be read remotely right after a real device reproduces the bug
// -- no cable needed. Deliberately not awaited/blocking anything it's
// called from. Remove once the logout bug is confirmed fixed.
export function alog(message) {
  // eslint-disable-next-line no-console
  console.log(`[auth] ${message}`);
  try {
    fetch(`${API_BASE_URL}/debug/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: "client-auth", message }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

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
    alog(`Preferences.set() starting, token len=${token?.length ?? 0}`);
    // Fire-and-forget: if the app backgrounds/gets killed before this
    // resolves, the mirror write could be lost. Logged so a real device
    // trace can show whether that's actually happening (a "starting" log
    // with no matching "completed" log right before a bad reproduction
    // would confirm it) rather than just theorizing about it.
    Preferences.set({ key: KEY, value: token })
      .then(() => alog(`Preferences.set() completed in ${Date.now() - t0}ms`))
      .catch((e) => alog(`Preferences.set() FAILED after ${Date.now() - t0}ms: ${String(e)}`));
  }
}

export function clearToken() {
  try { localStorage.removeItem(KEY); } catch {}
  if (isNativeApp()) {
    Preferences.remove({ key: KEY })
      .then(() => alog("Preferences.remove() completed"))
      .catch((e) => alog(`Preferences.remove() FAILED: ${String(e)}`));
  }
}

// Call once at boot, before the first render that might redirect to /login
// based on an empty token. No-op (resolves immediately) on web.
export async function restoreTokenIfMissing() {
  if (!isNativeApp()) {
    alog("restoreTokenIfMissing: not native, skipping");
    return;
  }
  const t0 = Date.now();
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) {
      alog(`restoreTokenIfMissing: localStorage already has a token (len=${existing.length}), no restore needed`);
      return;
    }
    alog("restoreTokenIfMissing: localStorage is EMPTY, checking Preferences...");
    const { value } = await Preferences.get({ key: KEY });
    if (value) {
      localStorage.setItem(KEY, value);
      alog(`restoreTokenIfMissing: RESTORED token from Preferences (len=${value.length}) in ${Date.now() - t0}ms -- localStorage had been wiped`);
    } else {
      alog(`restoreTokenIfMissing: Preferences also has nothing (checked in ${Date.now() - t0}ms) -- genuinely logged out, or never logged in on this install`);
    }
  } catch (e) {
    alog(`restoreTokenIfMissing: threw an error after ${Date.now() - t0}ms: ${String(e)}`);
    // Preferences unavailable or errored -- fall through with whatever
    // localStorage already had (possibly nothing), same as before this fix.
  }
}
