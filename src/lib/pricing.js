// Single source of truth for tier pricing on the in-app locked-feature
// screen (PlanGate) and the pricing tab (Pricing), so a price change only
// needs editing once instead of independently in both. Not wired to
// Auth.jsx's own PLANS array (a separate, pre-existing signup-flow module)
// or the backend's PLAN_DISPLAY (auth.py) -- those are out of scope here.
export const PLAN_PRICING = {
  free: 0,
  starter: 9,
  pro: 29,
  elite: 99,
};

export function planPriceLabel(planId) {
  const cents = PLAN_PRICING[planId];
  return cents === undefined ? "" : `$${cents}`;
}
