export type HttpMethod = "GET" | "POST" | "DELETE";

export const CONTRACTS = {
  health: {
    method: "GET" as HttpMethod,
    path: "/health",
  },
  marketState: {
    method: "GET" as HttpMethod,
    path: "/market_state",
  },
  analyze: {
    method: "GET" as HttpMethod,
    path: "/analyze/{symbol}",
  },
  movers: {
    method: "GET" as HttpMethod,
    path: "/top_movers",
    note: "Market movers snapshot.",
  },
  portfolio: {
    get: { method: "GET" as HttpMethod, path: "/portfolio" },
    add: { method: "POST" as HttpMethod, path: "/portfolio" },
    remove: { method: "DELETE" as HttpMethod, path: "/portfolio/{symbol}" },
    savePick: { method: "POST" as HttpMethod, path: "/portfolio" },
    closePick: { method: "DELETE" as HttpMethod, path: "/portfolio/{symbol}" },
  },
  watchlist: {
    get: { method: "GET" as HttpMethod, path: "/watchlist" },
    add: { method: "POST" as HttpMethod, path: "/watchlist" },
    remove: { method: "DELETE" as HttpMethod, path: "/watchlist/{symbol}" },
  },
  account: {
    method: "GET" as HttpMethod,
    path: "/account",
  },
  clock: {
    method: "GET" as HttpMethod,
    path: null as null | string,
    note: "No clock route is implemented in stackiq-prodigy2/app.py.",
  },
} as const;

export type AnalyzeResponse = {
  ok: boolean;
  analysis: Record<string, unknown>;
  degraded?: boolean;
  degraded_reason?: string;
  payload_version?: number;
};

export type PortfolioResponse = {
  ok: boolean;
  items: Array<Record<string, unknown>>;
};

export type WatchlistResponse = {
  ok: boolean;
  items: Array<string>;
};

export type AccountResponse = {
  mode?: string;
  cash?: number;
  equity?: number;
  buying_power?: number;
  account_value?: number;
  updated_at?: string;
  error?: string;
};
