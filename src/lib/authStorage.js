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

// Stable per-install identifier for the account-sharing device cap
// (see /auth/register-device). Generated once and persisted the same way
// as the token itself -- localStorage primary, Preferences mirror on
// native -- so it survives app restarts, not just page reloads. This is
// NOT a security/auth token, just a label for "which install is this."
const DEVICE_KEY = "aurexis_device_id";

function _newDeviceId() {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch {}
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
  } catch {}
  if (isNativeApp()) {
    try {
      const { value } = await Preferences.get({ key: DEVICE_KEY });
      if (value) {
        try { localStorage.setItem(DEVICE_KEY, value); } catch {}
        return value;
      }
    } catch {}
  }
  const id = _newDeviceId();
  try { localStorage.setItem(DEVICE_KEY, id); } catch {}
  if (isNativeApp()) {
    Preferences.set({ key: DEVICE_KEY, value: id }).catch(() => {});
  }
  return id;
}

function _deviceLabel() {
  try {
    const ua = navigator.userAgent || "";
    if (isNativeApp()) return "iOS App";
    if (/iPhone|iPad/.test(ua)) return "iPhone/iPad (web)";
    if (/Android/.test(ua)) return "Android (web)";
    if (/Macintosh/.test(ua)) return "Mac (web)";
    if (/Windows/.test(ua)) return "Windows (web)";
    return "Web browser";
  } catch { return ""; }
}

// Called right after a token is obtained via ANY login path (password+OTP,
// Google, Apple web, Apple native). Returns {ok, blocked, cap} -- the
// caller decides what to do with a blocked result (this function never
// throws for a normal DEVICE_LIMIT_REACHED response, only for genuine
// network failure, which callers should treat as non-blocking since we'd
// rather let a login through on a flaky connection than lock someone out).
export async function registerDevice(token) {
  try {
    const device_id = await getOrCreateDeviceId();
    const res = await fetch(`${API_BASE_URL}/auth/register-device`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_id, label: _deviceLabel() }),
    });
    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      const cap = /DEVICE_LIMIT_REACHED:(\d+)/.exec(data?.detail || "")?.[1];
      return { ok: false, blocked: true, cap: cap ? Number(cap) : null };
    }
    return { ok: res.ok, blocked: false };
  } catch {
    // Network error -- fail open, don't block a login over connectivity.
    return { ok: false, blocked: false };
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
