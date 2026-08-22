import { AppReview } from "@capawesome/capacitor-app-review";
import { Preferences } from "@capacitor/preferences";
import { isNativeApp } from "./platform";

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
// at most once ever, no two prompts from the *same* gate fire closer than
// MIN_DAYS_BETWEEN_REQUESTS apart, and a single shared session flag keeps
// the two gates from ever stacking in one session. State lives in
// Capacitor Preferences (not localStorage) because iOS can evict a
// WKWebView's localStorage under memory pressure -- see the same
// reasoning in authStorage.js.

const MIN_DAYS_SINCE_SIGNUP = 7;
const MIN_DAYS_BETWEEN_REQUESTS = 60;
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
      if (!isNativeApp()) return;
      if (requestedThisSession) return;

      const state = await loadState();
      if (state[milestone]) return;

      const now = Date.now();
      if (state.lastRequestedAt && (now - state.lastRequestedAt) / DAY_MS < MIN_DAYS_BETWEEN_REQUESTS) return;

      requestedThisSession = true;
      await saveState({ ...state, [milestone]: true, lastRequestedAt: now });
      await action();
    },
  };
}

const starGate = createPromptGate("aurexis_review_prompt_v1");
const sentimentGate = createPromptGate("aurexis_sentiment_gate_v1");

// Call after a trade in the Trade Journal is closed as a win. Fires on the
// user's 1st and 2nd ever winning close; the shared cooldown keeps the 2nd
// naturally spaced out from the 1st rather than needing its own logic.
export function onJournalTradeWon(totalWinsIncludingThisOne) {
  const requestNativeReview = () => AppReview.requestReview().catch(() => {
    // iOS may silently decline (quota already hit this year, etc) -- not an error to surface.
  });
  if (totalWinsIncludingThisOne === 1) starGate.fire("first_win", requestNativeReview);
  else if (totalWinsIncludingThisOne === 2) starGate.fire("second_win", requestNativeReview);
}

// Call opportunistically during active use (not on cold launch) once the
// signed-in user's account is at least a week old.
export function checkActiveWeekReview(createdAtIso) {
  if (!createdAtIso) return;
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
  if (totalWinsIncludingThisOne !== 3) return;
  sentimentGate.fire("third_win", () => { onShouldShow(); });
}
