import { AppReview } from "@capawesome/capacitor-app-review";
import { Preferences } from "@capacitor/preferences";
import { isNativeApp } from "./platform";
import { alog } from "./authStorage";

// Wraps the system review prompt (AppStore.requestReview on iOS 18+,
// SKStoreReviewController.requestReview(in:) below that) via
// @capawesome/capacitor-app-review.
// iOS caps this to ~3 prompts/year on its own, but that's not a license to
// call it freely -- a call that does nothing still means the code *tried*
// to interrupt the user at a bad moment. So this module keeps its own,
// stricter gate on top: each named moment ("milestone") fires at most once
// ever, a shared session flag keeps two milestones from ever firing in
// the same sitting, and the time-based "active_week" milestone additionally
// requires the app to have been opened on >= MIN_ACTIVE_DAYS distinct days
// (recordAppActiveDay) so it can't fire on an old-but-unused account's very
// first session. (An earlier version also enforced a 60-day cooldown
// shared across every milestone -- removed after real-device testing showed
// it silently blocking first_win/second_win for 60 days any time
// active_week happened to fire first, since they all shared one
// `lastRequestedAt` timestamp. Once-ever-per-milestone plus the session flag
// already fully cover "don't feel repetitive.") State lives in Capacitor
// Preferences (not localStorage) because iOS can evict a WKWebView's
// localStorage under memory pressure -- see the same reasoning in
// authStorage.js.

const MIN_DAYS_SINCE_SIGNUP = 7;
// active_week also needs proof the account is actually *used*, not just old.
// "Account is 7 days old" alone fired the prompt on the 2nd tab-tap of the
// first session for any established user (e.g. someone who signed up on web
// months ago and only now installs the app) -- exactly the zero-context
// moment we're trying to avoid. So require the app to have been opened on at
// least this many distinct calendar days too.
const MIN_ACTIVE_DAYS = 3;
const DAY_MS = 86400000;

// Bounded list of distinct "YYYY-MM-DD" (UTC) strings -- one per day the app
// was opened. Capacitor Preferences, same eviction reasoning as the gate state.
const ACTIVE_DAYS_KEY = "aurexis_active_days_v1";

let requestedThisSession = false;

// Call once per app session (on the authenticated App mount). Cheap no-op on
// web and after the first call each day. Kept separate from the visit-ping in
// main.jsx: that one counts anonymous web traffic; this one is only about
// "has this native user come back on different days" for the review gate.
export async function recordAppActiveDay() {
  if (!isNativeApp()) return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { value } = await Preferences.get({ key: ACTIVE_DAYS_KEY });
    const days = value ? JSON.parse(value) : [];
    if (!Array.isArray(days)) { await Preferences.set({ key: ACTIVE_DAYS_KEY, value: JSON.stringify([today]) }); return; }
    if (days.includes(today)) return;
    // keep the last 14 distinct days -- far more than the >=3 check needs
    const next = [...days, today].slice(-14);
    await Preferences.set({ key: ACTIVE_DAYS_KEY, value: JSON.stringify(next) });
    alog(`[review] recordAppActiveDay: ${today} recorded, ${next.length} distinct day(s) total`);
  } catch {}
}

async function getActiveDayCount() {
  try {
    const { value } = await Preferences.get({ key: ACTIVE_DAYS_KEY });
    const days = value ? JSON.parse(value) : [];
    return Array.isArray(days) ? days.length : 0;
  } catch {
    return 0;
  }
}

function createPromptGate(stateKey) {
  let cachedState = null;

  async function loadState() {
    if (cachedState) return cachedState;
    try {
      const { value } = await Preferences.get({ key: stateKey });
      cachedState = value ? JSON.parse(value) : {};
    } catch {
      cachedState = {};
    }
    return cachedState;
  }

  async function saveState(next) {
    cachedState = next;
    try { await Preferences.set({ key: stateKey, value: JSON.stringify(next) }); } catch {}
  }

  return {
    // milestone fires at most once ever; action only runs the first time it's earned.
    async fire(milestone, action) {
      alog(`[review] ${stateKey}/${milestone}: fire() called`);
      if (!isNativeApp()) { alog(`[review] ${stateKey}/${milestone}: SKIPPED -- not native`); return; }
      if (requestedThisSession) { alog(`[review] ${stateKey}/${milestone}: SKIPPED -- already requested this session`); return; }

      const state = await loadState();
      alog(`[review] ${stateKey}/${milestone}: loaded state = ${JSON.stringify(state)}`);
      if (state[milestone]) { alog(`[review] ${stateKey}/${milestone}: SKIPPED -- milestone already fired before`); return; }

      requestedThisSession = true;
      await saveState({ ...state, [milestone]: true, lastRequestedAt: Date.now() });
      alog(`[review] ${stateKey}/${milestone}: FIRING action now`);
      await action();
      alog(`[review] ${stateKey}/${milestone}: action completed`);
    },
  };
}

const starGate = createPromptGate("aurexis_review_prompt_v1");

// Call after a trade in the Trade Journal is closed as a win. Fires on the
// user's 1st and 2nd ever winning close; each fires once ever, and in
// practice they naturally land days apart since real wins take real time.
export function onJournalTradeWon(totalWinsIncludingThisOne) {
  alog(`[review] onJournalTradeWon called with totalWins=${totalWinsIncludingThisOne}`);
  const requestNativeReview = () => AppReview.requestReview()
    .then(() => alog(`[review] AppReview.requestReview() resolved`))
    .catch((e) => alog(`[review] AppReview.requestReview() threw: ${String(e)}`));
  if (totalWinsIncludingThisOne === 1) starGate.fire("first_win", requestNativeReview);
  else if (totalWinsIncludingThisOne === 2) starGate.fire("second_win", requestNativeReview);
  else alog(`[review] onJournalTradeWon: totalWins=${totalWinsIncludingThisOne} matches neither 1 nor 2 -- no-op by design`);
}

// Call opportunistically during active use (not on cold launch) once the
// signed-in user's account is at least a week old AND the app has actually
// been opened on several distinct days -- see MIN_ACTIVE_DAYS.
export function checkActiveWeekReview(createdAtIso) {
  if (!createdAtIso) { alog(`[review] checkActiveWeekReview: no createdAtIso, skipping`); return; }
  const daysSinceSignup = (Date.now() - new Date(createdAtIso).getTime()) / DAY_MS;
  // NaN-safe: an unparseable createdAt must fall through as "not yet", never
  // as ">= 7". (`NaN < 7` is false, so the old `< ` check let it through.)
  if (!(daysSinceSignup >= MIN_DAYS_SINCE_SIGNUP)) {
    alog(`[review] checkActiveWeekReview: account age ${daysSinceSignup} < ${MIN_DAYS_SINCE_SIGNUP}d, skipping`);
    return;
  }
  getActiveDayCount().then((activeDays) => {
    if (activeDays < MIN_ACTIVE_DAYS) {
      alog(`[review] checkActiveWeekReview: only ${activeDays} distinct active day(s), need ${MIN_ACTIVE_DAYS} -- skipping`);
      return;
    }
    starGate.fire("active_week", () => AppReview.requestReview().catch(() => {}));
  });
}
