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

export const PLAN_LABEL = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  elite: "Elite",
};

// Short highlight bullets for the standalone mobile checkout page --
// deliberately not the full feature-matrix copy PlanGate/Pricing use,
// since that page is a comparison table and this one is single-plan-only.
export const PLAN_HIGHLIGHTS = {
  starter: [
    "Entry price, stop loss & profit targets",
    "Edge signal breakdown for every pick",
    "Full picks history with outcomes",
  ],
  pro: [
    "Live screener across 1,200+ stocks",
    "Portfolio tracker with P&L analytics",
    "Advanced filtering & custom signals",
  ],
  elite: [
    "Insider buying & institutional activity",
    "Elite signals & dark pool data",
  ],
};
