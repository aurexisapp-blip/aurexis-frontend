import { CONTRACTS, type AccountResponse, type AnalyzeResponse, type PortfolioResponse, type WatchlistResponse } from "./contracts";

export class ApiError extends Error {
  status: number;
  url: string;
  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
};

const DEFAULT_TIMEOUT_MS = 15000;
const ANALYZE_TIMEOUT_MS = 90000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const GET_CACHE = new Map<string, CacheEntry<unknown>>();
const INFLIGHT = new Map<string, Promise<unknown>>();

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function getCached<T>(key: string): T | null {
  const hit = GET_CACHE.get(key);
  if (!hit) return null;
  if (nowMs() > hit.expiresAt) {
    GET_CACHE.delete(key);
    return null;
  }
  return hit.value as T;
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  const ttl = Number(ttlMs);
  if (!Number.isFinite(ttl) || ttl <= 0) return;
  GET_CACHE.set(key, { expiresAt: nowMs() + ttl, value });
}

async function cachedDeduped<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;

  const existing = INFLIGHT.get(key);
  if (existing) return (await existing) as T;

  const p = (async () => {
    try {
      const v = await fn();
      setCached(key, v, ttlMs);
      return v;
    } finally {
      INFLIGHT.delete(key);
    }
  })();

  INFLIGHT.set(key, p as Promise<unknown>);
  return (await p) as T;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
const API_BASE = API_BASE_URL;

function buildUrl(path: string) {
  const p = String(path || "");
  if (/^https?:\/\//i.test(p)) return p;
  if (!p.startsWith("/")) return `${API_BASE}/${p}`;
  return `${API_BASE}${p}`;
}

function buildQuery(params?: Record<string, unknown>) {
  const p = params && typeof params === "object" ? params : null;
  if (!p) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function readBodySafely(res: Response) {
  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(data: unknown, status: number) {
  if (data && typeof data === "object" && (data as any).detail) return String((data as any).detail);
  if (typeof data === "string" && data.trim()) return data.trim();
  if (status) return `HTTP ${status}`;
  return "Request failed";
}

async function apiRequest<T = unknown>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown, options?: RequestInit & { timeoutMs?: number }): Promise<ApiResult<T>> {
  const url = buildUrl(path);
  const opt = options && typeof options === "object" ? options : {};
  const timeoutMs = Number.isFinite(Number((opt as any).timeoutMs)) ? Number((opt as any).timeoutMs) : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const externalSignal = (opt as any).signal as AbortSignal | undefined;
  const onExternalAbort = () => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  };
  if (externalSignal) {
    if (externalSignal.aborted) {
      onExternalAbort();
    } else {
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
  }
  const to = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const init: RequestInit = {
      ...opt,
      method,
      signal: controller.signal,
    };

    if (method === "POST") {
      init.headers = {
        "Content-Type": "application/json",
        ...(opt.headers && typeof opt.headers === "object" ? (opt.headers as any) : null),
      };
      init.body = body === undefined ? undefined : JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const data = await readBodySafely(res);

    if (!res.ok) {
      const errMsg = extractErrorMessage(data, res.status);
      try {
        // eslint-disable-next-line no-console
        console.error("API_RESPONSE", res);
        // eslint-disable-next-line no-console
        console.error("API_ERROR", { method, path, status: res.status, url, error: errMsg });
      } catch {
        // ignore
      }
      return { ok: false, status: res.status, data: (data as any) ?? null, error: errMsg };
    }

    return { ok: true, status: res.status, data: (data as any) ?? null, error: null };
  } catch (e: any) {
    const isAbort = String(e?.name || "").toLowerCase().includes("abort");
    const errMsg = isAbort ? "Request timed out" : "Network error";
    try {
      // eslint-disable-next-line no-console
      console.error("API_ERROR", { method, path, status: 0, url, error: errMsg });
    } catch {
      // ignore
    }
    return { ok: false, status: 0, data: null, error: errMsg };
  } finally {
    window.clearTimeout(to);
    if (externalSignal) {
      try {
        externalSignal.removeEventListener("abort", onExternalAbort);
      } catch {
        // ignore
      }
    }
  }
}

export async function apiGet<T = unknown>(path: string, options?: RequestInit & { timeoutMs?: number }) {
  return apiRequest<T>("GET", path, undefined, options);
}

export async function apiPost<T = unknown>(path: string, body: unknown, options?: RequestInit & { timeoutMs?: number }) {
  return apiRequest<T>("POST", path, body, options);
}

export async function apiDelete<T = unknown>(path: string, options?: RequestInit & { timeoutMs?: number }) {
  return apiRequest<T>("DELETE", path, undefined, options);
}

export async function apiFetch<T = unknown>(path: string, options?: RequestInit & { timeoutMs?: number }) {
  const opt = options && typeof options === "object" ? options : {};
  const method = String((opt as any).method || "GET").toUpperCase();
  const reqMethod = method === "POST" || method === "DELETE" ? (method as any) : "GET";
  const url = buildUrl(path);

  let body: unknown = undefined;
  if (reqMethod === "POST" && typeof (opt as any).body === "string") {
    try {
      body = JSON.parse(String((opt as any).body));
    } catch {
      body = (opt as any).body;
    }
  }

  const res = await apiRequest<T>(reqMethod, path, body, opt);
  if (res.ok) return (res.data as T) ?? (null as any);
  throw new ApiError(String(res.error || "Request failed"), Number(res.status) || 0, url);
}

function missingRoute(name: string): never {
  throw new ApiError(`MISSING_ROUTE:${name}`, 0, name);
}

function unwrapOrThrow<T>(res: ApiResult<T>, path: string) {
  if (res && res.ok) return (res.data as T) ?? (null as any);
  throw new ApiError(String(res?.error || "Request failed"), Number(res?.status) || 0, buildUrl(path));
}

export async function getHealth() {
  const res = await apiGet<any>(CONTRACTS.health.path);
  return unwrapOrThrow(res, CONTRACTS.health.path);
}

export async function getMarketState() {
  const res = await apiGet<any>(CONTRACTS.marketState.path);
  return unwrapOrThrow(res, CONTRACTS.marketState.path);
}

export async function analyzeSymbol(
  symbol: string,
  options?: {
    budget?: number;
    risk?: string;
    timeframe?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  }
) {
  const s = encodeURIComponent(String(symbol || "").trim().toUpperCase());
  const path0 = CONTRACTS.analyze.path.replace("{symbol}", s);
  const opt = options && typeof options === "object" ? options : {};
  const budget = Number.isFinite(Number(opt.budget)) ? Number(opt.budget) : 1000;
  const risk = typeof opt.risk === "string" && opt.risk.trim() ? opt.risk.trim() : "medium";
  const timeframe = typeof opt.timeframe === "string" && opt.timeframe.trim() ? opt.timeframe.trim() : "swing";
  const path = `${path0}${buildQuery({ budget, risk, timeframe })}`;
  const res = await apiGet<AnalyzeResponse>(path, {
    timeoutMs: Number.isFinite(Number(opt.timeoutMs)) ? Number(opt.timeoutMs) : ANALYZE_TIMEOUT_MS,
    signal: opt.signal,
  });
  return unwrapOrThrow(res, path0);
}

export async function getMovers() {
  const path = CONTRACTS.movers.path;
  if (!path) missingRoute("movers");
  return cachedDeduped<any>(
    `GET:${path}`,
    1000,
    async () => {
      const res = await apiGet<any>(path, { timeoutMs: 8000 });
      return unwrapOrThrow(res, path);
    }
  );
}

export async function getPortfolio() {
  const path = CONTRACTS.portfolio.get.path;
  const res = await apiGet<PortfolioResponse>(path);
  return unwrapOrThrow(res, path);
}

export async function addPortfolio(item: { symbol: string; shares?: number; avg_price?: number }) {
  const path = CONTRACTS.portfolio.add.path;
  const res = await apiPost<PortfolioResponse>(path, item || {});
  return unwrapOrThrow(res, path);
}

export async function removePortfolio(symbol: string) {
  const s = encodeURIComponent(String(symbol || "").trim().toUpperCase());
  const path = CONTRACTS.portfolio.remove.path.replace("{symbol}", s);
  const res = await apiDelete<PortfolioResponse>(path);
  return unwrapOrThrow(res, path);
}

export async function savePick(payload: Record<string, unknown>) {
  const path = CONTRACTS.portfolio.savePick.path;
  const res = await apiPost<{ ok: boolean; id?: string; symbol?: string }>(path, payload || {});
  return unwrapOrThrow(res, path);
}

export async function closePick(payload: { id: string }) {
  const id = encodeURIComponent(String(payload?.id || "").trim().toUpperCase());
  const path = CONTRACTS.portfolio.closePick.path.replace("{symbol}", id);
  const res = await apiDelete<{ ok: boolean; id?: string; symbol?: string }>(path);
  return unwrapOrThrow(res, path);
}

export async function getWatchlist() {
  const path = CONTRACTS.watchlist.get.path;
  const res = await apiGet<WatchlistResponse>(path);
  return unwrapOrThrow(res, path);
}

export async function addWatchlist(symbol: string) {
  const path = CONTRACTS.watchlist.add.path;
  const res = await apiPost<WatchlistResponse>(path, { symbol: String(symbol || "").trim().toUpperCase() });
  return unwrapOrThrow(res, path);
}

export async function removeWatchlist(symbol: string) {
  const s = encodeURIComponent(String(symbol || "").trim().toUpperCase());
  const path = CONTRACTS.watchlist.remove.path.replace("{symbol}", s);
  const res = await apiDelete<WatchlistResponse>(path);
  return unwrapOrThrow(res, path);
}

export async function getAccount() {
  const path = CONTRACTS.account.path;
  const res = await apiGet<AccountResponse>(path);
  return unwrapOrThrow(res, path);
}

export async function getClock() {
  const path = CONTRACTS.clock.path;
  if (!path) missingRoute("clock");
  return apiFetch<any>(path);
}
