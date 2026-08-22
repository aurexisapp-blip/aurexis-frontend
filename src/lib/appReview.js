import { AppReview } from "@capawesome/capacitor-app-review";
import { Preferences } from "@capacitor/preferences";
import { isNativeApp } from "./platform";
import { alog } from "./authStorage";

// Two independent, non-naggy prompts around App Store reviews:
//  - the "star" gate: the real StoreKit SKStoreReviewController prompt.
//  - the "sentiment" gate: a custom-built "Enjoying Aurexis?" screen that
//    routes happy users to the App Store listing (for a *written* review,
//    which SKStoreReviewController can't collect) and unhappy users to
//    support instead of the public store page.
// Apple's review API never reports what rating (if any) a user gave, so
// the sentiment gate is NOT sequenced after the star gate -- there's
// nothing to condition on. They're kept independent on purpose.
//
// Both share one gating mechanism: each named moment ("milestone") fires
// at most once ever, and a single shared session flag keeps the two gates
// from ever stacking in one session. (An earlier version also enforced a
// 60-day cooldown shared across every milestone within a gate -- removed
// after real-device testing showed it silently blocking first_win/second_win
// for 60 days any time active_week happened to fire first, since they all
// shared one `lastRequestedAt` timestamp. Once-ever-per-milestone plus the
// session flag already fully cover "don't feel repetitive.") State lives in
// Capacitor Preferences (not localStorage) because iOS can evict a
// WKWebView's localStorage under memory pressure -- see the same
// reasoning in authStorage.js.

const MIN_DAYS_SINCE_SIGNUP = 7;
const DAY_MS = 86400000;

let requestedThisSession = false; // shared across both gates

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
const sentimentGate = createPromptGate("aurexis_sentiment_gate_v1");

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
// signed-in user's account is at least a week old.
export function checkActiveWeekReview(createdAtIso) {
  if (!createdAtIso) { alog(`[review] checkActiveWeekReview: no createdAtIso, skipping`); return; }
  const daysSinceSignup = (Date.now() - new Date(createdAtIso).getTime()) / DAY_MS;
  if (daysSinceSignup < MIN_DAYS_SINCE_SIGNUP) return;
  starGate.fire("active_week", () => AppReview.requestReview().catch(() => {}));
}

// Call after a trade in the Trade Journal is closed as a win. Fires once,
// on the user's 3rd ever winning close -- deliberately later than the star
// gate's 1st/2nd so the two don't feel like the same ask repeated.
// `onShouldShow` opens the custom sentiment-gate modal; the actual
// AppReview.openAppStore() call happens later, only if the user taps "Yes!".
export function checkSentimentGate(totalWinsIncludingThisOne, onShouldShow) {
  alog(`[review] checkSentimentGate called with totalWins=${totalWinsIncludingThisOne}`);
  if (totalWinsIncludingThisOne !== 3) { alog(`[review] checkSentimentGate: not the 3rd win -- no-op by design`); return; }
  sentimentGate.fire("third_win", () => { onShouldShow(); });
}
