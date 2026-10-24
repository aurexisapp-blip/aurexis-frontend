// Single source of truth for the public facts about Aurexis: who runs it,
// what it costs, and the FAQ. Used by the About and FAQ pages, the landing
// page's FAQ section, and vite.config.js, which writes the same text into
// index.html as plain HTML so crawlers that don't run JavaScript can read it.
// Plain JS only (no JSX) -- vite.config.js imports this file directly.
//
// Keep every statement here verifiable. No win rates, return figures or
// "verified" claims: the public site makes no performance claims.

export const COMPANY = {
  product: "Aurexis",
  legalName: "Empower PMP LLC",
  state: "Massachusetts",
  entityType: "limited liability company",
  email: "aurexis.app@gmail.com",
  url: "https://useaurexis.com",
};

export const OPERATED_BY = `Aurexis is operated by ${COMPANY.legalName}, a ${COMPANY.state} ${COMPANY.entityType}.`;

export const DESCRIPTION =
  "AI-assisted stock research: each trading day Aurexis scans 1,200+ US stocks and surfaces a trade idea " +
  "with an entry, stop-loss and target, plus plain-English reasoning. You place trades yourself in your " +
  "own brokerage. Educational tool, not investment advice. Free plan; paid plans from $9/month.";

export const PLANS = [
  { name: "Free", price: "$0", detail: "1 AI pick per month, 3 stock analyses per day, market regime indicator" },
  { name: "Starter", price: "$9/month", detail: "3 picks per week, \"Why This Trade\" reasoning, AI news summary, watchlist and trade journal" },
  { name: "Pro", price: "$29/month", detail: "Unlimited daily picks, full trade plan (entry, stop, targets), position sizing, multi-ticker screener" },
];

export const PAYMENTS = "Secure checkout by Stripe. Aurexis never sees or stores your card number.";

export const REFUND =
  "New subscribers can get a full refund within 7 days of their first payment, for any reason: email " +
  `${COMPANY.email} with your account email and purchase date. Refunds are processed within 5–10 business ` +
  "days to the original payment method. After 7 days you can cancel anytime; cancellation takes effect at " +
  "the end of the current billing period and you keep access until then.";

export const DISCLAIMER =
  "Aurexis provides AI-generated trade ideas for educational and informational purposes only. It is not a " +
  "registered investment adviser or broker-dealer, does not provide personalized investment advice, does not " +
  "place trades and does not hold customer funds. Trading involves risk, many trade ideas lose money, and past " +
  "results do not guarantee future results.";

export const FAQ = [
  {
    // Disambiguation: other "Aurex"/"Aurax" brands show up in search and AI answers.
    q: "Is Aurexis the same as Aurex AI, AuraxAI or Aurexis Trader?",
    a: `No. Aurexis (useaurexis.com) is a stock research and paper-trading app by ${COMPANY.legalName}. We never take deposits, connect to brokers or trade for you.`,
  },
  {
    q: "Is Aurexis legit?",
    a: `Aurexis is a subscription software product. ${OPERATED_BY} It sells access to a stock research tool — it doesn't take deposits, manage money or place trades. Payments are processed by Stripe, new subscribers have a 7-day money-back guarantee, and you can reach a real person at ${COMPANY.email}.`,
  },
  {
    q: "Who runs Aurexis?",
    a: `${OPERATED_BY} For support, billing or legal questions, email ${COMPANY.email}.`,
  },
  {
    q: "Does Aurexis place trades or need my brokerage login?",
    a: "No. Aurexis never asks for your brokerage login, cannot access your brokerage account, and never places trades. It gives you an entry price, stop-loss and target; whether and how you trade is up to you, in whatever brokerage you already use.",
  },
  {
    q: "How do refunds work?",
    a: REFUND,
  },
  {
    q: "What is Aurexis?",
    a: "Aurexis is an AI-assisted stock research tool. Each trading day it scans 1,200+ US stocks and surfaces a trade idea with an entry price, stop-loss and target, along with plain-English reasoning for why the setup was picked.",
  },
  {
    q: "How does Aurexis pick stocks?",
    a: "It scores stocks on momentum, volume, trend and volatility, then builds a trade plan from the chart structure: an entry near the current price, a stop-loss below recent support, and targets above it. It shows NO TRADE when nothing meets its threshold instead of forcing a pick.",
  },
  {
    q: "Do the picks always work?",
    a: "No. Many trade ideas lose money — that's normal for any trading approach, and it's why every idea comes with a stop-loss. Aurexis makes no promise of returns, and past results don't guarantee future results.",
  },
  {
    q: "Is this financial advice?",
    a: DISCLAIMER,
  },
  {
    q: "What does it cost?",
    a: "Free ($0): 1 AI pick per month. Starter ($9/month): 3 picks per week with reasoning. Pro ($29/month): unlimited daily picks with the full trade plan. Cancel anytime.",
  },
  {
    q: "How are payments handled?",
    a: `${PAYMENTS}`,
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings at any time — no contracts or cancellation fees. Cancellation takes effect at the end of your current billing period.",
  },
  {
    q: "What brokerage do I need?",
    a: "Any US brokerage works — for example Robinhood, Fidelity, Schwab, Webull or Alpaca. You place the trades yourself; Aurexis never touches your money.",
  },
];

export const ABOUT = [
  "Aurexis is a stock research tool for self-directed investors who want a clear, written trade plan instead of a stream of tips. Each trading day it scans 1,200+ US stocks, picks the setup that best fits its criteria, and lays out an entry, a stop-loss and a target — with the reasoning in plain English.",
  "It's deliberately narrow: no brokerage connection, no trade execution, no access to your money. You decide whether to act on an idea, and you do it in your own brokerage. When nothing meets the bar, Aurexis says so instead of forcing a pick.",
  `${OPERATED_BY} Questions go to ${COMPANY.email}.`,
];
