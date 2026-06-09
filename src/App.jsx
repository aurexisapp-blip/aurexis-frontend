// src/App.jsx (TOP SECTION ONLY — SAFE)

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { AnimatePresence, animate, motion } from "framer-motion";

import AIScoreRing from "./AIScoreRing";
import Landing from "./Landing";

import {
  apiFetch as apiClientFetch,
  analyzeSymbol as apiAnalyzeSymbol,
  getHealth as apiGetHealth,
  getMarketState as apiGetMarketState,
  getAccount as apiGetAccount,
  getMovers as apiGetMovers,
  getPortfolio as apiGetPortfolio,
  getWatchlist as apiGetWatchlist,
  addWatchlist as apiAddWatchlist,
  removeWatchlist as apiRemoveWatchlist,
  removePortfolio as apiRemovePortfolio,
  savePick as apiSavePick,
} from "./api/client";

import { normalizeAnalysis } from "./api/normalize";

// ---------- API base ----------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_BASE = API_BASE_URL;
const API = API_BASE_URL;

// ---------- RippleButton ----------
function RippleButton({ children, onClick, className, style, disabled, type, ...rest }) {
  const [ripples, setRipples] = React.useState([]);
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2.5;
    const id = Date.now() + Math.random();
    setRipples((p) => [...p, { id, x, y, size }]);
    window.setTimeout(() => setRipples((p) => p.filter((r) => r.id !== id)), 580);
    if (typeof onClick === "function") onClick(e);
  };
  return (
    <button
      className={className}
      style={{ ...style, position: "relative", overflow: "hidden" }}
      disabled={disabled}
      type={type || "button"}
      onClick={handleClick}
      {...rest}
    >
      {ripples.map(({ id, x, y, size }) => (
        <span
          key={id}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: x - size / 2,
            top: y - size / 2,
            width: size,
            height: size,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.13)",
            animation: "rippleOut 0.55s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      ))}
      {children}
    </button>
  );
}

// ---------- Small helper ----------
const DEFAULT_TIMEOUT_MS = 10000;

async function fetchWithRetry(fn, retries = 2) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      return await fetchWithRetry(fn, retries - 1);
    }
    throw err;
  }
}

function pickRotatingLoaderText(t0) {
  const msgs = [
    "Scanning sector momentum…",
    "Building trade plan…",
    "Calculating execution zones…",
  ];
  const base = Number(t0) || Date.now();
  const idx = Math.floor((Date.now() - base) / 1800) % msgs.length;
  return msgs[Math.max(0, Math.min(msgs.length - 1, idx))] || "Analyzing market structure…";
}

function SkeletonCard({ title }) {
  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <div className="cardTitle">{title || "Analyzing market structure…"}</div>
          <div className="cardSub">Please wait.</div>
        </div>
      </div>
      <div className="cardBody">
        <div style={{ display: "grid", gap: 10 }}>
          <div className="skeletonShimmer" style={{ height: 12, width: "52%" }} />
          <div className="skeletonShimmer" style={{ height: 12, width: "78%" }} />
          <div className="skeletonShimmer" style={{ height: 12, width: "64%" }} />
          <div className="skeletonShimmer" style={{ height: 12, width: "70%", marginTop: 6 }} />
        </div>
      </div>
    </div>
  );
}
 function ProGate({ enabled, onUpgrade, children }) {
  if (!enabled) return children;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(6px)", opacity: 0.55, pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          padding: 14,
        }}
      >
        <div
          className="monoBox"
          style={{
            width: "min(520px, 100%)",
            textAlign: "center",
            background: "rgba(255,255,255,0.025)",
            borderColor: "rgba(255,255,255,0.25)",
          }}
        >
          <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 10 }}>Pro feature</div>
          <div className="mutedSmall" style={{ marginBottom: 12 }}>Upgrade to unlock trade plans, execution timing, and reasoning.</div>
          <button className="btn btn--primary" onClick={onUpgrade}>Upgrade</button>
        </div>
      </div>
    </div>
  );
 }

function EmptyState({ title, description, action, onAction }) {
  return (
    <div>
      {title ? <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div> : null}
      <div className="mutedSmall">{description || "Unavailable."}</div>
      {action && typeof onAction === "function" ? (
        <div style={{ marginTop: 12 }}>
          <button className="btn btn--ghost" onClick={onAction}>{action}</button>
        </div>
      ) : null}
    </div>
  );
}

const fmtPct1 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(1)}%`;
};

const fmtRatio2 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
};

function SystemAlert({ type, message }) {
  const isWarn = String(type || "").toLowerCase() === "warning";
  return (
    <div
      className="monoBox"
      style={{
        marginBottom: 12,
        borderColor: isWarn ? "rgba(250, 204, 21, 0.22)" : "rgba(255,255,255,0.12)",
        background: isWarn ? "rgba(250, 204, 21, 0.08)" : "rgba(255,255,255,0.04)",
      }}
    >
      {message || "System message"}
    </div>
  );
}

function classificationPillClass(label) {
  const s = String(label || "").toLowerCase();
  if (!s || s === "—") return "pill pill--neutral";
  if (s.includes("strong") || s.includes("buy") || s.includes("bull")) return "pill pill--good";
  if (s.includes("sell") || s.includes("bear")) return "pill pill--bad";
  return "pill pill--neutral";
}

function summarizePayloadShape(data) {
  const rootKeys =
    data && typeof data === "object" && !Array.isArray(data)
      ? Object.keys(data)
      : Array.isArray(data)
        ? [`array(${data.length})`]
        : [];

  const shape = {};
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const k of rootKeys) {
      const v = data?.[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        shape[k] = Object.keys(v);
      } else if (Array.isArray(v)) {
        shape[k] = [`array(${v.length})`];
      }
    }
  }

  return { rootKeys, shape };
}

async function apiFetch(path, options) {
  const p = String(path || "");
  const url = /^https?:\/\//i.test(p)
    ? p
    : p.startsWith("/")
      ? `${API_BASE}${p}`
      : `${API_BASE}/${p}`;

  const opt = options && typeof options === "object" ? options : {};
  const hasSignal = Boolean(opt.signal);
  const t = hasSignal ? null : withTimeoutMs(DEFAULT_TIMEOUT_MS);
  const signal = hasSignal ? opt.signal : t.signal;

  // Auto-inject auth token if present and not already set
  const _tok = localStorage.getItem("aurexis_token");
  const existingAuth = (opt.headers instanceof Headers ? opt.headers.get("Authorization") : (opt.headers || {})["Authorization"]);
  const authHeaders = (_tok && !existingAuth) ? { Authorization: `Bearer ${_tok}` } : {};
  const mergedHeaders = { ...(opt.headers && typeof opt.headers === "object" ? opt.headers : {}), ...authHeaders };

  const method = String(opt.method || "GET").toUpperCase();
  const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();

  let res;
  let text = "";

  try {
    res = await fetch(url, { ...opt, signal, headers: mergedHeaders });
    text = await res.text();
  } catch (err) {
    const isAbort = String(err?.name || "").toLowerCase().includes("abort");
    if (isAbort) {
      const e = new Error("TIMEOUT");
      e.code = "TIMEOUT";
      throw e;
    }
    const e = new Error("NETWORK_ERROR");
    e.code = "NETWORK_ERROR";
    throw e;
  } finally {
    if (t) t.cancel();
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const latencyMs = Math.max(0, Math.round(t1 - t0));
  try {
    if (typeof window !== "undefined" && typeof window.__AUREXIS_DEBUG_HOOK__ === "function") {
      const { rootKeys: payloadKeys, shape: payloadShape } = summarizePayloadShape(data);
      window.__AUREXIS_DEBUG_HOOK__({ method, url, status: res?.status, ok: Boolean(res?.ok), latencyMs, payloadKeys, payloadShape });
    }
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg =
      (data && data.detail) ||
      (typeof data === "string" ? data : null) ||
      `HTTP ${res.status}`;

    const e = new Error(String(msg || "Request failed"));
    e.status = res.status;
    throw e;
  }

  return data;
}

async function apiGet(path, options) {
  return apiClientFetch(path, { ...(options && typeof options === "object" ? options : null), method: "GET" });
}

async function apiPost(path, body, options) {
  const opt = options && typeof options === "object" ? options : {};
  return apiClientFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opt.headers && typeof opt.headers === "object" ? opt.headers : null),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...opt,
  });
}

async function apiPostFirstAvailable(paths, body, options) {
  const candidates = Array.isArray(paths) ? paths.filter(Boolean) : [];
  let lastErr = null;
  for (const path of candidates) {
    try {
      return await apiPost(path, body, options);
    } catch (e) {
      lastErr = e;
      const status = Number(e?.status);
      if (status !== 404 && status !== 405) throw e;
    }
  }
  throw lastErr || new Error("No compatible POST endpoint found");
}

async function safeApiCall(fn, { onToast, context } = {}) {
  try {
    return await fn();
  } catch (e) {
    try {
      if (typeof onToast === "function") onToast("Live data temporarily unavailable.");
    } catch {
      // ignore
    }
    if (context) {
      try {
        e.__context = context;
      } catch {
        // ignore
      }
    }
    throw e;
  }
}

// ---------- Customer-safe error mapping ----------
function friendlyError(err, context = "") {
  const status = err?.status;
  const code = err?.code;
  const raw = String(err?.message || "").toLowerCase();

  if (code === "TIMEOUT" || raw.includes("timeout")) {
    return "Request timed out. Please retry.";
  }

  if (code === "NETWORK_ERROR" || raw.includes("failed to fetch")) {
    return "Can’t reach the server right now. Try again in a moment.";
  }

  if (status === 400 || status === 422) {
    if (context === "analyze") {
      return "Invalid symbol. Use 1–5 letters only (example: NVDA).";
    }
    return "Invalid request.";
  }

  if (status === 404) return "Not found.";
  if (status === 429) return "Too many requests. Try again.";
  if (status >= 500) return "Server error. Try again shortly.";

  // For recommendation/analyze flows, surface backend detail when available.
  if (context === "recommend" || context === "analyze") {
    const msg = String(err?.message || "").trim();
    if (msg && msg.toLowerCase() !== "request failed") return msg;
  }

  return "Something went wrong.";
}

// ---------- Tiny utils ----------
const normalizeSymbol = (s) => String(s || "").trim().toUpperCase();

// Convert an ET wall-clock time (hour 0-23, minute 0-59) to the user's local time string.
// Adds 24 h when the target ET time has already passed today, so it always returns a future time.
const etToLocal = (etHour, etMinute) => {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const etTarget = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  etTarget.setHours(etHour, etMinute, 0, 0);
  let diffMs = etTarget - etNow;
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
  return new Date(now.getTime() + diffMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Format any timestamp value (ISO string, unix seconds, or ms) as a short local date.
const fmtPickTimestamp = (pick) => {
  const raw = pick?.recorded_at ?? pick?.created_at ?? pick?.date ?? pick?.timestamp ?? pick?.ts ?? pick?.saved_at ?? pick?.closedAt ?? pick?.closed_at;
  if (!raw) return null;
  try {
    const n = Number(raw);
    const d = Number.isFinite(n) && n > 0
      ? new Date(n < 1e12 ? n * 1000 : n)
      : new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return null;
  }
};

const money = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
};

function fmtTime(t) {
  const sec = toUnixSeconds(t);
  if (!sec) return "—";
  try {
    return new Date(sec * 1000).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function extractHeadlines(a) {
  const sentCandidate =
    a?.sentiment ??
    a?.news_sentiment ??
    a?.newsSentiment ??
    a?.sentiment_analysis ??
    a?.news_and_sentiment ??
    a?.newsAndSentiment ??
    a?.ns;
  const sent = sentCandidate && typeof sentCandidate === "object" ? sentCandidate : null;

  const list =
    Array.isArray(a?.news?.headlines)
      ? a.news.headlines
      : Array.isArray(a?.news?.items)
        ? a.news.items
        : Array.isArray(sent?.headlines)
          ? sent.headlines
          : Array.isArray(sent?.news)
            ? sent.news
            : Array.isArray(sent?.items)
              ? sent.items
              : Array.isArray(sent?.latest)
                ? sent.latest
                : Array.isArray(a?.news)
                  ? a.news
                  : [];

  return Array.isArray(list) ? list : [];
}

function extractTradePlan(a) {
  if (!a || typeof a !== "object") return { entries: [], entry: null, stop: "—", targets: [], expectedGainPct: null, rr: "—" };

  const tp =
    (a.trade_plan && typeof a.trade_plan === "object" ? a.trade_plan : null) ||
    (a.tradePlan && typeof a.tradePlan === "object" ? a.tradePlan : null) ||
    (a.plan && typeof a.plan === "object" ? a.plan : null) ||
    (a.trade && typeof a.trade === "object" ? a.trade : null);

  const ep =
    (a.execution_plan && typeof a.execution_plan === "object" ? a.execution_plan : null) ||
    (a.executionPlan && typeof a.executionPlan === "object" ? a.executionPlan : null) ||
    (a.execution && typeof a.execution === "object" ? a.execution : null);

  const entries =
    (Array.isArray(tp?.entries) ? tp.entries : null) ||
    (Array.isArray(tp?.entry) ? tp.entry : null) ||
    (Array.isArray(tp?.entry_rules) ? tp.entry_rules : null) ||
    (Array.isArray(tp?.entryRules) ? tp.entryRules : null) ||
    (Array.isArray(a?.entries) ? a.entries : null) ||
    (Array.isArray(a?.entry_rules) ? a.entry_rules : null) ||
    (Array.isArray(a?.entryRules) ? a.entryRules : null) ||
    [];

  const entryText = typeof tp?.entry === "string" ? tp.entry : typeof tp?.entry_text === "string" ? tp.entry_text : null;

  const epMethod =
    typeof ep?.entry_method === "string"
      ? ep.entry_method
      : typeof ep?.entryMethod === "string"
        ? ep.entryMethod
        : typeof ep?.method === "string"
          ? ep.method
          : typeof ep?.entry === "string"
            ? ep.entry
            : null;
  const epBuyZone = ep?.buy_zone ?? ep?.buyZone;

  const stop =
    tp?.stop_loss ??
    tp?.stopLoss ??
    tp?.stop ??
    a?.price_context?.stop ??
    a?.stop_loss ??
    a?.stopLoss ??
    a?.stop;

  const targets =
    normalizeTargets(
      a?.price_context,
      (Array.isArray(tp?.targets) ? tp.targets : null) ||
        (Array.isArray(tp?.profit_targets) ? tp.profit_targets : null) ||
        (Array.isArray(tp?.profitTargets) ? tp.profitTargets : null) ||
        (Array.isArray(a?.targets) ? a.targets : null) ||
        (Array.isArray(a?.profit_targets) ? a.profit_targets : null) ||
        (Array.isArray(a?.profitTargets) ? a.profitTargets : null)
    ) || ["—"];

  const rr = tp?.risk_reward ?? tp?.riskReward ?? tp?.rr ?? a?.risk_reward ?? a?.riskReward ?? a?.rr;

  const entryCand =
    tp?.entry ??
    tp?.entry_price ??
    tp?.entryPrice ??
    a?.price_context?.entry ??
    a?.entry ??
    a?.entry_price ??
    a?.entryPrice;
  const entryNum = _toNum(entryCand);

  const expectedGainPct =
    tp?.expected_gain_pct ??
    tp?.expectedGainPct ??
    tp?.gain_pct ??
    tp?.gainPct ??
    a?.expected_gain_pct ??
    a?.expectedGainPct ??
    null;

  // If risk/reward missing, compute from numeric entry/target/stop when possible.
  let rrText = rr === undefined || rr === null || rr === "" ? "" : fmtAnalyzeValue(rr);
  if (!rrText || rrText === "—") {
    const pn = extractPlanNumbers(a);
    const entryN = pn.entry;
    const stopN = pn.stop;
    const tgtN = Array.isArray(pn.targets) && pn.targets.length ? pn.targets[Math.min(1, pn.targets.length - 1)] : null;
    const riskPerShare = entryN !== null && stopN !== null ? entryN - stopN : null;
    const rewardPerShare = entryN !== null && tgtN !== null ? tgtN - entryN : null;
    const rrNum =
      riskPerShare !== null && rewardPerShare !== null && Number.isFinite(riskPerShare) && Number.isFinite(rewardPerShare) && riskPerShare > 0
        ? rewardPerShare / riskPerShare
        : null;
    rrText = rrNum !== null && Number.isFinite(rrNum) ? fmtRatio2(rrNum) : "—";
  }

  return {
    entries: Array.isArray(entries)
      ? entries.filter((x) => typeof x === "string" && x.trim()).slice(0, 6)
      : entryText && entryText.trim()
        ? [entryText.trim()]
        : typeof epMethod === "string" && epMethod.trim() && epBuyZone !== undefined && epBuyZone !== null && String(epBuyZone).trim()
          ? [`${epMethod.trim()} near ${fmtAnalyzeValue(epBuyZone)}`]
          : typeof epMethod === "string" && epMethod.trim()
            ? [epMethod.trim()]
            : [],
    entry: entryNum,
    stop: stop === undefined || stop === null || stop === "" ? "—" : fmtAnalyzeValue(stop),
    targets,
    expectedGainPct: _toNum(expectedGainPct),
    rr: rrText,
  };
}

function hasRenderableTradePlan(tp) {
  const plan = tp && typeof tp === "object" ? tp : null;
  if (!plan) return false;
  const hasEntries = Array.isArray(plan.entries) && plan.entries.some((x) => typeof x === "string" && x.trim());
  const hasEntryNum = Number.isFinite(Number(plan.entry));
  const hasStop = typeof plan.stop === "string" ? plan.stop.trim() && plan.stop.trim() !== "—" : plan.stop !== null && plan.stop !== undefined;
  const hasTargets = Array.isArray(plan.targets) && plan.targets.some((t) => String(t).trim() && String(t).trim() !== "—");
  return Boolean(hasEntryNum || hasEntries || hasStop || hasTargets);
}

function augmentAnalysisForUi(analysisPayload) {
  const ap = analysisPayload && typeof analysisPayload === "object" ? analysisPayload : null;
  if (!ap) return null;

  const _isPlaceholderText = (s) => {
    const t = String(s || "").trim().toLowerCase();
    if (!t) return true;
    return t === "—" || t === "-" || t === "n/a" || t === "na" || t === "none" || t === "null" || t === "unavailable" || t === "news unavailable.";
  };

  const _headlineStrings = (v, max = 12) => {
    const a = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
    return a
      .map((x) => {
        if (typeof x === "string") return x;
        if (x && typeof x === "object") return x.headline ?? x.title ?? x.summary ?? x.text ?? "";
        return x === null || x === undefined ? "" : String(x);
      })
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => typeof x === "string" && x.trim() && !_isPlaceholderText(x))
      .slice(0, max);
  };

  const reasoning0 = ap?.reasoning && typeof ap.reasoning === "object" ? ap.reasoning : null;
  const technicals0 = ap?.technicals && typeof ap.technicals === "object" ? ap.technicals : null;
  const news0 = ap?.news && typeof ap.news === "object" ? ap.news : null;

  // =========================
  // SYSTEM EXPECTATION
  // =========================
  const sysExpRaw =
    ap?.system_expectation && typeof ap.system_expectation === "object"
      ? ap.system_expectation
      : typeof ap?.system_expectation === "string"
        ? { summary: ap.system_expectation }
        : {
            summary:
              (typeof reasoning0?.summary === "string" ? reasoning0.summary : "") ??
              (typeof reasoning0?.expectation === "string" ? reasoning0.expectation : "") ??
              ap?.system_expectation_summary ??
              ap?.expectation ??
              ap?.decision?.expectation ??
              ap?.summary ??
              "",
          };

  const whyArr = _arrStrings(
    sysExpRaw?.why ??
      ap?.trade_plan?.why ??
      reasoning0?.why ??
      ap?.why ??
      ap?.decision?.why ??
      ap?.analysis?.why,
    10
  );

  const confArr = _arrStrings(
    sysExpRaw?.confirms ??
      ap?.trade_plan?.confirms ??
      reasoning0?.confirms ??
      ap?.confirms ??
      ap?.what_confirms ??
      ap?.decision?.confirms ??
      ap?.analysis?.confirms,
    10
  );

  const breaksArr = _arrStrings(
    sysExpRaw?.breaks ??
      ap?.trade_plan?.breaks ??
      reasoning0?.breaks ??
      ap?.breaks ??
      ap?.what_breaks ??
      ap?.decision?.breaks ??
      ap?.analysis?.breaks,
    10
  );

  const recheckText0 =
    sysExpRaw?.when_to_recheck ??
    reasoning0?.recheck ??
    reasoning0?.when_to_recheck ??
    ap?.when_to_recheck ??
    ap?.when_to_check_again ??
    ap?.recheck ??
    ap?.when_to_recheck_again ??
    ap?.when_check_again ??
    ap?.check_again ??
    ap?.decision?.recheck ??
    ap?.analysis?.recheck ??
    "";

  const recheckText =
    typeof recheckText0 === "string" && recheckText0.trim()
      ? recheckText0.trim()
      : breaksArr.length
        ? `Recheck if: ${breaksArr[0]}`
        : confArr.length
          ? `Recheck after: ${confArr[0]}`
          : "";

  // =========================
  // CORE OBJECTS
  // =========================
  const tp0 = ap?.trade_plan && typeof ap.trade_plan === "object" ? ap.trade_plan : {};
  const ep0 = ap?.execution_plan && typeof ap.execution_plan === "object" ? ap.execution_plan : {};
  const ta0 =
    (ap?.technical_analysis && typeof ap.technical_analysis === "object" ? ap.technical_analysis : null) ||
    (technicals0?.technical_analysis && typeof technicals0.technical_analysis === "object" ? technicals0.technical_analysis : null) ||
    {};
  const ns0 =
    (ap?.news_sentiment && typeof ap.news_sentiment === "object" ? ap.news_sentiment : null) ||
    (ap?.newsSentiment && typeof ap.newsSentiment === "object" ? ap.newsSentiment : null) ||
    {};

  // =========================
  // NEWS
  // =========================
  const headlines = _headlineStrings(
    ns0?.headlines ??
      ns0?.items ??
      ns0?.latest ??
      ap?.headlines ??
      ap?.news?.headlines ??
      ap?.news?.items ??
      news0?.headlines ??
      news0?.items,
    12
  );

  const newsSummary0 =
    typeof ns0?.summary === "string"
      ? ns0.summary
      : typeof ns0?.narrative === "string"
        ? ns0.narrative
        : typeof ns0?.explanation === "string"
          ? ns0.explanation
      : typeof ap?.news_sentiment?.summary === "string"
        ? ap.news_sentiment.summary
        : typeof ap?.newsSentiment?.summary === "string"
          ? ap.newsSentiment.summary
        : typeof ap?.news?.summary === "string"
          ? ap.news.summary
        : typeof news0?.summary === "string"
          ? news0.summary
        : typeof ap?.summary === "string"
          ? ap.summary
          : "";

  const derivedSentLine =
    (whyArr.find((x) => typeof x === "string" && x.toLowerCase().includes("sentiment")) ||
      whyArr.find((x) => typeof x === "string" && x.toLowerCase().includes("news")) ||
      "").trim();

  const newsSummary =
    typeof newsSummary0 === "string" && newsSummary0.trim() && !_isPlaceholderText(newsSummary0)
      ? newsSummary0.trim()
      : derivedSentLine;

  const deriveDirectionFromText = (t) => {
    const s = String(t || "").toUpperCase();
    if (s.includes("BULL")) return "BULLISH";
    if (s.includes("BEAR")) return "BEARISH";
    if (s.includes("NEUTRAL")) return "NEUTRAL";
    return "";
  };

  const newsDirectionRaw =
    ns0?.direction ??
    ns0?.bias ??
    ap?.news_sentiment?.direction ??
    ap?.newsSentiment?.direction ??
    news0?.direction ??
    news0?.sentiment ??
    ap?.direction;
  const newsDirection0 =
    typeof newsDirectionRaw === "string"
      ? newsDirectionRaw
      : newsDirectionRaw === null || newsDirectionRaw === undefined
        ? ""
        : String(newsDirectionRaw);
  const newsDirection = newsDirection0.trim() && !_isPlaceholderText(newsDirection0) ? newsDirection0 : deriveDirectionFromText(newsSummary);

  const bestPick0 =
    (ap?.best_pick && typeof ap.best_pick === "object" ? ap.best_pick : null) ||
    (ap?.bestPick && typeof ap.bestPick === "object" ? ap.bestPick : null) ||
    (ap?.pick && typeof ap.pick === "object" ? ap.pick : null) ||
    null;
  const best_pick =
    bestPick0 && typeof bestPick0 === "object"
      ? {
          ...bestPick0,
          symbol: normalizeSymbol(bestPick0?.symbol || ap?.symbol || ""),
          score: bestPick0?.score ?? ap?.score,
          confidence: bestPick0?.confidence ?? ap?.confidence,
        }
      : {
          symbol: normalizeSymbol(ap?.symbol || ""),
          score: ap?.score,
          confidence: ap?.confidence,
        };

  // =========================
  // RETURN AUGMENTED PAYLOAD
  // =========================
  return {
    ...ap,

    best_pick,

    score: ap?.score ?? technicals0?.ai_score_10 ?? technicals0?.ai_score ?? technicals0?.aiScore,
    confidence:
      ap?.confidence ??
      technicals0?.execution_score_10 ??
      technicals0?.execution_score ??
      technicals0?.executionScore,

    // ===== UI-READY SYSTEM EXPECTATION =====
    systemExpectation: {
      summary: sysExpRaw?.summary || "",
      why: whyArr,
      confirms: confArr,
      breaks: breaksArr,
      whenToRecheck: recheckText,
    },

    when_to_recheck: recheckText,
    when_to_check_again: recheckText,
    recheck: recheckText,

    // ===== LEGACY SUPPORT (if UI still reads snake_case) =====
    system_expectation: {
      ...sysExpRaw,
      why: whyArr,
      confirms: confArr,
      breaks: breaksArr,
      when_to_recheck: recheckText,
    },

    // ===== TRADE PLAN =====
    tradePlan: {
      entry: tp0?.entry ?? tp0?.entry_rule ?? "",
      stopLoss: tp0?.stop_loss ?? tp0?.stopLoss ?? "",
      targets: Array.isArray(tp0?.targets) ? tp0.targets : [],
      riskReward: tp0?.risk_reward ?? tp0?.riskReward ?? "",
    },

    trade_plan: {
      ...tp0,
      why: whyArr,
      confirms: confArr,
      breaks: breaksArr,
    },

    // ===== TECHNICALS =====
    technical_analysis: {
      ...(ta0 && typeof ta0 === "object" ? ta0 : null),
      momentum: _toPct100(ta0?.momentum),
      trend: _toPct100(ta0?.trend),
      volatility: _toPct100(ta0?.volatility),
      liquidity: _toPct100(ta0?.liquidity),
      risk: _toPct100(ta0?.risk),
      signals: Array.isArray(ta0?.signals)
        ? ta0.signals
        : Array.isArray(ta0?.signal)
          ? ta0.signal
          : Array.isArray(ta0?.notes)
            ? ta0.notes
            : Array.isArray(ta0?.bullets)
              ? ta0.bullets
              : [],
    },

    // ===== NEWS =====
    news_sentiment: {
      ...ns0,
      direction: String(ns0?.direction ?? news0?.direction ?? news0?.sentiment ?? ap?.direction ?? "NEUTRAL"),
      summary: newsSummary,
      headlines,
    },

    // ===== EXECUTION PLAN =====
    executionPlan: {
      day: ep0?.day ?? ep0?.execute_day ?? "",
      window: ep0?.window ?? ep0?.window_text ?? "",
      entryMethod: ep0?.entry_method ?? ep0?.method ?? "",
      buyZone: ep0?.buy_zone ?? tp0?.entry ?? "",
    },

    execution_plan: {
      ...ep0,
      day: ep0?.day ?? ep0?.execute_day ?? ep0?.executeDay,
      window: ep0?.window ?? ep0?.window_text ?? ep0?.windowText,
      entry_method: ep0?.entry_method ?? ep0?.method ?? ep0?.entry ?? ep0?.entryMethod,
      buy_zone: ep0?.buy_zone ?? ep0?.buyZone ?? tp0?.entry ?? ap?.entry,
    },

    // ===== REQUIRED NESTED SHAPE (Dashboard bindings) =====
    reasoning: {
      why: whyArr,
      confirms: confArr,
      breaks: breaksArr,
    },
    news: {
      headlines,
      direction: newsDirection,
      summary: newsSummary,
    },
    technicals: {
      technical_analysis: {
        momentum: _toPct100(ta0?.momentum),
        trend: _toPct100(ta0?.trend),
        volatility: _toPct100(ta0?.volatility),
        liquidity: _toPct100(ta0?.liquidity),
        risk: _toPct100(ta0?.risk),
      },
      ai_score:
        technicals0?.ai_score ??
        technicals0?.aiScore ??
        ap?.technicals?.ai_score ??
        ap?.technicals?.aiScore,
      ai_score_10: technicals0?.ai_score_10 ?? ap?.technicals?.ai_score_10 ?? ap?.technicals?.aiScore10,
      execution_score:
        technicals0?.execution_score ??
        technicals0?.executionScore ??
        ap?.technicals?.execution_score ??
        ap?.technicals?.executionScore,
      execution_score_10:
        technicals0?.execution_score_10 ?? ap?.technicals?.execution_score_10 ?? ap?.technicals?.executionScore10,
    },
  };
}

function extractPlanNumbers(analysisObj) {
  const a = analysisObj && typeof analysisObj === "object" ? analysisObj : null;
  if (!a) return { entry: null, stop: null, targets: [] };

  const tpRaw =
    (a.trade_plan && typeof a.trade_plan === "object" ? a.trade_plan : null) ||
    (a.tradePlan && typeof a.tradePlan === "object" ? a.tradePlan : null) ||
    (a.plan && typeof a.plan === "object" ? a.plan : null) ||
    null;

  const entryCand = tpRaw?.entry ?? tpRaw?.entry_price ?? tpRaw?.entryPrice ?? a?.entry ?? a?.entry_price ?? a?.entryPrice;
  const stopCand = tpRaw?.stop ?? tpRaw?.stop_loss ?? tpRaw?.stopLoss ?? a?.price_context?.stop ?? a?.stop ?? a?.stop_loss ?? a?.stopLoss;

  const entry = _toNum(entryCand);
  const stop = _toNum(stopCand);

  const tArr =
    (Array.isArray(tpRaw?.targets) ? tpRaw.targets : null) ||
    (Array.isArray(tpRaw?.profit_targets) ? tpRaw.profit_targets : null) ||
    (Array.isArray(tpRaw?.profitTargets) ? tpRaw.profitTargets : null) ||
    (Array.isArray(a?.targets) ? a.targets : null) ||
    (Array.isArray(a?.profit_targets) ? a.profit_targets : null) ||
    (Array.isArray(a?.profitTargets) ? a.profitTargets : null) ||
    [];

  const targets = (Array.isArray(tArr) ? tArr : []).map((x) => _toNum(x)).filter((n) => n !== null);
  return { entry: entry !== null ? entry : null, stop: stop !== null ? stop : null, targets };
}

const pct = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(2)}%`;
};

const fmt = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));

function fmtHuman(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const summary = v?.summary ?? v?.text ?? v?.message ?? v?.title;
    if (typeof summary === "string" && summary.trim()) return summary;
    try {
      return JSON.stringify(v);
    } catch {
      return "—";
    }
  }
  return String(v);
}

const fmt2 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
};

const fmtPrice = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `$${x.toFixed(2)}`;
};

const fmtScore10 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(0, Math.min(10, n));
  return clamped.toFixed(1);
};

const fmtPct0 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(0, Math.min(100, n));
  return `${Math.round(clamped)}%`;
};

const readLastPrice = (obj) => {
  const o = obj && typeof obj === "object" ? obj : null;
  if (!o) return null;
  const n =
    o?.last_price ??
    o?.lastPrice ??
    o?.last ??
    o?.price ??
    o?.snapshot?.last ??
    o?.snapshot?.last_price ??
    o?.snapshot?.lastPrice ??
    o?.snapshot?.price;
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? x : null;
};

const validateTradePlanAgainstLast = ({ trade, last, timeframe }) => {
  const tf = String(timeframe || "").toLowerCase();
  const entry = Number(trade?.entry);
  const stop = Number(trade?.stop);
  const targetsArr = Array.isArray(trade?.targets) ? trade.targets : [];
  const targets = targetsArr.map((t) => Number(t)).filter((t) => Number.isFinite(t));

  if (!Number.isFinite(last) || last <= 0) return { ok: false, reason: "Missing snapshot last price" };
  if (!Number.isFinite(entry) || entry <= 0) return { ok: false, reason: "Trade plan missing entry" };

  const tol = tf.includes("intra") ? 0.10 : 0.25;
  const delta = Math.abs(entry - last) / last;
  if (!Number.isFinite(delta) || delta > tol) {
    return { ok: false, reason: `Entry not anchored to snapshot price (${Math.round(delta * 100)}% away)` };
  }

  if (Number.isFinite(stop) && stop > 0 && !(stop < entry)) return { ok: false, reason: "Invalid stop (must be < entry for long)" };
  if (targets.length && !targets.every((t) => t > entry)) return { ok: false, reason: "Invalid targets (must be > entry for long)" };
  return { ok: true, reason: "OK" };
};

const fmtPctGauge = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  const s = x.toFixed(2);
  const trimmed = s.replace(/\.00$/, "").replace(/(\.[0-9])0$/, "$1");
  return `${trimmed}%`;
};

const fmtVol = (n) => {
  if (n === null || n === undefined || n === "") return "—";
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  const ax = Math.abs(x);
  if (ax >= 1_000_000_000) return `${(x / 1_000_000_000).toFixed(1)}B`;
  if (ax >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (ax >= 1_000) return `${(x / 1_000).toFixed(0)}K`;
  return String(Math.round(x));
};

function pickDecision(obj) {
  if (!obj || typeof obj !== "object") return null;
  const d = obj.decision;
  if (d && typeof d === "object") return d;
  const bp = obj.best_pick;
  if (bp && typeof bp === "object" && bp.decision && typeof bp.decision === "object") return bp.decision;
  return null;
}

function _numPos(v) {
  const n = _toNum(v);
  return n !== null && Number.isFinite(n) && n > 0 ? n : null;
}

function extractVwap(a) {
  const obj = a && typeof a === "object" ? a : null;
  if (!obj) return null;
  return (
    _numPos(obj?.price_context?.vwap) ??
    _numPos(obj?.vwap) ??
    _numPos(obj?.quote?.vwap) ??
    _numPos(obj?.snapshot?.vwap) ??
    _numPos(obj?.technicals?.vwap) ??
    _numPos(obj?.technical_analysis?.vwap)
  );
}

function extractAtr(a) {
  const obj = a && typeof a === "object" ? a : null;
  if (!obj) return null;
  return (
    _numPos(obj?.price_context?.atr) ??
    _numPos(obj?.atr) ??
    _numPos(obj?.technicals?.atr) ??
    _numPos(obj?.technicals?.atr_14) ??
    _numPos(obj?.technical_analysis?.atr) ??
    _numPos(obj?.technical_analysis?.atr_14)
  );
}

function extractIntradayResistance(a) {
  const obj = a && typeof a === "object" ? a : null;
  if (!obj) return [];
  const cand =
    obj?.price_context?.intraday_resistance ??
    obj?.price_context?.resistance ??
    obj?.intraday_resistance ??
    obj?.intradayResistance ??
    obj?.resistance ??
    obj?.levels?.resistance ??
    obj?.levels?.intraday_resistance;

  const arr = Array.isArray(cand) ? cand : cand !== null && cand !== undefined ? [cand] : [];
  return arr
    .map((x) => (typeof x === "object" && x ? (x.price ?? x.level ?? x.value ?? x.resistance) : x))
    .map((x) => _toNum(x))
    .filter((n) => n !== null && Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

function pickDirection(a) {
  const obj = a && typeof a === "object" ? a : null;
  if (!obj) return "LONG";
  const raw = String(obj?.direction ?? obj?.bias ?? obj?.trade_plan?.direction ?? obj?.decision?.direction ?? obj?.classification ?? "").toUpperCase();
  if (raw.includes("SHORT") || raw.includes("SELL") || raw.includes("BEAR")) return "SHORT";
  return "LONG";
}

function buildAnchoredTradePlan(analysisObj, currentPrice) {
  const cp = _numPos(currentPrice);
  if (cp === null) return null;

  const dir = pickDirection(analysisObj);
  const vwap = extractVwap(analysisObj);
  const atrRaw = extractAtr(analysisObj);
  const atr = atrRaw !== null ? atrRaw : cp * 0.03;
  const resist = extractIntradayResistance(analysisObj);

  const vwapDistOk = vwap !== null ? Math.abs(vwap - cp) / cp <= 0.015 : false;
  const entry = vwapDistOk ? vwap : cp;

  const stop = dir === "SHORT" ? entry + atr * 1.2 : entry - atr * 1.2;

  let targets = [];
  if (dir !== "SHORT") {
    targets = resist.filter((x) => x > entry).slice(0, 3);
    if (!targets.length) targets = [entry + atr, entry + atr * 2, entry + atr * 3];
  } else {
    targets = [entry - atr, entry - atr * 2, entry - atr * 3].filter((t) => Number.isFinite(t) && t > 0);
  }

  return {
    entry,
    stop,
    targets,
    currentPrice: cp,
    vwap: vwap ?? null,
    atr,
  };
}

function applyTradePlanPriceAnchoring(analysisObj, currentPrice) {
  const a = analysisObj && typeof analysisObj === "object" ? analysisObj : null;
  const cp = _numPos(currentPrice);
  if (!a || cp === null) return analysisObj;

  const entryNum = _toNum(a?.trade_plan?.entry ?? a?.trade_plan?.entry_price ?? a?.trade_plan?.entryPrice ?? a?.price_context?.entry ?? a?.entry ?? a?.entry_price ?? a?.entryPrice);
  if (entryNum === null || !Number.isFinite(entryNum) || entryNum <= 0) return analysisObj;

  const tooHigh = entryNum > cp * 1.4;
  const tooLow = entryNum < cp * 0.6;
  if (!tooHigh && !tooLow) {
    return {
      ...a,
      current_price: a?.current_price ?? cp,
      currentPrice: a?.currentPrice ?? cp,
      price_context: {
        ...(a?.price_context && typeof a.price_context === "object" ? a.price_context : {}),
        current_price: (a?.price_context && typeof a.price_context === "object" ? a.price_context.current_price : undefined) ?? cp,
        currentPrice: (a?.price_context && typeof a.price_context === "object" ? a.price_context.currentPrice : undefined) ?? cp,
      },
    };
  }

  const rebuilt = buildAnchoredTradePlan(a, cp);
  if (!rebuilt) return analysisObj;

  const nextTradePlan = {
    ...(a?.trade_plan && typeof a.trade_plan === "object" ? a.trade_plan : {}),
    entry: rebuilt.entry,
    entry_price: rebuilt.entry,
    stop: rebuilt.stop,
    stop_loss: rebuilt.stop,
    targets: rebuilt.targets,
  };

  const nextPriceContext = {
    ...(a?.price_context && typeof a.price_context === "object" ? a.price_context : {}),
    entry: rebuilt.entry,
    stop: rebuilt.stop,
    targets: rebuilt.targets,
    current_price: cp,
    currentPrice: cp,
    vwap: rebuilt.vwap ?? (a?.price_context && typeof a.price_context === "object" ? a.price_context.vwap : undefined),
    atr: rebuilt.atr ?? (a?.price_context && typeof a.price_context === "object" ? a.price_context.atr : undefined),
  };

  return {
    ...a,
    current_price: cp,
    currentPrice: cp,
    trade_plan: nextTradePlan,
    price_context: nextPriceContext,
  };
}

function pickMarketBadge(obj) {
  const raw = obj?.badge;
  if (typeof raw === "string" && raw.trim()) return raw;
  const state = String(obj?.market?.state || obj?.market_state || obj?.meta?.market_state || "").toUpperCase();
  if (state === "OPEN") return "REAL-TIME DATA";
  if (state) return "POST-MARKET CLOSE DATA";
  return "POST-MARKET CLOSE DATA";
}

function techBarStyle(value0to100) {
  const n = Number(value0to100);
  const v = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  if (v >= 67) return { background: "rgba(60, 200, 120, 0.45)" };
  if (v >= 34) return { background: "rgba(235, 185, 70, 0.45)" };
  return { background: "rgba(235, 90, 90, 0.45)" };
}

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function clamp100(score100) {
  const v = Number(score100);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function readScore100(v100, v10) {
  const n100 = Number(v100);
  if (Number.isFinite(n100)) return clamp100(n100 <= 10 ? n100 * 10 : n100);
  const n10 = Number(v10);
  if (Number.isFinite(n10)) return clamp100(n10 * 10);
  return null;
}

function readAiScore100(tech) {
  const t = tech && typeof tech === "object" ? tech : null;
  return readScore100(
    t?.ai_score ?? t?.aiScore,
    t?.ai_score_10 ?? t?.aiScore10
  );
}

function readExecutionScore100(tech) {
  const t = tech && typeof tech === "object" ? tech : null;
  return readScore100(
    t?.execution_score ?? t?.executionScore,
    t?.execution_score_10 ?? t?.executionScore10
  );
}

function normalize10(score10) {
  return clamp01(Number(score10) / 10);
}

function percent10(score10) {
  const v = Number(score10);
  if (!Number.isFinite(v)) return 0;
  const clamped = Math.max(0, Math.min(10, v));
  return (clamped / 10) * 100;
}

function withTimeoutMs(ms) {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => window.clearTimeout(t) };
}

function ringColor10(score10) {
  const v = Number(score10);
  if (!Number.isFinite(v)) return "rgba(255,255,255,0.30)";
  if (v <= 3) return "#ef4444";
  if (v <= 6) return "#facc15";
  return "#22c55e";
}

function ringColor100(score100) {
  const v = Number(score100);
  if (!Number.isFinite(v)) return "rgba(255,255,255,0.30)";
  if (v <= 30) return "#ef4444";
  if (v <= 60) return "#facc15";
  return "#22c55e";
}

function ScoreRingSvg({ score100, variant = "md" }) {
  const v = Number(score100);
  const safe = Number.isFinite(v) ? clamp100(v) : 0;
  const pct = safe / 100;

  // IMPORTANT: let CSS size the SVG (see .ringSvg in App.css). We draw in a 100x100 viewBox.
  // `variant` is kept for API compatibility with existing call sites.
  void variant;

  const stroke = 8;
  const r = 50 - stroke / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const gap = c - dash;

  const fg = Number.isFinite(v) ? ringColor100(safe) : "rgba(255,255,255,0.18)";
  const bg = "rgba(255,255,255,0.12)";

  return (
    <svg className="ringSvg" viewBox="0 0 100 100" aria-hidden="true">
      <g transform="rotate(-90 50 50)">
        <circle cx="50" cy="50" r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={fg}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${gap}` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </g>
    </svg>
  );
}

function extractStatusModeMessage(payload) {
  const p = payload && typeof payload === "object" ? payload : null;
  if (!p) return { status: "", mode: "", message: "" };

  const statusRaw =
    p.status ??
    p?.result?.status ??
    p?.data?.status ??
    p?.analysis?.status ??
    p?.best_pick?.status ??
    p?.pick?.status;
  const modeRaw =
    p.analysis_mode ??
    p?.result?.analysis_mode ??
    p?.data?.analysis_mode ??
    p?.analysis?.analysis_mode ??
    p?.best_pick?.analysis_mode ??
    p?.pick?.analysis_mode;

  const msgRaw =
    p.message ??
    p.detail ??
    p.reason ??
    p?.result?.message ??
    p?.data?.message ??
    p?.analysis?.message ??
    p?.best_pick?.message ??
    p?.pick?.message;

  return {
    status: String(statusRaw || "").toLowerCase(),
    mode: String(modeRaw || "").toLowerCase(),
    message: typeof msgRaw === "string" ? msgRaw : "",
  };
}

function uiModeFromMeta(meta, opts) {
  const m = meta && typeof meta === "object" ? meta : { status: "", mode: "", message: "" };
  const o = opts && typeof opts === "object" ? opts : {};
  const timedOut = Boolean(o.timedOut);
  const hasErr = Boolean(o.hasErr);

  if (timedOut) return "full_ai";
  if (m.mode === "degraded") return "full_ai";
  if (m.status && m.status !== "ok" && m.status !== "partial") return hasErr ? "unavailable" : "full_ai";
  return "full_ai";
}

function userFacingModeBadgeText(uiMode) {
  return "";
}

function clamp10(score10) {
  const v = Number(score10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, v));
}

function toScore10(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return clamp10(n * 10);
  if (n > 10) return clamp10(n / 10);
  return clamp10(n);
}

function score10FromDual(v10, v100) {
  const n100 = Number(v100);
  if (Number.isFinite(n100)) {
    // If backend provides 0..100, convert to 0..10. If it already provides 0..10, keep it.
    const as10 = n100 > 10 ? n100 / 10 : n100;
    return clamp10(as10);
  }
  return toScore10(v10);
}

function score10FromCanonical10(v10, v100Fallback) {
  const n10 = Number(v10);
  if (Number.isFinite(n10)) {
    // Canonical contract (Option B): *_score_10 is already 0..10.
    // If backend accidentally sends 0..100 here, normalize.
    return clamp10(n10 > 10 ? n10 / 10 : n10);
  }
  const n100 = Number(v100Fallback);
  if (!Number.isFinite(n100)) return null;
  return clamp10(n100 > 10 ? n100 / 10 : n100);
}

function _toScore10(v, fallback = null) {
  const out = toScore10(v);
  if (out !== null) return out;
  const fb = toScore10(fallback);
  return fb !== null ? fb : 0;
}

function pickScore10(obj) {
  const d = pickDecision(obj);
  return (
    score10FromCanonical10(
      d?.score_10 ?? d?.score10 ?? obj?.score_10 ?? obj?.score10,
      obj?.technicals?.ai_score ?? obj?.technicals?.aiScore ?? obj?.ai_score ?? obj?.aiScore ?? obj?.score
    ) ?? 0
  );
}

function pickConfidence10(obj) {
  const d = pickDecision(obj);
  return (
    score10FromCanonical10(
      d?.confidence_10 ?? d?.confidence10 ?? obj?.confidence_10 ?? obj?.confidence10,
      obj?.technicals?.execution_score ??
        obj?.technicals?.executionScore ??
        obj?.execution_score ??
        obj?.executionScore ??
        obj?.confidence
    ) ?? Math.min(7, pickScore10(obj))
  );
}

function _toPct100(v, fallback = 50) {
  const n = Number(v);
  if (!Number.isFinite(n)) return Math.max(0, Math.min(100, Number(fallback) || 50));
  // Accept 0..1, 0..10, 0..100
  if (n >= 0 && n <= 1) return Math.max(0, Math.min(100, n * 100));
  if (n > 0 && n <= 10) return Math.max(0, Math.min(100, n * 10));
  return Math.max(0, Math.min(100, n));
}

function _arrStrings(v, max = 10) {
  const a = Array.isArray(v) ? v : [];
  return a
    .map((x) => (typeof x === "string" ? x : x === null || x === undefined ? "" : String(x)))
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

function _fallbackAnalyzeSchema(symbol) {
  const s = normalizeSymbol(symbol) || "SPY";
  return {
    __fallback: true,
    symbol: s,
    score: 6,
    confidence: 6,
    classification: "WATCH",
    system_expectation: "—",
    trade_plan: {
      entry: "—",
      stop_loss: "—",
      targets: [],
      risk_reward: "—",
    },
    execution_plan: {
      day: "—",
      window: "—",
      entry_method: "—",
      buy_zone: "—",
    },
    technical_analysis: {
      momentum: 62,
      trend: 58,
      volatility: 44,
      liquidity: 60,
      risk: 50,
    },
    news_sentiment: {
      direction: "NEUTRAL",
      summary: "—",
      headlines: [],
    },
    why: [],
    what_confirms: [],
    what_breaks: [],
    when_to_recheck: "—",
  };
}

function ensureAnalyzeSchema(raw, fallbackSymbol) {
  const base = raw && typeof raw === "object" ? raw : null;
  const sym = normalizeSymbol(base?.symbol || fallbackSymbol) || "SPY";

  const isFallback = Boolean(base && typeof base === "object" && base.__fallback) || !base;

  const score = _toScore10(
    base?.score ??
      base?.ai_score ??
      base?.aiScore ??
      base?.technicals?.ai_score ??
      base?.technicals?.aiScore ??
      base?.decision?.score_10 ??
      base?.decision?.score
  );
  const confidence = _toScore10(
    base?.confidence ??
      base?.confidence_10 ??
      base?.technicals?.execution_score ??
      base?.technicals?.executionScore ??
      base?.decision?.confidence_10 ??
      base?.decision?.confidence,
    Math.min(7, score)
  );

  const classificationRaw = String(base?.classification || "WATCH").toUpperCase();
  const classification = classificationRaw.includes("BUY") ? "ACTIONABLE" : classificationRaw.includes("AVOID") || classificationRaw.includes("SELL") ? "AVOID" : "WATCH";

  const sysExp =
    typeof base?.system_expectation === "string"
      ? base.system_expectation
      : typeof base?.system_expectation?.summary === "string"
        ? base.system_expectation.summary
        : typeof base?.decision?.expectation === "string"
          ? base.decision.expectation
          : "—";

  const tp0 =
    (base?.trade_plan && typeof base.trade_plan === "object" ? base.trade_plan : null) ||
    (base?.tradePlan && typeof base.tradePlan === "object" ? base.tradePlan : null) ||
    (base?.plan && typeof base.plan === "object" ? base.plan : null) ||
    (base?.trade && typeof base.trade === "object" ? base.trade : null);

  const ep0 =
    (base?.execution_plan && typeof base.execution_plan === "object" ? base.execution_plan : null) ||
    (base?.executionPlan && typeof base.executionPlan === "object" ? base.executionPlan : null) ||
    (base?.execution && typeof base.execution === "object" ? base.execution : null) ||
    (base?.plan && typeof base.plan === "object" ? base.plan : null);

  const ta0 =
    (base?.technical_analysis && typeof base.technical_analysis === "object" ? base.technical_analysis : null) ||
    (base?.technicals && typeof base.technicals === "object" ? base.technicals : null) ||
    (base?.technical && typeof base.technical === "object" ? base.technical : null) ||
    (base?.ta && typeof base.ta === "object" ? base.ta : null);

  const ns0 =
    (base?.news_sentiment && typeof base.news_sentiment === "object" ? base.news_sentiment : null) ||
    (base?.news && typeof base.news === "object" ? base.news : null) ||
    (base?.sentiment && typeof base.sentiment === "object" ? base.sentiment : null);

  const fallback = _fallbackAnalyzeSchema(sym);

  const targets = _arrStrings(tp0?.targets ?? tp0?.target ?? tp0?.take_profit ?? tp0?.take_profits ?? tp0?.tp, 6);
  const headlines = _arrStrings(ns0?.headlines ?? ns0?.items ?? ns0?.latest ?? base?.headlines ?? base?.news?.headlines, 8);

  const whyArr = _arrStrings(
    base?.why ?? base?.decision?.why ?? base?.analysis?.why ?? base?.why_system_believes ?? base?.why_system_believes_list,
    10
  );
  const confirmsArr = _arrStrings(
    base?.confirms ?? base?.what_confirms ?? base?.decision?.confirms ?? base?.analysis?.confirms,
    10
  );
  const breaksArr = _arrStrings(
    base?.breaks ?? base?.what_breaks ?? base?.decision?.breaks ?? base?.analysis?.breaks,
    10
  );
  const recheckText =
    base?.recheck ??
    base?.when_to_check_again ??
    base?.when_to_recheck ??
    base?.when_to_recheck_again ??
    base?.when_check_again ??
    base?.check_again ??
    base?.decision?.recheck ??
    base?.analysis?.recheck;

  const tpObj = tp0 && typeof tp0 === "object" ? tp0 : null;
  const epObj = ep0 && typeof ep0 === "object" ? ep0 : null;

  return {
    ...base,
    __fallback: isFallback,
    symbol: sym,
    score,
    confidence,
    classification,
    system_expectation: String(sysExp || fallback.system_expectation),
    trade_plan: {
      ...(tpObj ? tpObj : {}),
      entry: tpObj?.entry ?? tpObj?.entry_price ?? tpObj?.entryPrice ?? tpObj?.entries?.[0] ?? tpObj?.entry_rule ?? fallback.trade_plan.entry,
      stop: tpObj?.stop ?? tpObj?.stop_loss ?? tpObj?.stopLoss ?? fallback.trade_plan.stop_loss,
      stop_loss: tpObj?.stop_loss ?? tpObj?.stop ?? tpObj?.stopLoss ?? fallback.trade_plan.stop_loss,
      targets: Array.isArray(tpObj?.targets) ? tpObj.targets : targets.length ? targets : fallback.trade_plan.targets,
      gain_pct: tpObj?.gain_pct ?? tpObj?.gainPct ?? tpObj?.expected_gain_pct ?? tpObj?.expectedGainPct,
      risk_reward: tpObj?.risk_reward ?? tpObj?.riskReward ?? tpObj?.rr ?? fallback.trade_plan.risk_reward,
    },
    execution_plan: {
      ...(epObj ? epObj : {}),
      date: epObj?.date ?? epObj?.execution_date ?? epObj?.executionDate ?? epObj?.day ?? epObj?.execute_day ?? epObj?.executeDay,
      day: epObj?.day ?? epObj?.execute_day ?? epObj?.executeDay ?? fallback.execution_plan.day,
      window: epObj?.window ?? epObj?.window_text ?? epObj?.windowText ?? fallback.execution_plan.window,
      entry_method: epObj?.entry_method ?? epObj?.entryMethod ?? epObj?.method ?? epObj?.entry,
      buy_zone: epObj?.buy_zone ?? epObj?.buyZone ?? epObj?.buy_zone_text ?? fallback.execution_plan.buy_zone,
    },
    technical_analysis: {
      momentum: _toPct100(ta0?.momentum, fallback.technical_analysis.momentum),
      trend: _toPct100(ta0?.trend, fallback.technical_analysis.trend),
      volatility: _toPct100(ta0?.volatility, fallback.technical_analysis.volatility),
      liquidity: _toPct100(ta0?.liquidity, fallback.technical_analysis.liquidity),
      risk: _toPct100(ta0?.risk, fallback.technical_analysis.risk),
    },
    news_sentiment: {
      direction: String(ns0?.direction || ns0?.bias || fallback.news_sentiment.direction).toUpperCase(),
      summary: String(ns0?.summary || ns0?.narrative || ns0?.explanation || fallback.news_sentiment.summary),
      headlines: headlines.length ? headlines : fallback.news_sentiment.headlines,
    },
    why: whyArr.length ? whyArr : fallback.why,
    what_confirms: confirmsArr.length ? confirmsArr : fallback.what_confirms,
    what_breaks: breaksArr.length ? breaksArr : fallback.what_breaks,
    when_to_recheck: String(recheckText || base?.when_to_recheck || fallback.when_to_recheck),
  };
}

function normalizeAnalysisResult(raw) {
  const base = raw && typeof raw === "object" ? raw : null;
  if (!base) return ensureAnalyzeSchema(null, "SPY");

  const unwrapped =
    (base.result && typeof base.result === "object" ? base.result : null) ||
    (base.data && typeof base.data === "object" ? base.data : null) ||
    (base.analysis && typeof base.analysis === "object" ? base.analysis : null) ||
    (base.trade_plan || base.execution_plan ? base : null) ||
    (base.best_pick && typeof base.best_pick === "object" ? base.best_pick : null) ||
    (base.pick && typeof base.pick === "object" ? base.pick : null) ||
    (base.best && typeof base.best === "object" ? base.best : null) ||
    base;

  if (!unwrapped || typeof unwrapped !== "object") return ensureAnalyzeSchema(null, "SPY");

  const score10 = pickScore10(unwrapped);
  const conf10 = pickConfidence10(unwrapped);

  return ensureAnalyzeSchema(
    {
      ...unwrapped,
      score: unwrapped?.score ?? unwrapped?.ai_score ?? unwrapped?.aiScore ?? score10,
      confidence: unwrapped?.confidence ?? unwrapped?.confidence_10 ?? conf10,
    },
    unwrapped?.symbol
  );
}

function pickClassification(obj) {
  const d = pickDecision(obj);
  const raw = d?.classification ?? obj?.classification;
  return typeof raw === "string" && raw.trim() ? String(raw).toUpperCase() : "WATCH";
}

function firstTwoStrings(v) {
  const arr = Array.isArray(v) ? v : [];
  const out = arr.filter((x) => typeof x === "string" && x.trim()).slice(0, 2);
  while (out.length < 2) out.push("—");
  return out;
}

function sentimentPillClass(direction) {
  const v = String(direction || "").toUpperCase();
  if (v.includes("BULL")) return "pill pill--good";
  if (v.includes("BEAR")) return "pill pill--bad";
  return "pill pill--warn";
}

function normalizeTargets(priceContext, profitTargets) {
  const out = [];
  const pc = priceContext && typeof priceContext === "object" ? priceContext : null;
  const pcTarget = pc && pc.target !== undefined ? pc.target : undefined;
  if (pcTarget !== undefined && pcTarget !== null && pcTarget !== "") out.push(pcTarget);
  if (Array.isArray(profitTargets)) {
    for (const t of profitTargets) {
      if (t === undefined || t === null || t === "") continue;
      out.push(t);
    }
  }
  if (!out.length) return ["—"];
  return out;
}

const fmtSignedPct = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return { text: "—", cls: "" };
  const sign = x > 0 ? "+" : x < 0 ? "-" : "";
  const abs = Math.abs(x);
  if (abs >= 999) {
    const cls = x > 0 ? "goodTxt" : x < 0 ? "badTxt" : "";
    return { text: `${sign}999%+`, cls };
  }
  const v = abs.toFixed(2);
  const cls = x > 0 ? "goodTxt" : x < 0 ? "badTxt" : "";
  return { text: `${sign}${v}%`, cls };
};

function fmtTimeRangeLocal(start, end) {
  const s = toUnixSeconds(start);
  const e = toUnixSeconds(end);
  if (!s || !e) return "—";
  const df = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  return `${df.format(new Date(s * 1000))} – ${df.format(new Date(e * 1000))}`;
}

function extractExecutionPlan(a) {
  const obj = a && typeof a === "object" ? a : null;
  if (!obj) return null;
  const plan =
    (obj.execution_plan && typeof obj.execution_plan === "object" ? obj.execution_plan : null) ||
    (obj.executionPlan && typeof obj.executionPlan === "object" ? obj.executionPlan : null) ||
    (obj.execution && typeof obj.execution === "object" ? obj.execution : null) ||
    (obj.plan && typeof obj.plan === "object" ? obj.plan : null);
  if (!plan) return null;

  const windowText = typeof plan.window === "string" && plan.window.trim() ? plan.window.trim() : null;

  return {
    date: plan.date ?? plan.execution_date ?? plan.executionDate ?? plan.day ?? plan.execute_day ?? plan.executeDay,
    windowStart: plan.window_start ?? plan.windowStart ?? plan.window ?? plan.start ?? plan.start_time ?? plan.startTime,
    windowEnd: plan.window_end ?? plan.windowEnd ?? plan.window ?? plan.end ?? plan.end_time ?? plan.endTime,
    windowText,
    entryMethod: plan.entry_method ?? plan.entryMethod ?? plan.method ?? plan.entry,
    buyZone: plan.buy_zone ?? plan.buyZone,
    confirmations: Array.isArray(plan.confirmations) ? plan.confirmations : Array.isArray(plan.confirms) ? plan.confirms : [],
  };
}

const toUnixSeconds = (t) => {
  if (t === null || t === undefined || t === "") return null;
  const n = Number(t);
  if (Number.isFinite(n)) {
    // Heuristic: milliseconds are much larger than seconds
    return n > 10_000_000_000 ? Math.floor(n / 1000) : Math.floor(n);
  }
  if (typeof t === "string") {
    const ms = Date.parse(t);
    if (Number.isFinite(ms)) return Math.floor(ms / 1000);
  }
  return null;
};

const detectMarketSession = (marketPayload) => {
  // Prefer backend truth when present, but never trust a single flag.
  const m = marketPayload && typeof marketPayload === "object" ? marketPayload : null;
  const state = String(m?.state || m?.session || m?.market_state || "").toUpperCase();
  if (state === "OPEN" || state === "CLOSED" || state === "PRE" || state === "PRE_MARKET" || state === "POST" || state === "POST_MARKET") {
    if (state === "PRE_MARKET") return "PRE";
    if (state === "POST_MARKET") return "POST";
    return state === "PRE" || state === "POST" ? state : state;
  }
  if (m?.is_open === true) return "OPEN";
  if (m?.is_open === false) return "CLOSED";

  // Fallback heuristic based on America/New_York local time.
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const wd = String(map.weekday || "").toLowerCase();
    const isWeekday = wd && !["sat", "sun"].includes(wd);
    const hh = Number(map.hour);
    const mm = Number(map.minute);
    const mins = Number.isFinite(hh) && Number.isFinite(mm) ? hh * 60 + mm : null;
    if (!isWeekday || mins === null) return "CLOSED";

    const pre = 4 * 60;
    const open = 9 * 60 + 30;
    const close = 16 * 60;
    const post = 20 * 60;

    if (mins >= open && mins < close) return "OPEN";
    if (mins >= pre && mins < open) return "PRE";
    if (mins >= close && mins < post) return "POST";
    return "CLOSED";
  } catch {
    return "UNKNOWN";
  }
};

const sessionFromClockOrHeuristic = (clock) => {
  // If backend clock is wrong/stale, never lie: use NY-time heuristic.
  const heur = detectMarketSession(null);
  const isOpen = clock?.is_open;
  if (isOpen === true) return "OPEN";
  if (isOpen === false) {
    // Prefer heuristic when it says OPEN (clock desync happens).
    if (heur === "OPEN") return "OPEN";
    return heur || "CLOSED";
  }
  return heur || "UNKNOWN";
};

/**
 * Smarter formatter for analysis fields
 * Fixes: [object Object] showing up for buy_zone, targets, etc.
 */
function fmtAnalyzeValue(v) {
  if (v === null || v === undefined || v === "") return "—";

  // numbers
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "—";

  // strings
  if (typeof v === "string") return v;

  // arrays (targets often comes as array)
  if (Array.isArray(v)) {
    if (!v.length) return "—";
    const allNums = v.every(
      (x) =>
        typeof x === "number" ||
        (typeof x === "string" && x.trim() !== "" && !Number.isNaN(Number(x)))
    );
    if (allNums) return v.map((x) => money(Number(x))).join(", ");
    return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  }

  // objects
  if (typeof v === "object") {
    // buy_zone common shapes: {low, high} or {min, max} or {lower, upper}
    const low = v.low ?? v.min ?? v.lower ?? v.bottom;
    const high = v.high ?? v.max ?? v.upper ?? v.top;

    if (low !== undefined && high !== undefined) {
      const loNum = Number(low);
      const hiNum = Number(high);
      if (Number.isFinite(loNum) && Number.isFinite(hiNum)) return `${money(loNum)} – ${money(hiNum)}`;
      return `${String(low)} – ${String(high)}`;
    }

    // targets common shapes: {targets:[...]} etc.
    if (Array.isArray(v.targets)) return fmtAnalyzeValue(v.targets);

    const keys = Object.keys(v);
    // if it’s a small object, show key: value pairs cleanly
    if (keys.length && keys.length <= 6) {
      return keys
        .map((k) => {
          const val = v[k];
          if (typeof val === "number") return `${k}: ${money(val)}`;
          if (Array.isArray(val)) return `${k}: ${fmtAnalyzeValue(val)}`;
          if (typeof val === "object" && val !== null) return `${k}: ${JSON.stringify(val)}`;
          return `${k}: ${String(val)}`;
        })
        .join(" • ");
    }

    // fallback
    try {
      return JSON.stringify(v);
    } catch {
      return "—";
    }
  }

  return String(v);
}

// ---- NEW: sizing helpers (no hardcoding; derived from analysis + user inputs) ----
function _toNum(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v.trim()) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractAnalysisPrice(a) {
  if (!a || typeof a !== "object") return null;

  const candidates = [
    a.price,
    a.last,
    a.current_price,
    a.currentPrice,
    a.entry,
    a.entry_price,
    a.entryPrice,
    a?.quote?.price,
    a?.quote?.last,
    a?.quote?.current,
    a?.snapshot?.price,
    a?.snapshot?.last,
  ];

  for (const c of candidates) {
    const n = _toNum(c);
    if (n !== null && n > 0) return n;
  }

  return null;
}

function extractBuyZoneLowHigh(a) {
  const bz = a?.buy_zone;
  if (!bz || typeof bz !== "object") return { low: null, high: null };

  const low = _toNum(bz.low ?? bz.min ?? bz.lower ?? bz.bottom);
  const high = _toNum(bz.high ?? bz.max ?? bz.upper ?? bz.top);

  return { low: low !== null && low > 0 ? low : null, high: high !== null && high > 0 ? high : null };
}

// ---------- local storage keys ----------
const LS_WATCHLIST = "AUREXIS_watchlist_v1";

// ---------- Hard render + crash safety (no hooks) ----------
class AurexisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // intentionally empty
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    let msg = "Unknown render error";
    try {
      msg = String(this.state.error?.message || this.state.error || msg);
    } catch {
      // ignore
    }

    return (
      <div className="appShell">
        <div className="layout" style={{ padding: 16 }}>
          <div className="boot" style={{ borderColor: "rgba(255,80,80,0.25)", background: "rgba(255,80,80,0.05)" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>AUREXIS Error</div>
            <div className="mutedSmall">{msg}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn--ghost" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const ONBOARDING_STEPS = [
  {
    icon: null,
    eyebrow: "WELCOME TO AUREXIS",
    title: "The edge serious traders have been waiting for.",
    body: "Aurexis is an AI-powered stock signal system built to surface one thing: the single highest-conviction trade opportunity of the day. No noise. No overload. Just signal.",
    stat: null,
  },
  {
    icon: "🎯",
    eyebrow: "DAILY AI PICK",
    title: "One pick. Every morning. Before the open.",
    body: "At 9:30 AM ET, our AI scans 1,200+ stocks across momentum, relative strength, volume structure, and market regime. It scores every setup — and only surfaces the one that clears every threshold.",
    stat: { label: "Stocks scanned nightly", value: "1,200+" },
  },
  {
    icon: "📐",
    eyebrow: "TRADE LEVELS",
    title: "Entry, stop, and target — calculated for you.",
    body: "Every pick comes with a precise entry zone, a stop-loss based on structure, and a Fibonacci-derived price target. The system calculates your risk/reward ratio automatically. You just decide if you take it.",
    stat: { label: "Signals per pick", value: "3–7" },
  },
  {
    icon: "📊",
    eyebrow: "PERFORMANCE",
    title: "Every pick is tracked publicly. Wins and losses.",
    body: "We don't cherry-pick results. Every signal is logged the moment it fires — entry price, outcome, return. You can audit the full track record anytime from the Recent Picks panel.",
    stat: { label: "Avg return on winners", value: "+6.8%" },
  },
  {
    icon: "🛡️",
    eyebrow: "NO_TRADE SIGNAL",
    title: "Some days, doing nothing is the right trade.",
    body: "When market conditions aren't favorable, Aurexis returns NO_TRADE. That's a signal too — it means the system found no setup worth the risk. Discipline is built into the algorithm.",
    stat: null,
  },
];

function OnboardingModal({ onDone, userName = "" }) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const el = document.createElement("style");
    el.id = "ob-css";
    el.textContent = `
      @keyframes ob-up {
        from { opacity: 0; transform: translateY(22px); }
        to   { opacity: 1; transform: translateY(0);    }
      }
      @keyframes ob-glow {
        0%,100% { opacity: 0.10; transform: translate(-50%,-50%) scale(1);    }
        50%      { opacity: 0.18; transform: translate(-50%,-50%) scale(1.08); }
      }
      @keyframes ob-orb2 {
        0%,100% { opacity: 0.05; }
        50%      { opacity: 0.11; }
      }
      .ob-a  { animation: ob-up 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      .ob-d1 { animation-delay: 0.00s; }
      .ob-d2 { animation-delay: 0.08s; }
      .ob-d3 { animation-delay: 0.15s; }
      .ob-d4 { animation-delay: 0.22s; }
      .ob-d5 { animation-delay: 0.30s; }
    `;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  const current = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;
  const isWelcome = step === 0;
  const displayTitle = isWelcome && userName ? `Welcome, ${userName}.` : current.title;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#050810",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: "hidden",
    }}>
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(0,180,80,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,80,0.025) 1px,transparent 1px)",
        backgroundSize: "52px 52px",
      }} />

      {/* Primary pulsing glow */}
      <div style={{
        position: "absolute", top: "38%", left: "50%",
        width: 900, height: 650, pointerEvents: "none",
        background: "radial-gradient(ellipse, rgba(0,180,80,0.13) 0%, transparent 60%)",
        animation: "ob-glow 5s ease-in-out infinite",
      }} />

      {/* Secondary glow bottom-right */}
      <div style={{
        position: "absolute", bottom: "5%", right: "10%",
        width: 500, height: 360, pointerEvents: "none",
        background: "radial-gradient(ellipse, rgba(0,100,50,0.08) 0%, transparent 65%)",
        animation: "ob-orb2 7s ease-in-out infinite",
      }} />

      {/* Top progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.05)" }}>
        <div style={{
          height: "100%",
          width: `${((step + 1) / ONBOARDING_STEPS.length) * 100}%`,
          background: "linear-gradient(90deg, #00b450, #00e676)",
          boxShadow: "0 0 10px rgba(0,200,80,0.8)",
          transition: "width 0.45s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>

      {/* Skip */}
      <button onClick={onDone} style={{
        position: "fixed", top: 20, right: 24,
        background: "none", border: "1px solid rgba(255,255,255,0.09)",
        color: "rgba(255,255,255,0.28)", fontSize: 11, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit", padding: "5px 13px",
        borderRadius: 8, letterSpacing: 0.6,
      }}>Skip</button>

      {/* Slide content — key re-mounts on each step to replay animation */}
      <div key={step} style={{ position: "relative", width: "100%", maxWidth: 600, padding: "0 40px", textAlign: "center" }}>

        {/* Icon */}
        <div className="ob-a ob-d1" style={{ marginBottom: 30 }}>
          {current.icon === null ? (
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 84, height: 84, borderRadius: 24,
              background: "linear-gradient(135deg, rgba(0,180,80,0.20), rgba(0,60,30,0.15))",
              border: "1px solid rgba(0,180,80,0.28)",
              boxShadow: "0 0 0 8px rgba(0,180,80,0.05), 0 0 60px rgba(0,180,80,0.15)",
            }}>
              <span style={{
                fontSize: 40, fontWeight: 900, letterSpacing: "-2px",
                background: "linear-gradient(135deg, #00e676, #00b450)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>A</span>
            </div>
          ) : (
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 84, height: 84, borderRadius: 24,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 0 8px rgba(255,255,255,0.02)",
              fontSize: 40,
            }}>{current.icon}</div>
          )}
        </div>

        {/* Eyebrow */}
        <div className="ob-a ob-d2" style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.22em",
          color: "#00b450", marginBottom: 16, textTransform: "uppercase",
        }}>{current.eyebrow}</div>

        {/* Title */}
        <div className="ob-a ob-d3" style={{
          fontSize: isWelcome ? 46 : 36,
          fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 18,
          ...(isWelcome
            ? { background: "linear-gradient(135deg,#ffffff 0%,rgba(255,255,255,0.70) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
            : { color: "#fff" }
          ),
        }}>{displayTitle}</div>

        {/* Body */}
        <p className="ob-a ob-d4" style={{
          fontSize: 16, color: "rgba(255,255,255,0.48)",
          lineHeight: 1.8, margin: "0 auto",
          maxWidth: 460,
        }}>{current.body}</p>

        {/* Stat */}
        {current.stat ? (
          <div className="ob-a ob-d4" style={{
            marginTop: 32, padding: "24px 36px",
            background: "linear-gradient(135deg, rgba(0,180,80,0.09), rgba(0,180,80,0.04))",
            border: "1px solid rgba(0,180,80,0.16)",
            borderRadius: 18, display: "inline-block",
            boxShadow: "0 0 40px rgba(0,180,80,0.07)",
          }}>
            <div style={{
              fontSize: 52, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1,
              background: "linear-gradient(135deg, #00e676, #00b450)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              marginBottom: 8,
            }}>{current.stat.value}</div>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.32)", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>{current.stat.label}</div>
          </div>
        ) : (
          <div style={{ height: 28 }} />
        )}

        {/* CTA + dots */}
        <div className="ob-a ob-d5" style={{ marginTop: 36 }}>
          <button
            onClick={isLast ? onDone : () => setStep(s => s + 1)}
            style={{
              width: "100%", padding: "18px 0",
              background: "linear-gradient(135deg, #00c853, #009c3b)",
              border: "none", borderRadius: 14,
              fontSize: 15, fontWeight: 700, color: "#fff",
              cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5,
              boxShadow: "0 4px 40px rgba(0,180,80,0.38), 0 1px 0 rgba(255,255,255,0.12) inset",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 52px rgba(0,180,80,0.52), 0 1px 0 rgba(255,255,255,0.12) inset"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 40px rgba(0,180,80,0.38), 0 1px 0 rgba(255,255,255,0.12) inset"; }}
          >{isLast ? "Enter Aurexis →" : "Continue →"}</button>

          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 24 }}>
            {ONBOARDING_STEPS.map((_, i) => (
              <div key={i} onClick={() => setStep(i)} style={{
                height: 4, borderRadius: 999, cursor: "pointer",
                width: i === step ? 32 : 6,
                background: i === step ? "#00b450" : i < step ? "rgba(0,180,80,0.40)" : "rgba(255,255,255,0.10)",
                transition: "width 0.3s ease, background 0.3s ease",
              }} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Plan gating ───────────────────────────────────────────────────────────────
function _parseJwt(token) {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return {}; }
}
const PLAN_RANK = { free: 0, starter: 1, pro: 2, elite: 3 };
function usePlan() {
  const read = () => {
    const tok = localStorage.getItem("aurexis_token");
    if (!tok) return "free";
    const p = _parseJwt(tok);
    const raw = String(p?.plan || p?.tier || p?.subscription || "free").toLowerCase().trim();
    return PLAN_RANK[raw] !== undefined ? raw : "free";
  };
  const [plan, setPlan] = React.useState(read);
  React.useEffect(() => {
    const sync = () => setPlan(read());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return plan;
}
function canAccess(userPlan, minPlan) {
  return (PLAN_RANK[userPlan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0);
}

const ANALYZE_FREE_LIMIT = 3;
function _analyzeUsageKey() { const d = new Date(); return `aurexis_analyze_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function getAnalyzeUsedToday() { return parseInt(localStorage.getItem(_analyzeUsageKey()) || "0", 10); }
function incrementAnalyzeUsage() { localStorage.setItem(_analyzeUsageKey(), String(getAnalyzeUsedToday() + 1)); }
function analyzeRemaining(plan) {
  if (canAccess(plan, "starter")) return Infinity;
  return Math.max(0, ANALYZE_FREE_LIMIT - getAnalyzeUsedToday());
}
function StarterFakePreview() {
  return (
    <div style={{ padding: "16px 18px", minHeight: "100%", height: "100%", background: "linear-gradient(160deg,rgba(10,13,22,0.98),rgba(13,17,30,0.98))", borderRadius: 14 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[["WIN RATE","73%","#4ade80"],["AVG RETURN","+8.4%","#4ade80"],["TOTAL PICKS","47","#fff"]].map(([lbl,val,clr]) => (
          <div key={lbl} style={{ flex: 1, padding: "12px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 5, letterSpacing: "0.05em" }}>{lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: clr }}>{val}</div>
          </div>
        ))}
      </div>
      {[["NVDA","LONG","+12.4%","Hit T1"],["AAPL","LONG","+6.2%","Hit T1"],["TSLA","LONG","+18.7%","Hit T2"],["META","LONG","+9.1%","Pending"]].map(([sym,dir,ret,st]) => (
        <div key={sym} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 9, marginBottom: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "rgba(0,180,80,0.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#4ade80" }}>{sym.slice(0,2)}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{sym}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{dir}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>{ret}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{st}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProFakePreview() {
  const rows = [
    { sym: "NVDA", price: "$875.20", rsi: 72, mom: "High", signal: "BUY" },
    { sym: "AAPL", price: "$192.45", rsi: 58, mom: "Med",  signal: "WATCH" },
    { sym: "TSLA", price: "$248.30", rsi: 65, mom: "High", signal: "BUY" },
    { sym: "MSFT", price: "$415.80", rsi: 61, mom: "Med",  signal: "HOLD" },
    { sym: "AMD",  price: "$162.40", rsi: 70, mom: "High", signal: "BUY" },
    { sym: "GOOGL",price: "$171.90", rsi: 55, mom: "Low",  signal: "HOLD" },
  ];
  return (
    <div style={{ padding: "16px 18px", minHeight: "100%", height: "100%", background: "linear-gradient(160deg,rgba(10,13,22,0.98),rgba(13,17,30,0.98))", borderRadius: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 12, letterSpacing: "0.06em" }}>SCREENER RESULTS · 21 matches</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 44px 50px 52px", gap: "0 8px", padding: "0 4px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 6 }}>
        {["SYMBOL","PRICE","RSI","MOM","SIGNAL"].map(h => (
          <div key={h} style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 700, letterSpacing: "0.06em", textAlign: h === "SYMBOL" ? "left" : "right" }}>{h}</div>
        ))}
      </div>
      {rows.map(({ sym, price, rsi, mom, signal }) => (
        <div key={sym} style={{ display: "grid", gridTemplateColumns: "1fr 70px 44px 50px 52px", gap: "0 8px", padding: "9px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{sym}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textAlign: "right" }}>{price}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: rsi > 65 ? "#4ade80" : "rgba(255,255,255,0.5)", textAlign: "right" }}>{rsi}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "right" }}>{mom}</div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: signal === "BUY" ? "#4ade80" : signal === "HOLD" ? "rgba(255,255,255,0.35)" : "rgba(251,191,36,0.7)" }}>{signal}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EliteFakePreview() {
  return (
    <div style={{ padding: "16px 18px", minHeight: "100%", height: "100%", background: "linear-gradient(160deg,rgba(10,13,22,0.98),rgba(13,17,30,0.98))", borderRadius: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 12, letterSpacing: "0.06em" }}>OPTIONS FLOW · UNUSUAL ACTIVITY</div>
      {[
        { sym: "NVDA", type: "CALL", strike: "$900C", exp: "Jun 21", size: "$2.4M", sentiment: "Bullish" },
        { sym: "SPY",  type: "PUT",  strike: "$520P", exp: "Jun 14", size: "$1.8M", sentiment: "Bearish" },
        { sym: "TSLA", type: "CALL", strike: "$260C", exp: "Jun 28", size: "$890K", sentiment: "Bullish" },
        { sym: "AAPL", type: "CALL", strike: "$200C", exp: "Jul 18", size: "$1.2M", sentiment: "Bullish" },
      ].map(({ sym, type, strike, exp, size, sentiment }) => (
        <div key={sym+strike} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 9, marginBottom: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ padding: "3px 8px", borderRadius: 6, background: type === "CALL" ? "rgba(0,180,80,0.15)" : "rgba(248,113,113,0.15)", fontSize: 10, fontWeight: 800, color: type === "CALL" ? "#4ade80" : "#f87171" }}>{type}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{sym} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{strike}</span></div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Exp {exp}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{size}</div>
            <div style={{ fontSize: 10, color: type === "CALL" ? "#4ade80" : "#f87171" }}>{sentiment}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanGate({ requires, userPlan, children, setTab, feature }) {
  if (canAccess(userPlan, requires)) return children;

  const featureOverrides = {
    watchlist: {
      headline: "Monitor your best setups",
      features: [
        "AI-curated watchlist candidates updated every scan",
        "Edge scores & signal breakdown per stock",
        "Track high-conviction setups before they trigger",
      ],
    },
    tradejournal: {
      headline: "Track every trade you make",
      features: [
        "Log entries, stops, and targets manually",
        "Automatic P&L calculation on every trade",
        "Build a record of your real trading decisions",
      ],
    },
  };

  const tierCfg = {
    starter: {
      label: "Starter", price: "$9",
      accentRgb: "0,180,80", accent: "#4ade80",
      headline: "See the full trade plan every day",
      features: [
        "Entry price, stop loss & profit targets",
        "Edge signal breakdown for every pick",
        "Full picks history with outcomes",
      ],
    },
    pro: {
      label: "Pro", price: "$29",
      accentRgb: "96,165,250", accent: "#60a5fa",
      headline: "Screen & track like a pro",
      features: [
        "Live screener across 1,200+ stocks",
        "Portfolio tracker with P&L analytics",
        "Advanced filtering & custom signals",
      ],
    },
    elite: {
      label: "Elite", price: "$99",
      accentRgb: "167,139,250", accent: "#a78bfa",
      headline: "Institutional-grade intelligence",
      features: [
        "Real-time unusual options flow",
        "Insider buying & institutional activity",
        "Elite signals & dark pool data",
      ],
    },
  };

  const base = tierCfg[requires];
  const override = featureOverrides[feature] || {};
  const cfg = { ...base, ...override };

  const fakePreview = requires === "pro" ? <ProFakePreview /> : requires === "elite" ? <EliteFakePreview /> : <StarterFakePreview />;
  const btnGrad = {
    starter: "linear-gradient(135deg,#00c853,#15803d)",
    pro:     "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    elite:   "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  }[requires];

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", minHeight: "calc(100vh - 110px)" }}>
      {/* Content visible at top, fading + blurring toward bottom */}
      <div style={{
        filter: "blur(4px)",
        pointerEvents: "none", userSelect: "none",
        minHeight: "calc(100vh - 110px)",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 25%, transparent 72%)",
        maskImage: "linear-gradient(to bottom, black 0%, black 25%, transparent 72%)",
      }}>{fakePreview}</div>

      {/* Gradient darkening layer */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(7,9,15,0) 15%, rgba(7,9,15,0.50) 45%, rgba(7,9,15,0.98) 72%)",
      }} />

      {/* Floating upgrade card */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 20px 24px",
      }}>
        <div style={{
          width: "100%", maxWidth: 400,
          background: "rgba(12,16,28,0.72)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: "20px 22px 18px",
          backdropFilter: "blur(20px)",
          boxShadow: `0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(${cfg.accentRgb},0.06)`,
        }}>
          {/* Plan badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: `rgba(${cfg.accentRgb},0.10)`,
              border: `1px solid rgba(${cfg.accentRgb},0.22)`,
              borderRadius: 20, padding: "3px 11px",
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: cfg.accent, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {cfg.label} · {cfg.price}/mo
              </span>
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", letterSpacing: "0.02em" }}>Cancel anytime</span>
          </div>

          {/* Headline */}
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.02em", lineHeight: 1.3 }}>
            {cfg.headline}
          </div>

          {/* Feature bullets */}
          <div style={{ marginBottom: 16 }}>
            {cfg.features.map(f => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                <span style={{ color: cfg.accent, fontSize: 12, lineHeight: "18px", flexShrink: 0, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", lineHeight: "18px" }}>{f}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button onClick={() => setTab("pricing")} style={{
            width: "100%", padding: "11px 0", borderRadius: 10, cursor: "pointer",
            background: btnGrad, color: "#fff", border: "none",
            fontSize: 13, fontWeight: 700, letterSpacing: "0.01em",
            boxShadow: `0 0 22px rgba(${cfg.accentRgb},0.25)`,
            transition: "opacity 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Upgrade to {cfg.label} →
          </button>
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const NAV = useMemo(
    () => ({
      main: [
        { key: "dashboard", label: "Dashboard", icon: "⬡" },
        { key: "movers", label: "Movers", icon: "⇅" },
        { key: "screener", label: "Screener", icon: "⊞" },
      ],
      trading: [
        { key: "watchlist", label: "Watchlist", icon: "◎" },
        { key: "tradejournal", label: "Trade Journal", icon: "▤" },
      ],
      account: [
        { key: "settings", label: "Settings", icon: "⚙" },
        { key: "support", label: "Support", icon: "◌" },
      ],
    }),
    []
  );
  const NAV_ALL = useMemo(() => [...NAV.main, ...NAV.trading, ...NAV.account], [NAV]);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("aurexis_darkMode") !== "false");

  // Capture ?token= from OAuth redirect (Google/Apple callback lands here)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("token");
    const isNewOAuth = params.get("new_user") === "1";
    if (oauthToken) {
      localStorage.setItem("aurexis_token", oauthToken);
      if (isNewOAuth) localStorage.setItem("aurexis_force_onboarding", "1");
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }

    // After Stripe checkout success — refresh JWT so plan updates immediately
    if (params.get("payment") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      const tok = localStorage.getItem("aurexis_token");
      if (tok) {
        // Give the webhook up to 4s to process before refreshing
        setTimeout(() => {
          fetch(`${API}/auth/refresh-token`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.access_token) {
                localStorage.setItem("aurexis_token", data.access_token);
                window.dispatchEvent(new Event("storage"));
              }
              return fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${data?.access_token || tok}` } });
            })
            .then(r => r && r.ok ? r.json() : null)
            .then(me => { if (me?.id) setUserProfile(me); })
            .catch(() => {});
        }, 4000);
        showToast("Payment received! Your plan is being activated…");
      }
    }
  }, []);

  // Determine onboarding visibility based on per-user key from /auth/me
  React.useEffect(() => {
    const token = localStorage.getItem("aurexis_token");
    if (!token) return;
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(me => {
        if (!me?.id) return;
        setUserProfile(me);
        const key = `aurexis_onboarding_done_${me.id}`;
        const forceFlag = localStorage.getItem("aurexis_force_onboarding");
        if (!localStorage.getItem(key) || forceFlag === "1") {
          localStorage.removeItem("aurexis_force_onboarding");
          const name = me.first_name || localStorage.getItem("aurexis_user_first_name") || "";
          setOnboardingUserName(name);
          setShowOnboarding(true);
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    document.documentElement.style.setProperty("--accent-rgb", "0, 180, 80");
    localStorage.setItem("aurexis_darkMode", String(darkMode));
  }, [darkMode]);

  // Theme color palette — use these in inline styles so they flip with dark/light mode
  const T = React.useMemo(() => darkMode ? {
    // Text
    text:       "rgba(255,255,255,0.92)",
    textSec:    "rgba(255,255,255,0.75)",
    textMuted:  "rgba(255,255,255,0.55)",
    textFaint:  "rgba(255,255,255,0.38)",
    textGhost:  "rgba(255,255,255,0.25)",
    textHint:   "rgba(255,255,255,0.18)",
    // Borders
    border:     "rgba(255,255,255,0.06)",
    border2:    "rgba(255,255,255,0.10)",
    borderStrong: "rgba(255,255,255,0.14)",
    // Backgrounds / surfaces
    bg:         "rgba(255,255,255,0.02)",
    bg2:        "rgba(255,255,255,0.04)",
    bg3:        "rgba(255,255,255,0.025)",
    surface:    "rgba(10,12,16,0.82)",
    surfaceCard:"rgba(10,13,22,0.98)",
    surfaceDeep:"rgba(0,0,0,0.18)",
    overlay:    "rgba(0,0,0,0.60)",
    inputBg:    "rgba(0,0,0,0.18)",
  } : {
    // Text
    text:       "#0a0d1a",
    textSec:    "rgba(10,13,26,0.72)",
    textMuted:  "rgba(10,13,26,0.52)",
    textFaint:  "rgba(10,13,26,0.40)",
    textGhost:  "rgba(10,13,26,0.28)",
    textHint:   "rgba(10,13,26,0.18)",
    // Borders
    border:     "rgba(0,0,0,0.08)",
    border2:    "rgba(0,0,0,0.12)",
    borderStrong: "rgba(0,0,0,0.16)",
    // Backgrounds / surfaces
    bg:         "rgba(255,255,255,0.70)",
    bg2:        "rgba(0,0,0,0.025)",
    bg3:        "rgba(0,0,0,0.04)",
    surface:    "#f0f2f6",
    surfaceCard:"#ffffff",
    surfaceDeep:"rgba(0,0,0,0.05)",
    overlay:    "rgba(0,0,0,0.35)",
    inputBg:    "rgba(0,0,0,0.04)",
  }, [darkMode]);

  const [tab, setTab] = useState("dashboard");
  const userPlan = usePlan();

  const _freePickMonthKey = () => { const d = new Date(); return `aurexis_free_pick_${d.getFullYear()}_M${d.getMonth() + 1}`; };
  const [freePickUsed, setFreePickUsed] = React.useState(() => localStorage.getItem(_freePickMonthKey()) === "used");
  const [freePickLoading, setFreePickLoading] = React.useState(false);
  const _useFreePick = async () => {
    setFreePickLoading(true);
    try {
      const tok = localStorage.getItem("aurexis_token");
      const res = await fetch(`${API_BASE}/best_pick_v2/unlock`, {
        method: "POST",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      });
      if (res.status === 403) {
        // Already used this month server-side
        localStorage.setItem(_freePickMonthKey(), "used");
        setFreePickUsed(true);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const payload = data && typeof data === "object" ? data : null;
      const next =
        (payload?.data && typeof payload.data === "object" ? payload.data : null) ||
        (payload?.result && typeof payload.result === "object" ? payload.result : null) ||
        payload;
      setBestPickData(next);
      localStorage.setItem(_freePickMonthKey(), "used");
      setFreePickUsed(true);
    } catch (e) {
      // silent — user sees the gate still
    } finally {
      setFreePickLoading(false);
    }
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Hey! I'm your StackIQ AI analyst. I can see your live picks, win rates, and scanner signals. Ask me anything." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatMessagesRef = useRef(null);
  const chatInputRef = useRef(null);
  const cmdInputRef = useRef(null);

  const [symbol, setSymbol] = useState("NVDA");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("");
  const [lastAnalyzeClickAt, setLastAnalyzeClickAt] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [showLegalModal, setShowLegalModal] = useState(false);

  const [apiOnline, setApiOnline] = useState(false);
  const debugEnabled = (() => {
    try {
      // Only allow debug mode in local development to prevent information disclosure in production.
      const isDev = import.meta.env.DEV === true;
      return isDev && String(window?.location?.search || "").includes("debug=1");
    } catch {
      return false;
    }
  })();
  const [debugInfo, setDebugInfo] = useState({
    apiStatus: "",
    lastRequest: null,
    lastError: "",
    lastPayloadKeys: [],
    lastPayloadShape: null,
  });

  // Data
  const [health, setHealth] = useState(null);
  const [clock, setClock] = useState(null);
  const [account, setAccount] = useState(null);
  const [movers, setMovers] = useState([]);
  const [news, setNews] = useState([]); // kept (unused) to avoid touching extra logic

  const [analyzeData, setAnalyzeData] = useState(null);
  const [analyzeIsLowConviction, setAnalyzeIsLowConviction] = useState(false);
  const [analysisBySymbol, setAnalysisBySymbol] = useState({});
  const [bestPickLog, setBestPickLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aurexis_best_pick_log") || "[]"); } catch { return []; }
  });
  const [bestPickData, setBestPickData] = useState(null);
  const [bestPickDailyLimit, setBestPickDailyLimit] = useState(false);
  const [analyzeSymbol, setAnalyzeSymbol] = useState("");

  const [portfolioLive, setPortfolioLive] = useState(null);
  const [portfolioPriceMapLive, setPortfolioPriceMapLive] = useState({});
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [errPortfolio, setErrPortfolio] = useState("");

  const [watchlistLive, setWatchlistLive] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [errWatchlist, setErrWatchlist] = useState("");
  const [watchlistInput, setWatchlistInput] = useState("");

  const [addingWatchlist, setAddingWatchlist] = useState(false);

  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzeModalSymbol, setAnalyzeModalSymbol] = useState("");

  const [showPaperTradeModal, setShowPaperTradeModal] = useState(false);
  const [paperTradeModalData, setPaperTradeModalData] = useState(null);
  const [paperTradeExecuting, setPaperTradeExecuting] = useState(false);

  const [lastAnalyzedSymbol, setLastAnalyzedSymbol] = useState("");

  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [errPerformance, setErrPerformance] = useState("");

  const [recentPicksData, setRecentPicksData] = useState([]);
  const [loadingRecentPicks, setLoadingRecentPicks] = useState(false);
  const [errRecentPicks, setErrRecentPicks] = useState("");

  useEffect(() => {
    // Symbol input changes should not wipe analysis state.
    // Analyze state is explicitly updated via runAnalyze().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    if (!debugEnabled) return;
    try {
      window.__AUREXIS_DEBUG_HOOK__ = (info) => {
        setDebugInfo((prev) => ({
          ...(prev && typeof prev === "object" ? prev : {}),
          lastRequest: info,
          lastPayloadKeys: Array.isArray(info?.payloadKeys) ? info.payloadKeys : [],
          lastPayloadShape: info?.payloadShape && typeof info.payloadShape === "object" ? info.payloadShape : null,
        }));
      };
    } catch {
      // ignore
    }
    return () => {
      try {
        if (window.__AUREXIS_DEBUG_HOOK__) window.__AUREXIS_DEBUG_HOOK__ = null;
      } catch {
        // ignore
      }
    };
  }, [debugEnabled]);

  const runDiagnostics = async () => {
    const endpoints = [
      "/health",
      "/best_pick_v2?max_scan=1200&allow_llm_news=false",
      "/analyze/NVDA?budget=1000&risk=medium&timeframe=swing",
      "/portfolio",
      "/watchlist",
    ];
    for (const ep of endpoints) {
      try {
        const data = await apiGet(ep);
        const { rootKeys: keys, shape } = summarizePayloadShape(data);
        setDebugInfo((prev) => ({
          ...(prev && typeof prev === "object" ? prev : {}),
          apiStatus: prev?.apiStatus || (ep === "/health" ? "online" : ""),
          lastError: "",
          lastPayloadKeys: keys,
          lastPayloadShape: shape,
        }));
      } catch (e) {
        const msg = friendlyError(e, "diagnostics") || String(e?.message || e || "Diagnostics failed");
        setDebugInfo((prev) => ({
          ...(prev && typeof prev === "object" ? prev : {}),
          lastError: `${ep}: ${msg}`,
        }));
        try {
          // eslint-disable-next-line no-console
          console.error("DIAG_ERROR", ep, e);
        } catch {
          // ignore
        }
      }
    }
  };


  useEffect(() => {
    if (!debugEnabled) return;
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugEnabled]);

  const [loadingBestPick, setLoadingBestPick] = useState(true);
  const [errBestPick, setErrBestPick] = useState("");
  const [bestPickTimedOut, setBestPickTimedOut] = useState(false);

  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingClock, setLoadingClock] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingMovers, setLoadingMovers] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false); // kept
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingUserName, setOnboardingUserName] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);

  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [analyzeMode, setAnalyzeMode] = useState("");
  const [analyzeMessage, setAnalyzeMessage] = useState("");

  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [savedPortfolioMap, setSavedPortfolioMap] = useState({});
  const [savePortfolioErr, setSavePortfolioErr] = useState("");

  const [errHealth, setErrHealth] = useState("");
  const [errClock, setErrClock] = useState("");
  const [errAccount, setErrAccount] = useState("");
  const [errMovers, setErrMovers] = useState("");
  const [errNews, setErrNews] = useState(""); // kept
  const [errAnalyze, setErrAnalyze] = useState("");

  const marketDataFailure = Boolean(health && health.ok === false);
  const analyzeFailure = Boolean(errAnalyze);
  const moversFailure = Boolean(errMovers);

  const analyzeReqIdRef = useRef(0);

  const analyzeAbortRef = useRef(null);

  const lastValidAnalysisRef = useRef(null);

  const lastValidMoversRef = useRef([]);
  const lastValidPerformanceRef = useRef(null);
  const lastValidRecentPicksRef = useRef([]);

  // cmd-bar validation message (display-only, no layout change)
  const [cmdErr, setCmdErr] = useState("");

  // watchlist state (persisted)
  const [watchlist, setWatchlist] = useState([]);

  // ---- screener state (lifted here so it survives Screener remounts) ----
  const DEFAULT_SCREENER_SYMBOLS = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "META", "GOOGL", "MRVL", "PYPL", "HOOD"];
  const screenerInputRef = useRef(null);
  const [screenerResults, setScreenerResults] = useState([]);
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerHasRun, setScreenerHasRun] = useState(false);
  const [screenerSortCol, setScreenerSortCol] = useState("aiScore");
  const [screenerSortDir, setScreenerSortDir] = useState("desc");
  const screenerRunningRef = useRef(false);

  // ---- trade journal state (lifted to survive TradeJournal remounts) ----
  const [journalTrades, setJournalTradesRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aurexis_journal_v1") || "[]"); } catch { return []; }
  });
  const saveJournalTrades = (updated) => {
    try { localStorage.setItem("aurexis_journal_v1", JSON.stringify(updated)); } catch {}
    setJournalTradesRaw(updated);
  };
  // journalAddOpen lives here so it survives TradeJournal remounts caused by App re-renders.
  // Form field values are kept in a ref (no state) so typing never triggers re-renders.
  const [journalAddOpen, setJournalAddOpen] = useState(false);
  const journalAddDataRef = useRef({ symbol: "", entry: "", stop: "", target: "", notes: "" });
  const [journalCloseId, setJournalCloseId] = useState(null);
  const [journalClosePrice, setJournalClosePrice] = useState("");
  const [journalCloseErr, setJournalCloseErr] = useState("");

  // ---- trade type + sizing state (no hardcoded position sizes) ----
  const [tradeType, setTradeType] = useState("shares"); // UI default only
  const [sizeBudget, setSizeBudget] = useState("");
  const [sizeRiskPct, setSizeRiskPct] = useState("");
  const [sizeEntryOverride, setSizeEntryOverride] = useState("");
  const [sizeStopOverride, setSizeStopOverride] = useState("");

  // Options basic (no chain / no pricing API; user inputs only)
  const [optContractPrice, setOptContractPrice] = useState("");
  const [optContracts, setOptContracts] = useState("");

  // ✅ NEW: local paper portfolio price map (minimal; prevents Save pick crash)
  const [priceMap, setPriceMap] = useState({});

  // ✅ NEW: create the portfolio engine instance once (used by Save pick)
  const portfolio = useAurexisPortfolio(priceMap);

  const showToast = (msg, type) => {
    setToast(msg);
    setToastType(type || "");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => { setToast(""); setToastType(""); }, 3500);
  };

  const buildChatReply = React.useCallback((msg) => {
    const q = msg.toLowerCase().trim();
    const has = (...kws) => kws.some(k => q.includes(k));

    // ── live data helpers ─────────────────────────────────────────────────
    const bestPayload = bestPickData && typeof bestPickData === "object" ? bestPickData : null;
    const best = (bestPayload?.pick && typeof bestPayload.pick === "object" ? bestPayload.pick : null)
      || (bestPayload?.best_pick && typeof bestPayload.best_pick === "object" ? bestPayload.best_pick : null)
      || bestPayload;
    const bestSym = normalizeSymbol(best?.symbol || best?.ticker || "");
    const isNoTrade = best?.is_trade === false || bestPayload?.is_trade === false
      || ["NO_TRADE","MISSED_ENTRY","LOW_CONVICTION"].includes(String(best?.trade_decision || bestPayload?.trade_decision || "").toUpperCase());
    const tp = best?.trade_plan && typeof best.trade_plan === "object" ? best.trade_plan : null;
    const toScore = (v) => { const n = Number(v); return Number.isFinite(n) ? (n <= 10 ? Math.round(n * 10) : Math.round(n)) : null; };
    const ai100 = toScore(best?.ai_score_0_10 ?? best?.ai_score);
    const exec100 = toScore(best?.execution_score_0_10 ?? best?.execution_score);
    const conf100 = toScore(best?.confidence_0_10 ?? best?.confidence);
    const regime = String(best?.market_regime || bestPayload?.market_regime || "").trim().toUpperCase();
    const edgeSignals = Array.isArray(best?.edge_signals) ? best.edge_signals : Array.isArray(bestPayload?.edge_signals) ? bestPayload.edge_signals : [];
    const perfData = typeof performanceData === "object" && performanceData ? performanceData : null;
    const winRate = perfData?.win_rate != null ? Number(perfData.win_rate) : null;
    const totalPicks = Number(perfData?.total_picks ?? perfData?.totalPicks ?? 0) || 0;
    const avgReturn = perfData?.avg_return != null ? Number(perfData.avg_return) : null;
    const topMovers5 = Array.isArray(movers) ? movers.slice(0, 5).map(m => `${m.symbol} (${Number(m.pct_change) >= 0 ? "+" : ""}${Number(m.pct_change).toFixed(1)}%)`).join(", ") : null;
    const recentSyms = Array.isArray(recentPicksData) ? [...new Set(recentPicksData.slice(0, 6).map(p => normalizeSymbol(p?.symbol || p?.ticker || "")).filter(Boolean))] : [];

    // ── SPECIFIC FEATURE EXPLANATIONS (checked before generic) ───────────

    // Best Pick / Hero Card
    if (has("best pick card", "hero card", "best pick card", "pick card") ||
        (has("best pick") && has("explain", "what is", "tell me", "how does", "what does", "describe", "works", "work", "show", "mean")) ||
        (has("best pick") && !has("what is the best pick", "today") && has("card", "section", "panel", "dashboard"))) {
      return "The Best Pick card is the main attraction on the dashboard — it shows the AI scanner's single highest-conviction trade for the day. It displays the ticker symbol, AI score (0–100), execution score, confidence level, entry price, stop loss, and price targets. The color (green = high conviction, yellow = moderate, red = no trade) tells you the system's overall confidence. If the card shows NO_TRADE, it means no setup cleared the quality gates today — that's intentional risk management, not a bug.";
    }

    // Performance Card
    if (has("performance card", "performance panel", "performance section") ||
        (has("performance") && has("explain", "what is", "tell me", "how does", "what does", "describe", "card"))) {
      return "The Performance card tracks every pick the AI has made. It shows your all-time win rate (% of resolved picks that hit their target before stop), total pick count, and average return per trade. The three stats — Win Rate, Picks, and Avg Return — update as picks resolve. Green means the trade hit target, red means it hit stop. This is your live track record, not simulated or backtested data.";
    }

    // Recent Picks Card
    if (has("recent picks card", "recent picks panel") ||
        (has("recent picks") && has("explain", "what is", "tell me", "how does", "card"))) {
      return "The Recent Picks card lists the AI's last decisions — each row shows the ticker, date, the signal tags that triggered the pick (like BREAKOUT_STRUCTURE, RS_LEADER, SQUEEZE_POTENTIAL), and the outcome (pending or resolved return). Click any row to pull up the full analysis for that symbol. This is how you track what the system has been doing and verify its reasoning.";
    }

    // Analysis / AnalysisCard
    if (has("analysis card", "analysis panel", "analyze card", "why this trade", "ai summary", "advanced metrics") ||
        (has("analysis") && has("explain", "what is", "tell me", "how does", "what does", "card", "section"))) {
      return "The Analysis panel appears on the dashboard after you run an analysis on a ticker. It has three tabs: Why This Trade (the AI's full reasoning — setup thesis, what confirms it, what breaks it), AI Summary (news sentiment, catalysts, risk flags), and Advanced Metrics (technical indicators — momentum, RSI, volume strength, trend). Use it to go deeper on any symbol, not just the daily pick.";
    }

    // Screener
    if (has("screener") && has("explain", "what is", "tell me", "how does", "how do", "what does", "describe", "work", "use", "using")) {
      return "The Screener lets you analyze multiple tickers at once. Type a comma-separated list of symbols (e.g. AAPL, NVDA, TSLA) and click Screen. The AI runs its full signal model on each one and returns a ranked table with scores, momentum indicators, signal tags, and trade setups. Use it when you have a shortlist of candidates and want to see which one the system likes best.";
    }

    // Watchlist
    if (has("watchlist") && has("explain", "what is", "tell me", "how does", "how do", "what does", "describe", "work", "use", "using")) {
      return "The Watchlist is the system's list of tickers that almost made the cut — setups the scanner detected as interesting but not yet high-conviction enough to trade. These are stocks building momentum that are worth monitoring. The scanner updates this daily. When a watchlist candidate crosses the conviction threshold on a future scan, it may become the daily pick.";
    }

    // Trade Journal
    if (has("trade journal", "journal") && has("explain", "what is", "tell me", "how does", "how do", "what does", "describe", "work", "use")) {
      return "The Trade Journal is where you manually log your own trades to track performance. Click '+ Add Trade Manually', fill in the symbol, entry, exit, and date. The journal calculates your P&L and builds a record of your actual trading decisions — separate from the AI's picks. Use it to see whether you're executing the AI's recommendations correctly or deviating.";
    }

    // Top Movers
    if ((has("top mover", "movers tab", "movers page", "movers card", "movers section") ||
         (has("mover") && has("explain", "what is", "tell me", "how does", "card", "tab"))) &&
        !has("what's moving", "what is moving", "today")) {
      return "The Top Movers tab shows the day's biggest percentage gainers and losers — updated from live market data. Click any row to instantly analyze that ticker. The columns show symbol, last price, % change, and volume. It's useful for finding momentum plays that the scanner might not have ranked yet, or for understanding what's driving market activity on a given day.";
    }

    // Sidebar / Navigation
    if (has("sidebar", "navigation", "nav", "left panel", "menu") && has("explain", "what is", "tell me", "how does", "how do")) {
      return "The left sidebar is your main navigation. The icons (top to bottom) are: Dashboard (home), Top Movers, Screener, Watchlist, Trade Journal, Settings, and Support. Click the arrow at the top to collapse it to icons-only mode for more screen space. The bottom shows your account avatar. The collapse state is saved, so it persists between sessions.";
    }

    // Settings
    if (has("settings") && has("explain", "what is", "tell me", "how does", "what can", "how do")) {
      return "Settings lets you configure the app's appearance and account preferences. The Display section has a Dark/Light mode toggle and compact card view option. Notifications shows alert preferences (active on the Power plan). Data & Privacy explains how data is stored (local device only, anonymous usage analytics). You can also manage your account from here.";
    }

    // Analyze / Command bar
    if ((has("analyze", "analysis") && has("how do", "how does", "how to", "what does", "command bar", "top bar", "search bar")) ||
        (has("command bar", "top bar", "analyze button") && has("explain", "what is", "tell me", "how"))) {
      return "The command bar at the top lets you analyze any stock ticker. Type a symbol (e.g. NVDA) and click Analyze or press Enter. The AI runs its full signal model on that ticker — checking momentum, technical structure, news sentiment, and market context — and populates the Analysis panel on the dashboard with the full breakdown. The analysis takes 10–30 seconds.";
    }

    // AI score / scores
    if (has("ai score", "execution score", "confidence score", "score mean", "score work", "what is a score", "scores mean", "score out of")) {
      return "There are three scores, each out of 100: AI Score measures the overall quality of the setup (technical pattern strength, momentum alignment, historical similarity). Execution Score measures how clean the entry conditions are right now — timing precision, buy zone clarity, volume confirmation. Confidence Score reflects how certain the model is about the prediction given current market data. All three need to be high (70+) for a HIGH CONVICTION rating.";
    }

    // Edge signals / signal tags
    if ((has("edge signal", "signal tag", "signal mean", "what are signal", "what do signal", "tag mean", "breakout", "rs_leader", "squeeze", "momentum_expansion", "float_rotation", "quiet_accumulation")) &&
        has("explain", "what is", "what are", "what does", "mean", "tell me", "how")) {
      return "Edge signals are the specific patterns the scanner detected for a setup. Common ones: BREAKOUT_STRUCTURE (price breaking above a key level with volume), RS_LEADER (outperforming the broader market — relative strength), SQUEEZE_POTENTIAL (price coiling in a tight range before a move), QUIET_ACCUMULATION (unusual buying volume without price spike — institutional accumulation), MOMENTUM_EXPANSION (accelerating price and volume), FLOAT_ROTATION (small float stock with heavy volume relative to shares available). Multiple signals together = higher conviction.";
    }

    // Market regime
    if ((has("market regime") || (has("regime") && has("explain", "what is", "tell me", "mean", "how"))) && !has("what is the market regime")) {
      return "Market regime is the AI's classification of the current macro environment: BULL means the broader market has momentum and risk-on setups have an edge, BEAR means defensive positioning is preferred and the system tightens its conviction thresholds, NEUTRAL/TRANSITIONAL means mixed signals. The regime affects how many picks the scanner surfaces and how aggressive the position sizing recommendations are. It's recalculated daily.";
    }

    // Trade plan / levels
    if ((has("trade plan") || has("stop loss", "stop-loss") || (has("entry") && has("what is", "explain", "how")) || (has("target") && has("what is", "explain", "how"))) &&
        has("explain", "what is", "tell me", "mean", "how does", "how do")) {
      return "A trade plan has three components: Entry — the price zone to buy in (usually near current price or at a breakout level), Stop Loss — the price where you exit if wrong (limits your downside), and Targets (T1, T2, T3) — the price levels to take profit. The distance from entry to stop vs entry to target gives you the Risk/Reward ratio. Aurexis only takes setups with R/R of at least 2:1, meaning the potential gain is at least twice the potential loss.";
    }

    // Risk/reward
    if (has("risk reward", "risk/reward", "r/r", "rr ratio") && has("explain", "what is", "tell me", "mean", "how")) {
      return "Risk/Reward ratio (R/R) compares how much you stand to gain vs lose on a trade. A 2:1 R/R means if your stop is $1 away from entry, your target is $2 away. Aurexis filters out setups with R/R below 2:1 — only trades with favorable risk profiles make the cut. The AI score and R/R together determine position sizing recommendations.";
    }

    // No trade / wait mode
    if ((has("no trade", "no pick", "wait mode", "wait state", "no setup", "low conviction") && has("explain", "what", "why", "mean")) ||
        (has("why") && has("no trade", "no pick", "waiting", "wait"))) {
      return "When the system shows NO_TRADE or LOW_CONVICTION, it means no setup cleared all quality gates that day. This is intentional — the AI has specific thresholds for AI score (70+), confidence (65+), and execution timing. It would rather miss a trade than take a low-quality one. Historically, being selective improves win rate significantly. Check back the next morning after the scanner runs.";
    }

    // Scanner / how scanner works
    if ((has("scanner") && has("explain", "what is", "tell me", "how does", "how do", "how it work", "what does")) ||
        has("how does the ai", "how does the scan", "how does aurexis pick", "how does the system")) {
      return "The scanner runs every morning before market open (9:30 AM ET). It pulls data on thousands of stocks, applies technical pattern recognition, checks relative strength vs the market, analyzes volume profiles, reads recent news sentiment, and scores each setup. The top-scoring setup — if it clears all conviction thresholds — becomes the daily pick. If nothing clears, the system waits. The entire process is automated and produces one high-quality pick per day.";
    }

    // Position sizing
    if (has("position size", "how much", "how many shares", "how big") && has("buy", "trade", "invest", "put", "position")) {
      return "Position sizing in Aurexis is based on your budget (set in the Analyze command bar) and the trade's stop distance. The formula: position size = budget × risk% ÷ (entry - stop). By default it risks 1–2% of your budget per trade. You can see the estimated share count in the Best Pick card. Never risk more than you can afford to lose on a single trade.";
    }

    // ── LIVE DATA QUERIES ─────────────────────────────────────────────────

    // Today's pick
    if (has("top pick", "best pick", "what should i buy", "what to buy", "today's pick", "todays pick", "what pick", "recommend", "suggestion") ||
        (has("what") && has("pick", "buying", "trade today", "trade now"))) {
      if (!bestPayload) return "The scanner hasn't loaded yet — refresh the page or click Refresh on the Best Pick card.";
      if (isNoTrade) return `No high-conviction trade today.${regime ? ` Market regime: ${regime}.` : ""} The system is in wait mode — setups didn't clear quality thresholds. Check back tomorrow morning after the 9:30 AM scan.`;
      if (!bestSym) return "No pick data available right now. Try refreshing the Best Pick card on the dashboard.";
      let r = `Today's top pick is ${bestSym}`;
      if (ai100 !== null) r += ` — AI score ${ai100}/100`;
      if (conf100 !== null) r += `, confidence ${conf100}/100`;
      if (exec100 !== null) r += `, execution ${exec100}/100`;
      if (tp?.entry) r += `. Entry near $${Number(tp.entry).toFixed(2)}`;
      if (tp?.stop) r += `, stop $${Number(tp.stop).toFixed(2)}`;
      const tgts = Array.isArray(tp?.targets) ? tp.targets.map(Number).filter(n => Number.isFinite(n) && n > 0) : [];
      if (tgts[0]) r += `, T1 $${tgts[0].toFixed(2)}`;
      r += ".";
      if (edgeSignals.length) r += ` Signals: ${edgeSignals.slice(0, 3).join(", ")}.`;
      return r;
    }

    // Win rate / performance query
    if (has("win rate", "accuracy", "track record", "results", "how good", "how well") ||
        (has("performance") && !has("performance card", "performance section")) ||
        has("how are you doing", "how have you done")) {
      if (winRate === null && totalPicks === 0) return "Performance data hasn't loaded yet. It should appear in the Performance card on the dashboard — try refreshing.";
      let r = winRate !== null ? `Win rate: ${winRate.toFixed(1)}%` : "";
      if (totalPicks > 0) r += ` across ${totalPicks} picks`;
      if (avgReturn !== null) r += `, avg return ${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(1)}% per trade`;
      return r || "No performance data loaded yet.";
    }

    // Market regime query
    if (has("what is the market regime", "what's the market regime") ||
        (has("market regime") && !has("explain", "what is market regime")) ||
        has("market today", "market right now", "how is the market", "market condition")) {
      if (!regime) return topMovers5 ? `No explicit regime signal right now. Top movers: ${topMovers5}.` : "No market regime data loaded yet.";
      const desc = regime === "BULL" ? "bullish — momentum setups have edge" : regime === "BEAR" ? "bearish — defensive positioning preferred" : `${regime.toLowerCase()} — mixed signals`;
      return `Market regime: ${regime} (${desc}).${topMovers5 ? ` Top movers: ${topMovers5}.` : ""}`;
    }

    // Edge signals query (for current pick)
    if ((has("signal", "edge signal") && !has("explain", "what are signal", "what is signal", "what do signal")) ||
        has("what signals", "any signal")) {
      if (!edgeSignals.length) return bestSym ? `No specific edge signals listed for ${bestSym} right now.` : "No signal data loaded yet — check the Best Pick card.";
      return `Edge signals for ${bestSym || "today's pick"}: ${edgeSignals.join(", ")}. These are the pattern combinations that triggered the AI's conviction.`;
    }

    // Recent picks query
    if (has("recent pick", "past pick", "previous pick", "last pick", "what did you pick", "history of picks")) {
      if (!recentSyms.length) return "No recent picks loaded yet. The Recent Picks card on the dashboard should show them.";
      return `Recent picks: ${recentSyms.join(", ")}. Full details with signal tags and returns are on the Recent Picks card on the dashboard.`;
    }

    // Entry/stop/target for current pick
    if (has("entry", "stop", "stop loss", "target", "price level", "trade level") && !has("explain", "what is", "how")) {
      if (!bestSym) return "No active pick loaded — refresh the Best Pick card first.";
      if (!tp) return `No trade plan data for ${bestSym} right now.`;
      let r = `${bestSym}: entry $${Number(tp.entry).toFixed(2)}, stop $${Number(tp.stop).toFixed(2)}`;
      const tgts = Array.isArray(tp.targets) ? tp.targets.map(Number).filter(n => Number.isFinite(n) && n > 0) : [];
      tgts.slice(0, 3).forEach((t, i) => { r += `, T${i+1} $${t.toFixed(2)}`; });
      if (tp.risk_reward) r += `. R/R: ${Number(tp.risk_reward).toFixed(1)}x`;
      return r + ".";
    }

    // Movers query
    if ((has("mover", "what's moving", "what is moving", "biggest mover", "top gainer") && !has("explain", "what is the top mover", "what are movers")) ||
        has("gainer today", "gainers today", "loser today", "losers today")) {
      if (!topMovers5) return "Movers data hasn't loaded yet — check the Top Movers card on the dashboard.";
      return `Today's top movers: ${topMovers5}. Click any row in the Top Movers card to run a full analysis.`;
    }

    // ── GENERAL / GREETING ────────────────────────────────────────────────

    if (has("hello", "hi there", "hey there", "good morning", "good afternoon") || q === "hi" || q === "hey" || q === "sup" || q === "yo") {
      return `Hey! I have live data loaded.${bestSym && !isNoTrade ? ` Today's pick: ${bestSym}${ai100 !== null ? ` (AI ${ai100}/100)` : ""}.` : " No active pick today."}${winRate !== null ? ` Win rate: ${winRate.toFixed(1)}%.` : ""} Ask me anything about the app, picks, or trading concepts.`;
    }

    if (has("thank", "nice", "perfect", "great job", "good job", "awesome", "love it")) {
      return "Anytime. Ask me about picks, signals, performance, or how any part of the app works.";
    }

    if (has("what can you", "what do you know", "what can i ask", "help", "capabilities", "what are you")) {
      return "I can tell you: today's top pick with full trade plan, win rate and performance stats, market regime and top movers, edge signals and what they mean, how to use any feature (Best Pick card, Screener, Watchlist, Trade Journal, Analyze command), trading concepts (stop loss, R/R, position sizing, market regime), or anything else about how Aurexis works. Just ask naturally.";
    }

    // ── GENERAL APP OVERVIEW (only if question is truly general) ─────────
    if (has("how does this app work", "how does aurexis work", "how does stackiq work", "what is aurexis", "what is stackiq", "what is this app", "overview", "introduce yourself")) {
      return "Aurexis is an AI stock signal platform. The scanner runs every morning, ranks thousands of setups, and surfaces the single highest-conviction trade for the day. On the dashboard you'll see the Best Pick card (today's top idea), Performance (win rate and track record), Recent Picks (past decisions), and an Analysis panel for deep-diving any ticker. Use the top command bar to analyze any stock, the Screener to compare a list, and the Watchlist to monitor candidates. Ask me anything — I have live context on all of it.";
    }

    if (has("explain") || has("how does") || has("how do i") || has("how to") || has("what is") || has("what are") || has("tell me about") || has("describe")) {
      // Extract what they're asking about
      const topic = q.replace(/^(can you |please |just |)?(explain|describe|tell me about|what is|what are|how does|how do|how to|how do i)\s*/i, "").trim();
      if (topic.length > 2) {
        return `I don't have a specific entry for "${topic}" yet — but I know the app's main features: Best Pick card, Performance, Screener, Watchlist, Trade Journal, Analysis panel, edge signals, market regime, trade plans, and AI scores. Try asking about one of those specifically and I'll give you a full breakdown.`;
      }
    }

    return `I didn't quite catch that. I can answer questions about today's pick, trade levels, win rate, market regime, edge signals, recent picks, top movers, or how any feature of the app works. What would you like to know?`;
  }, [bestPickData, performanceData, movers, recentPicksData]);

  // Auto-log real AI best picks into Personal Best Pick Log
  React.useEffect(() => {
    if (!bestPickData) return;
    const payload = typeof bestPickData === "object" ? bestPickData : null;
    if (!payload) return;
    const pick = (payload.pick && typeof payload.pick === "object" ? payload.pick : null)
      || (payload.best_pick && typeof payload.best_pick === "object" ? payload.best_pick : null)
      || payload;
    const sym = String(pick?.symbol || pick?.ticker || "").toUpperCase().trim();
    const dec = String(pick?.trade_decision || payload?.trade_decision || "").toUpperCase();
    if (!sym || (dec !== "HIGH_CONVICTION" && dec !== "LOW_CONVICTION")) return;
    // Mirror the same field paths used in HeroCard
    const toScore100 = (v) => { const n = Number(v); if (!Number.isFinite(n)) return null; return Math.max(0, Math.min(100, n <= 10 ? n * 10 : n)); };
    const tp = (pick?.trade_plan && typeof pick.trade_plan === "object" ? pick.trade_plan : null)
      || (payload?.trade_plan && typeof payload.trade_plan === "object" ? payload.trade_plan : null);
    const entryVal = tp?.entry ?? pick?.entry ?? null;
    const stopVal  = tp?.stop  ?? pick?.stop  ?? null;
    const tgts     = Array.isArray(tp?.targets) ? tp.targets : [];
    const targetVal = tgts[0] ?? tp?.target_1 ?? pick?.target_1 ?? null;
    const scoreVal  = toScore100(pick?.ai_score_0_10 ?? pick?.ai_score ?? payload?.ai_score_0_10);
    setBestPickLog(prev => {
      const list = Array.isArray(prev) ? prev : [];
      const existing = list[0];
      const existingHasData = existing?.entry != null || existing?.stop != null || existing?.score != null;
      if (existing?.symbol === sym && existing?.decision === dec && existingHasData) return prev;
      const logEntry = {
        symbol: sym,
        decision: dec,
        entry: entryVal != null ? Number(entryVal) : null,
        stop: stopVal != null ? Number(stopVal) : null,
        target: targetVal != null ? Number(targetVal) : null,
        score: scoreVal,
        ts: Date.now(),
      };
      const next = [logEntry, ...list.filter(x => x.symbol !== sym)].slice(0, 20);
      try { localStorage.setItem("aurexis_best_pick_log", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [bestPickData]);

  const sendChatMessage = React.useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const userMsg = { role: "user", content: msg };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput("");
    setChatLoading(true);
    setTimeout(() => { if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight; }, 30);
    // short delay to feel natural
    await new Promise(r => setTimeout(r, 420 + Math.random() * 300));
    const reply = buildChatReply(msg);
    setChatHistory(h => [...h, { role: "assistant", content: reply }]);
    setChatLoading(false);
    setTimeout(() => { if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight; }, 30);
  }, [chatInput, chatHistory, chatLoading, buildChatReply]);

  const lastLiveDataToastRef = useRef(0);
  const lastSuccessfulDataFetchAtRef = useRef(0);
  const showLiveDataToast = () => {
    const now = Date.now();
    if (!lastSuccessfulDataFetchAtRef.current) return;
    if (now - lastSuccessfulDataFetchAtRef.current <= 60000) return;
    if (now - lastLiveDataToastRef.current < 2500) return;
    lastLiveDataToastRef.current = now;
    showToast("Live data temporarily unavailable.");
  };

  const markDataFetchSuccess = () => {
    lastSuccessfulDataFetchAtRef.current = Date.now();
  };

  const safeLoad = async (fn) => {
    try {
      if (typeof fn !== "function") return;
      await fn();
    } catch (e) {
      // never crash the UI on loader failure
      try {
        console.error("Loader failed:", e);
      } catch {
        // ignore
      }
    }
  };

  // Sync local watchlist state from live backend array
  const syncLocalWatchlistFromLive = (liveSymbols) => {
    const syms = Array.isArray(liveSymbols) ? liveSymbols : [];
    setWatchlist(syms);
  };

  // ✅ NEW: add to backend watchlist
  const addToWatchlistLive = async (sym) => {
    const s = normalizeSymbol(sym);
    if (!s) {
      showToast("Missing symbol");
      return;
    }

    if (Array.isArray(watchlistLive) && watchlistLive.includes(s)) {
      showToast("Already in Watchlist");
      return;
    }

    setAddingWatchlist(true);
    setErrWatchlist("");
    try {
      await apiPostFirstAvailable([
        "/watchlist/add",
        "/watchlist",
      ], { symbol: s });
      markDataFetchSuccess();
      showToast("Added to watchlist");
      setWatchlistLive((prev) => {
        const next = Array.from(new Set([s, ...(Array.isArray(prev) ? prev : [])]));
        syncLocalWatchlistFromLive(next);
        return next;
      });
      await loadWatchlistLive();
    } catch (e) {
      const raw = String(e?.message || "").toLowerCase();
      const timedOut = e?.code === "TIMEOUT" || raw.includes("timeout") || raw.includes("timed out");
      if (timedOut) {
        try {
          const latest = await safeApiCall(() => apiGetWatchlist(), { context: "watchlist_after_timeout" });
          const shaped = latest && typeof latest === "object" ? latest : null;
          const items = Array.isArray(shaped?.items)
            ? shaped.items
            : Array.isArray(shaped?.tickers)
              ? shaped.tickers
              : Array.isArray(shaped?.watchlist)
                ? shaped.watchlist
                : Array.isArray(shaped?.symbols)
                  ? shaped.symbols
                  : Array.isArray(shaped?.data)
                    ? shaped.data
                    : Array.isArray(latest)
                      ? latest
                      : [];
          const deduped = Array.from(
            new Set(
              (Array.isArray(items) ? items : [])
                .map((it) => normalizeSymbol(typeof it === "string" ? it : it?.symbol ?? it?.ticker))
                .filter(Boolean)
            )
          );
          setWatchlistLive(deduped);
          syncLocalWatchlistFromLive(deduped);
          if (deduped.includes(s)) {
            setErrWatchlist("");
            showToast("Added to watchlist");
            return;
          }
        } catch {
          // ignore reconciliation failure
        }
      }
      console.error("Watchlist add failed:", e);
      setErrWatchlist("Failed to add — try again");
      showToast("Failed to add — try again");
    } finally {
      setAddingWatchlist(false);
    }
  };

  // ✅ NEW: remove from backend watchlist
  const removeFromWatchlistLive = async (sym) => {
    const s = normalizeSymbol(sym);
    if (!s) return;
    try {
      await safeApiCall(() => apiRemoveWatchlist(s), { onToast: showLiveDataToast, context: "watchlist_remove" });
      showToast("Removed");
      loadWatchlistLive();
    } catch (e) {
      showToast(friendlyError(e, "watchlist") || "Could not remove");
    }
  };

  const savePickToPortfolioLive = async ({ symbol: sym, source, analysisSnapshot } = {}) => {
    const s = normalizeSymbol(sym);
    if (!s) return;

    if (analysisSnapshot && typeof analysisSnapshot === "object" && analysisSnapshot.__fallback) {
      showToast("Trade plan unavailable — cannot save right now.");
      return;
    }

    const src = source || "best_pick";
    const saveKey = `${s}:${src}`;
    if (savedPortfolioMap?.[saveKey]) return;

    setSavingPortfolio(true);
    setSavePortfolioErr("");
    try {
      const planNums = extractPlanNumbers(analysisSnapshot);
      const payload = {
        symbol: s,
        entry_price: planNums.entry,
        stop_price: planNums.stop,
        quantity: 1,
      };

      await apiPostFirstAvailable([
        "/portfolio/positions",
        "/portfolio/add",
        "/portfolio",
      ], payload);
      markDataFetchSuccess();

      setSavedPortfolioMap((prev) => ({ ...(prev && typeof prev === "object" ? prev : {}), [saveKey]: true }));
      showToast("Added to portfolio");
      // Optimistically insert into recent picks so it appears immediately
      setRecentPicksData((prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        const alreadyIn = existing.some((p) => normalizeSymbol(p?.symbol || p?.ticker || "") === s);
        if (alreadyIn) return existing;
        const newPick = {
          symbol: s,
          status: "pending",
          outcome: "pending",
          recorded_at: new Date().toISOString(),
          entry_price: planNums.entry,
        };
        return [newPick, ...existing].slice(0, 20);
      });
      await loadPortfolioLive();
      await loadAccount();
      safeLoad(loadRecentPicks);
      safeLoad(loadPerformance);
    } catch (e) {
      const raw = String(e?.message || "").toLowerCase();
      const timedOut = e?.code === "TIMEOUT" || raw.includes("timeout") || raw.includes("timed out");
      if (timedOut) {
        try {
          const latest = await safeApiCall(() => apiGetPortfolio(), { context: "portfolio_after_timeout" });
          const shaped = latest && typeof latest === "object" ? latest : null;
          const items = Array.isArray(shaped?.items)
            ? shaped.items
            : Array.isArray(shaped?.positions)
              ? shaped.positions
              : Array.isArray(shaped?.data)
                ? shaped.data
                : [];
          const hasSaved = (Array.isArray(items) ? items : []).some((it) => normalizeSymbol(it?.symbol || it?.ticker) === s);
          if (hasSaved) {
            await loadPortfolioLive();
            await loadAccount();
            safeLoad(loadRecentPicks);
            safeLoad(loadPerformance);
            setSavePortfolioErr("");
            showToast("Added to portfolio");
            return;
          }
        } catch {
          // ignore reconciliation failure
        }
      }
      const msg = friendlyError(e, "portfolio") || String(e?.message || "Failed to add to portfolio");
      setSavePortfolioErr(msg);
      showToast(msg);
    } finally {
      setSavingPortfolio(false);
    }
  };

  // ---- API checks ----
  async function loadHealth() {
  setLoadingHealth(true);
  setErrHealth("");
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (res.status >= 500) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    setHealth(data);
    setApiOnline(res.status === 200);
    markDataFetchSuccess();
    if (debugEnabled) {
      setDebugInfo((prev) => ({
        ...(prev && typeof prev === "object" ? prev : {}),
        apiStatus: res.status === 200 ? "online" : "offline",
      }));
    }
  } catch (e) {
    setHealth(null);
    setApiOnline(false);
    setErrHealth(friendlyError(e, "health"));
    if (debugEnabled) {
      setDebugInfo((prev) => ({
        ...(prev && typeof prev === "object" ? prev : {}),
        apiStatus: "offline",
        lastError: friendlyError(e, "health") || String(e?.message || e || "Health failed"),
      }));
    }
  } finally {
    setLoadingHealth(false);
  }
}

async function loadClock() {
  setLoadingClock(true);
  setErrClock("");
  try {
    // Prefer market_state endpoint (clock route may not exist).
    let data = null;
    try {
      data = await safeApiCall(() => apiGetMarketState(), { onToast: showLiveDataToast, context: "market_state" });
    } catch (e1) {
      const msg = friendlyError(e1, "clock");
      const is404 = e1?.status === 404 || String(e1?.message || "").toLowerCase().includes("http 404") || String(msg || "").toLowerCase().includes("not found");
      if (!is404) throw e1;
      data = await safeApiCall(() => apiGet("/clock"), { onToast: showLiveDataToast, context: "clock" });
    }

    const m = data && typeof data === "object" ? data : {};
    const session = String(m?.market_status || m?.marketStatus || m?.market_state || m?.marketState || m?.state || m?.session || "").toUpperCase();
    const normalized = {
      ...m,
      // Keys used by sessionFromClockOrHeuristic / detectMarketSession
      session,
      state: session || m?.state,
      market_state: session || m?.market_state,
      next_open: m?.next_open ?? m?.nextOpen,
      next_close: m?.next_close ?? m?.nextClose,
      ts: m?.ts ?? m?.timestamp ?? new Date().toISOString(),
    };
    setClock(normalized);
    markDataFetchSuccess();
  } catch (e) {
    setClock(null);
    const msg = friendlyError(e, "clock");
    const is404 = e?.status === 404 || String(e?.message || "").toLowerCase().includes("http 404") || String(msg || "").toLowerCase().includes("not found");
    setErrClock(is404 ? "Backend route /clock not found (404)." : msg);
  } finally {
    setLoadingClock(false);
  }
}

async function loadAccount() {
  setLoadingAccount(true);
  setErrAccount("");
  try {
    try {
      const data = await safeApiCall(() => apiGetAccount(), { onToast: showLiveDataToast, context: "account" });
      setAccount(data);
      markDataFetchSuccess();
    } catch (e1) {
      try {
        const p = await safeApiCall(() => apiGetPortfolio(), { onToast: showLiveDataToast, context: "account_from_portfolio" });
        // Map /portfolio -> /account shape
        setAccount({
          cash: p?.cash,
          account_value: p?.account_value,
        });
        markDataFetchSuccess();
      } catch (e2) {
        setAccount(null);
        setErrAccount(friendlyError(e1, "account"));
      }
    }
  } finally {
    setLoadingAccount(false);
  }
}

async function loadMovers() {
  setLoadingMovers(true);
  setErrMovers("");
  try {
    const data = await fetchWithRetry(
      () => safeApiCall(() => apiGet("/top-movers?limit=50&min_price=1.00&min_volume=10000"), { context: "movers" }),
      2
    );
    const rawMovers = Array.isArray(data?.movers) ? data.movers : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    const normalized = rawMovers.map((m) => ({
      symbol: m?.symbol,
      price: m?.price ?? m?.last ?? 0,
      change: m?.change ?? 0,
      pct_change: m?.pct_change ?? m?.change_percent ?? 0,
      volume: m?.volume,
      data_status: m?.data_status ?? m?.dataStatus,
    }));
    setMovers(normalized);
    markDataFetchSuccess();
    lastValidMoversRef.current = normalized;
    if (!normalized.length) {
      setErrMovers("Unable to load movers");
    }
  } catch (e) {
    const fallback = Array.isArray(lastValidMoversRef.current) ? lastValidMoversRef.current : [];
    setMovers(fallback);
  } finally {
    setLoadingMovers(false);
  }
}

async function loadBestPick() {
  setLoadingBestPick(true);
  setErrBestPick("");
  setBestPickTimedOut(false);
  try {
    const path = "/best_pick_v2?allow_llm_news=false";
    const candidateUrls = Array.from(new Set([
      API_BASE ? `${API_BASE}${path}` : path,
    ]));

    let data = null;
    let lastErr = null;
    for (const url of candidateUrls) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // ignore
        }
      }, 90000);
      try {
        const _tok = localStorage.getItem("aurexis_token");
        const res = await fetch(url, {
          signal: controller.signal,
          headers: _tok ? { Authorization: `Bearer ${_tok}` } : {},
        });
        if (res.status === 403 || res.status === 401) {
          // Free user — gate is server-side now. Silently leave bestPickData null.
          setLoadingBestPick(false);
          return;
        }
        if (res.status === 429) {
          const body = await res.json().catch(() => ({}));
          if (body?.detail === "daily_limit_reached") {
            setBestPickDailyLimit(true);
            setLoadingBestPick(false);
            return;
          }
          throw new Error("HTTP 429");
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        data = await res.json();
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    if (lastErr && data == null) {
      throw lastErr;
    }

    const payload = data && typeof data === "object" ? data : null;
    const next =
      (payload?.data && typeof payload.data === "object" ? payload.data : null) ||
      (payload?.result && typeof payload.result === "object" ? payload.result : null) ||
      (payload?.payload && typeof payload.payload === "object" ? payload.payload : null) ||
      payload;

    // Block known garbage/test symbols that the backend occasionally emits
    const BLOCKED_BEST_PICK_SYMS = new Set(["APPL", "ZVZ", "ZVZZT", "TEST", "FAKE", "DUMMY", "XXXX"]);
    const _pickedSym = normalizeSymbol(
      next?.symbol || next?.ticker ||
      next?.pick?.symbol || next?.pick?.ticker ||
      next?.best_pick?.symbol || next?.best_pick?.ticker || ""
    );
    const _finalNext = (_pickedSym && BLOCKED_BEST_PICK_SYMS.has(_pickedSym))
      ? { ...next, is_trade: false, trade_decision: "NO_TRADE", no_trade_reason: "No valid pick available" }
      : next;
    setBestPickData(_finalNext);

    // Log directly here where we have the raw API data — no state timing issues
    (() => {
      const _p = _finalNext;
      const _pick = (_p?.pick && typeof _p.pick === "object" ? _p.pick : null)
        || (_p?.best_pick && typeof _p.best_pick === "object" ? _p.best_pick : null)
        || _p;
      const _sym = String(_pick?.symbol || _pick?.ticker || "").toUpperCase().trim();
      const _dec = String(_pick?.trade_decision || _p?.trade_decision || "").toUpperCase();
      if (!_sym || (_dec !== "HIGH_CONVICTION" && _dec !== "LOW_CONVICTION")) return;
      const _toS100 = (v) => { const n = Number(v); if (!Number.isFinite(n)) return null; return Math.max(0, Math.min(100, n <= 10 ? n * 10 : n)); };
      const _tp = (_pick?.trade_plan && typeof _pick.trade_plan === "object" && Object.keys(_pick.trade_plan).length > 0 ? _pick.trade_plan : null)
        || (_p?.trade_plan && typeof _p.trade_plan === "object" && Object.keys(_p.trade_plan).length > 0 ? _p.trade_plan : null);
      const _entry  = _tp?.entry  ?? _pick?.entry  ?? _p?.entry  ?? null;
      const _stop   = _tp?.stop   ?? _pick?.stop   ?? _p?.stop   ?? null;
      const _tgts   = Array.isArray(_tp?.targets) ? _tp.targets : [];
      const _target = _tgts[0] ?? _tp?.target_1 ?? _pick?.target_1 ?? _p?.target_1 ?? null;
      const _score  = _toS100(_pick?.ai_score_0_10 ?? _p?.ai_score_0_10 ?? _pick?.final_score_0_10 ?? _p?.final_score_0_10);
      setBestPickLog(prev => {
        const list = Array.isArray(prev) ? prev : [];
        const existing = list[0];
        const existingHasData = existing?.entry != null || existing?.stop != null || existing?.score != null;
        if (existing?.symbol === _sym && existing?.decision === _dec && existingHasData) return prev;
        const logEntry = {
          symbol: _sym, decision: _dec,
          entry:  _entry  != null ? Number(_entry)  : null,
          stop:   _stop   != null ? Number(_stop)   : null,
          target: _target != null ? Number(_target) : null,
          score:  _score,
          ts: Date.now(),
        };
        const nextList = [logEntry, ...list.filter(x => x.symbol !== _sym)].slice(0, 20);
        try { localStorage.setItem("aurexis_best_pick_log", JSON.stringify(nextList)); } catch {}
        return nextList;
      });
    })();

    setErrBestPick("");
    markDataFetchSuccess();
  } catch (e) {
    console.error("Best pick load failed", e);
    const raw = String(e?.message || "").toLowerCase();
    const timedOut = String(e?.name || "").toLowerCase().includes("abort") || raw.includes("timeout") || raw.includes("timed out");
    if (timedOut) {
      setBestPickTimedOut(true);
      setErrBestPick("Scanner timed out — click Refresh to retry");
    } else {
      setErrBestPick(friendlyError(e, "best_pick") || "Unable to load best pick");
    }
  } finally {
    setLoadingBestPick(false);
  }
}

useEffect(() => {
  if (!loadingBestPick) return;
  const t = window.setTimeout(() => {
    setBestPickTimedOut(true);
    setErrBestPick("Scanner timed out — click Refresh to retry");
    setLoadingBestPick(false);
  }, 90000);
  return () => window.clearTimeout(t);
}, [loadingBestPick]);

async function loadPortfolioLive() {
  setLoadingPortfolio(true);
  setErrPortfolio("");
  try {
    const data = await fetchWithRetry(
      () => safeApiCall(() => apiGetPortfolio(), { onToast: showLiveDataToast, context: "portfolio" }),
      2
    );
    const shaped = data && typeof data === "object" ? data : null;
    if (!shaped) {
      setPortfolioLive(null);
      setErrPortfolio("Invalid portfolio payload");
      return;
    }

    const items = Array.isArray(shaped?.items) ? shaped.items : [];
    setPortfolioLive({ ok: true, items });
    markDataFetchSuccess();
  } catch (e) {
    setPortfolioLive(null);
    setErrPortfolio(friendlyError(e, "portfolio") || "Could not load portfolio");
  } finally {
    setLoadingPortfolio(false);
  }
}

async function loadWatchlistLive() {
  setLoadingWatchlist(true);
  setErrWatchlist("");
  try {
    const data = await safeApiCall(() => apiGetWatchlist(), { onToast: showLiveDataToast, context: "watchlist" });
    const shaped = data && typeof data === "object" ? data : null;
    const items = Array.isArray(shaped?.items)
      ? shaped.items
      : Array.isArray(shaped?.tickers)
        ? shaped.tickers
        : Array.isArray(shaped?.watchlist)
          ? shaped.watchlist
          : Array.isArray(shaped?.symbols)
            ? shaped.symbols
            : Array.isArray(shaped?.data)
              ? shaped.data
              : Array.isArray(shaped?.data?.items)
                ? shaped.data.items
                : Array.isArray(shaped?.data?.tickers)
                  ? shaped.data.tickers
                  : Array.isArray(shaped?.data?.watchlist)
                    ? shaped.data.watchlist
                    : Array.isArray(data)
                      ? data
                      : [];
    const deduped = Array.from(
      new Set(
        (Array.isArray(items) ? items : [])
          .map((it) => normalizeSymbol(typeof it === "string" ? it : it?.symbol ?? it?.ticker))
          .filter(Boolean)
      )
    );
    setWatchlistLive(deduped);
    syncLocalWatchlistFromLive(deduped);
    markDataFetchSuccess();
  } catch (e) {
    // Fallback to persisted local watchlist if backend is down
    setWatchlistLive(Array.isArray(watchlist) ? watchlist : []);
    setErrWatchlist(friendlyError(e, "watchlist") || "Could not load watchlist");
  } finally {
    setLoadingWatchlist(false);
  }
}

  async function loadPerformance() {
    setLoadingPerformance(true);
    setErrPerformance("");
    try {
      const data = await fetchWithRetry(
        () => safeApiCall(() => apiGet("/performance"), { context: "performance" }),
        2
      );
      const perf = data && typeof data === "object" ? data : null;
      if (perf) {
        setPerformanceData(perf);
        lastValidPerformanceRef.current = perf;
        markDataFetchSuccess();
      } else {
        const fallback = lastValidPerformanceRef.current;
        if (fallback) setPerformanceData(fallback);
      }
    } catch (e) {
      const fallback = lastValidPerformanceRef.current;
      if (fallback) setPerformanceData(fallback);
      else setErrPerformance("Data unavailable — retrying…");
    } finally {
      setLoadingPerformance(false);
    }
  }

  async function loadRecentPicks() {
    setLoadingRecentPicks(true);
    setErrRecentPicks("");
    try {
      const data = await fetchWithRetry(
        () => safeApiCall(() => apiGet("/performance/picks"), { context: "recent_picks" }),
        2
      );
      const picks = Array.isArray(data?.picks) ? data.picks
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data) ? data
        : [];
      if (picks.length > 0) {
        const sliced = picks.slice(0, 20);
        setRecentPicksData(sliced);
        lastValidRecentPicksRef.current = sliced;
        markDataFetchSuccess();
      } else {
        const fallback = lastValidRecentPicksRef.current;
        if (fallback?.length) setRecentPicksData(fallback);
      }
    } catch (e) {
      const fallback = lastValidRecentPicksRef.current;
      if (fallback?.length) setRecentPicksData(fallback);
      else setErrRecentPicks("Data unavailable — retrying…");
    } finally {
      setLoadingRecentPicks(false);
    }
  }

  async function loadNews(rawSym) {
    setLoadingNews(true);
    setErrNews("");
    try {
      const v = validateCmdSymbol(rawSym ?? symbol);

      let data;
      if (v.ok) {
        try {
          data = await safeApiCall(
            () => apiGet(`/news?symbol=${encodeURIComponent(v.cleaned)}`),
            { onToast: showLiveDataToast, context: "news_symbol" }
          );
        } catch {
          data = await safeApiCall(() => apiGet("/news"), { onToast: showLiveDataToast, context: "news" });
        }
      } else {
        data = await safeApiCall(() => apiGet("/news"), { onToast: showLiveDataToast, context: "news" });
      }

      setNews(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      markDataFetchSuccess();
    } catch (e) {
      setNews([]);
      setErrNews(friendlyError(e, "news"));
    } finally {
      setLoadingNews(false);
    }
  }

  function mapAnalysisResponse(data) {
    if (!data || typeof data !== "object") return null;
    const tp = data.trade_plan || {};
    const ep = data.execution_plan || {};
    const tech = data.technicals?.technical_analysis || data.technical_analysis || {};
    const sentimentRaw = data.news_sentiment || {};
    const thesis = data.trade_thesis || {};
    const human = data.human_explanation || {};
    const targets = Array.isArray(tp.targets) ? tp.targets : [];
    const bp = data.best_pick && typeof data.best_pick === "object" ? data.best_pick : null;
    return {
      ...data,
      ticker: data.ticker || data.symbol,
      aiScore: Math.round(
        bp?.ai_score_0_100 ?? data.ai_score_0_100 ??
        (bp?.ai_score_0_10 ?? data.ai_score_0_10 ?? 0) * 10
      ),
      executionScore: Math.round(
        bp?.execution_score_0_100 ?? data.execution_score_0_100 ??
        (bp?.execution_score_0_10 ?? data.execution_score_0_10 ?? 0) * 10
      ),
      confidence: Math.round(
        bp?.confidence_0_100 ?? data.confidence_0_100 ??
        (bp?.confidence_0_10 ?? data.confidence_0_10 ?? data.confidence ?? 0) * 10
      ),
      entryPrice: tp.entry ?? null,
      stopPrice: tp.stop ?? null,
      gain: tp.gain_pct ?? null,
      riskReward: tp.risk_reward ?? null,
      targets: {
        t1: targets[0] ?? null,
        t2: targets[1] ?? null,
        t3: targets[2] ?? null,
      },
      technicals: tech && Object.keys(tech).length > 0 ? {
        momentum: tech.momentum ?? 50,
        trend: tech.trend ?? 50,
        volatility: tech.volatility ?? 50,
        liquidity: tech.liquidity ?? 50,
        risk: tech.risk ?? 50,
      } : null,
      executionPlan: ep && Object.keys(ep).length > 0 ? {
        date: ep.date ?? "",
        window: ep.window ?? "",
        entryMethod: ep.entry_method ?? "",
        buyZone: {
          low: ep.buy_zone_low ?? null,
          high: ep.buy_zone_high ?? null,
        },
      } : null,
      sentiment: {
        direction: sentimentRaw.direction ?? "NEUTRAL",
        summary: sentimentRaw.summary ?? "",
        headlines: sentimentRaw.headlines ?? [],
      },
      summary: human.plain_summary ?? thesis.thesis_summary ?? "",
      whyThisSetup: thesis.system_reasoning ?? "",
      riskNotes: thesis.risk_statement ?? "",
      executionNotes: human.what_you_should_do ?? thesis.execution_logic ?? "",
      llmActive: data.llm_active ?? false,
    };
  }

  async function runAnalyze(symbolOverride) {
    const reqId = ++analyzeReqIdRef.current;
    // Do NOT fall back to the closest candidate from a no-trade best_pick_v2 result.
    // That symbol should only be analyzed when the user explicitly clicks "Analyze anyway".
    const bestPickIsNoTrade =
      bestPickData?.is_trade === false ||
      bestPickData?.pick?.is_trade === false ||
      bestPickData?.best_pick?.is_trade === false;
    const bestPickSymbol = bestPickIsNoTrade ? "" : normalizeSymbol(
      bestPickData?.symbol ||
      bestPickData?.ticker ||
      bestPickData?.pick?.symbol ||
      bestPickData?.pick?.ticker ||
      bestPickData?.best_pick?.symbol ||
      bestPickData?.best_pick?.ticker ||
      ""
    );
    const s =
      normalizeSymbol(symbolOverride) ||
      normalizeSymbol(symbol) ||
      bestPickSymbol ||
      "SPY";

    if (!s) {
      showToast?.("Invalid symbol");
      return null;
    }

    // Clear stale analysis data immediately when analyzing a different symbol.
    if (s !== lastAnalyzedSymbol && lastAnalyzedSymbol) {
      setAnalyzeData(null);
    }

    setLoadingAnalyze(true);
    setErrAnalyze("");
    setCmdErr("");
    setAnalyzeIsLowConviction(false);

    try {
      try {
        if (analyzeAbortRef.current) analyzeAbortRef.current.abort();
      } catch {
        // ignore
      }

      const controller = new AbortController();
      analyzeAbortRef.current = controller;

      const budgetCandidate = Number(sizeBudget);
      const budget = Number.isFinite(budgetCandidate) && budgetCandidate > 0
        ? budgetCandidate
        : Number.isFinite(Number(account?.buying_power))
          ? Number(account.buying_power)
          : Number.isFinite(Number(account?.cash))
            ? Number(account.cash)
            : 1000;

      const riskPct = Number(sizeRiskPct);
      const risk = Number.isFinite(riskPct)
        ? riskPct <= 1
          ? "low"
          : riskPct <= 2
            ? "medium"
            : "high"
        : "medium";

      const timeframe = "swing";

      const raw = await safeApiCall(
        () => apiAnalyzeSymbol(s, { budget, risk, timeframe, signal: controller.signal, timeoutMs: 60000 }),
        { onToast: showLiveDataToast, context: "analyze" }
      );

      const normalizedEnvelope = normalizeAnalysis(raw);
      const analysisPayload =
        (normalizedEnvelope?.analysis && typeof normalizedEnvelope.analysis === "object" ? normalizedEnvelope.analysis : null) ||
        (raw && typeof raw === "object" ? raw : null);

      const mappedData = mapAnalysisResponse(analysisPayload);
      if (!mappedData) {
        throw new Error("Analysis unavailable.");
      }

      // Check for low-conviction signals
      const rawStatus = String(analysisPayload?.status || "").toLowerCase();
      const rawConf10 = Number(analysisPayload?.confidence_0_10 ?? analysisPayload?.confidence ?? 10);
      const isLowConv = rawStatus === "low_conviction" || (Number.isFinite(rawConf10) && rawConf10 < 5);
      setAnalyzeIsLowConviction(isLowConv);

      setAnalyzeData(mappedData);

      lastValidAnalysisRef.current = mappedData;

      setAnalysisBySymbol((prev) => ({
        ...(prev || {}),
        [s]: mappedData,
      }));

      setLastAnalyzedSymbol(s);

      showToast?.("Analysis ready");

      return mappedData;
    } catch (e) {
      if (reqId !== analyzeReqIdRef.current) return;

      setAnalyzeData(null);
      const msg = friendlyError(e, "analyze") || String(e?.message || e || "Analysis unavailable — retry.");
      setErrAnalyze(msg);
      setCmdErr(msg);

      console.error("Analyze error:", e);
      return null;
    } finally {
      setLoadingAnalyze(false);
    }
  }


  async function handleAnalyze() {
    if (loadingAnalyze) return;

    // Enforce daily analyze limit for free users
    if (!canAccess(userPlan, "starter") && analyzeRemaining(userPlan) <= 0) {
      setTab("pricing");
      showToast?.("Daily limit reached — upgrade to Starter for unlimited analyzes.");
      return;
    }

    try {
      setLastAnalyzeClickAt?.(Date.now());

      const s = normalizeSymbol(symbol);
      if (!s) {
        showToast?.("Invalid symbol");
        return;
      }

      if (s.endsWith("W") && s.length >= 4) {
        setCmdErr("This appears to be a warrant. Consider analyzing the common stock instead.");
        return;
      }

      if (!canAccess(userPlan, "starter")) incrementAnalyzeUsage();

      const payload = await runAnalyze(s);

      if (payload) {
        setAnalyzeModalSymbol?.(s);
      }
    } catch (e) {
      console.error("Analyze error:", e);
      showToast?.("Analyze failed");
    }
  }


  // ---- boot ----
  useEffect(() => {
    safeLoad(loadHealth);
    safeLoad(loadClock);
    safeLoad(loadAccount);
    safeLoad(loadMovers);
    safeLoad(loadPortfolioLive);
    safeLoad(loadWatchlistLive);
    safeLoad(loadPerformance);
    safeLoad(loadRecentPicks);
    safeLoad(loadBestPick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const t = window.setInterval(() => {
      safeLoad(loadPerformance);
      safeLoad(loadRecentPicks);
    }, 300000); // refresh every 5 minutes
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      safeLoad(loadMovers);
    }, 60000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      safeLoad(loadHealth);
    }, 30000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Best Pick is loaded only when the user explicitly clicks the button.
  // Analysis panels update when the user explicitly clicks Analyze or Use Symbol.


  // ---- UI bits ----
  const apiPillClass = apiOnline ? "pill pill--good" : "pill pill--bad";
  const apiPillText = apiOnline ? "Online" : "Offline";


  // ✅ FIX: Movers now “does its job”:
  // click row -> sets symbol AND takes you back to Dashboard immediately
  const onSelectMover = (sym) => {
    if (!sym) return;
    const s = normalizeSymbol(sym);
    setSymbol(s);
    const v = validateCmdSymbol(s);
    setCmdErr(v.ok ? "" : v.message);
    setTab("dashboard");
    showToast(`Loaded ${s}`);
  };


  // ✅ NEW: Recommendation card (Dashboard)
  const RecommendationCard = () => {
    const bestPayload = bestPickData && typeof bestPickData === "object" ? bestPickData : null;
    const best =
      (bestPayload?.pick && typeof bestPayload.pick === "object" ? bestPayload.pick : null) ||
      (bestPayload?.best_pick && typeof bestPayload.best_pick === "object" ? bestPayload.best_pick : null) ||
      bestPayload;
    const humanReadable =
      (bestPayload?.human_readable && typeof bestPayload.human_readable === "object" ? bestPayload.human_readable : null) ||
      (best?.human_readable && typeof best.human_readable === "object" ? best.human_readable : null);

    const bestSymbol = normalizeSymbol(best?.symbol || best?.ticker || "");
    const hasBestPick = Boolean(bestSymbol);

    const toScore10 = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.max(0, Math.min(10, n <= 10 ? n : n / 10));
    };

    const aiScore = (best?.ai_score_0_100 != null ? best.ai_score_0_100 / 10 : null) ?? best?.ai_score_0_10 ?? best?.ai_score ?? best?.score;
    const executionScore = best?.execution_score_0_10 ?? best?.execution_score;
    const confidenceScore = best?.confidence_0_10 ?? best?.confidence;
    const aiScore10 = toScore10(aiScore);
    const executionScore10 = toScore10(executionScore);
    const confidence10 = toScore10(confidenceScore);

    const updatedAtRaw = best?.updated_at ?? best?.updatedAt ?? bestPayload?.updated_at ?? bestPayload?.updatedAt;
    const updatedAt = fmt(updatedAtRaw);

    const tradePlan = best?.trade_plan && typeof best.trade_plan === "object" ? best.trade_plan : null;
    const targets = Array.isArray(tradePlan?.targets) ? tradePlan.targets : [];
    const entryText = fmtPrice(tradePlan?.entry);
    const stopText = fmtPrice(tradePlan?.stop);
    const targetNums = targets
      .map((t) => Number(t))
      .filter((n) => Number.isFinite(n));

    const hasLowOpportunityError =
      (bestPayload?.error !== null && bestPayload?.error !== undefined) ||
      (best?.error !== null && best?.error !== undefined);

    const useSymbol = (sym) => {
      const s = normalizeSymbol(sym);
      if (!s) return;
      setSymbol(s);
      const v = validateCmdSymbol(s);
      setCmdErr(v.ok ? "" : v.message);
      showToast(`Analyzing ${s}…`);
      runAnalyze(s);
    };

    return (
      <div className="card" style={{ border: `1px solid ${T.borderStrong}`, opacity: 1 }}>
        <div className="cardHead">
          <div>
            <div className="cardTitle">Best Pick</div>
            <div className="cardSub">Main attraction — the system’s top idea right now.</div>
          </div>
          <div className="cardRight" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {updatedAtRaw ? <span className="pill pill--neutral" style={{ padding: "6px 10px", fontSize: 11.5 }}>{`Last updated ${updatedAt}`}</span> : null}
            {hasLowOpportunityError ? <span className="pill pill--warn" style={{ padding: "6px 10px", fontSize: 11.5 }}>Market currently low opportunity</span> : null}
            <button className="btn btn--ghost" onClick={loadBestPick} disabled={loadingBestPick}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {loadingBestPick ? <span className="btnSpinner" /> : null}
                <span>{loadingBestPick ? "Refreshing…" : "Refresh"}</span>
              </span>
            </button>
          </div>
        </div>

        <div className="cardBody">
          {loadingBestPick && !hasBestPick ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="btnSpinner" />
              <span className="mutedSmall">Loading best pick…</span>
            </div>
          ) : errBestPick && !hasBestPick ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div className="monoBox monoBox--bad" style={{ margin: 0 }}>{errBestPick}</div>
              <div>
                <button className="btn btn--ghost" onClick={loadBestPick} disabled={loadingBestPick}>Refresh</button>
              </div>
            </div>
          ) : !hasBestPick ? (
            <div className="mutedSmall">No high-quality opportunity detected.</div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(110px, 1fr))", gap: 10 }}>
                  <div className="stat">
                    <div className="statLabel">Symbol</div>
                    <div className="statValue" style={{ fontSize: 20 }}>{fmt(best?.symbol)}</div>
                  </div>
                  <div className="stat">
                    <div className="statLabel">AI score</div>
                    <div className="statValue">{aiScore10 === null ? "—" : Math.round(aiScore10 * 10)}<span className="mutedSmall" style={{fontSize:11,marginLeft:3}}>/100</span></div>
                  </div>
                  <div className="stat">
                    <div className="statLabel">Execution</div>
                    <div className="statValue">{executionScore10 === null ? "—" : Math.round(executionScore10 * 10)}<span className="mutedSmall" style={{fontSize:11,marginLeft:3}}>/100</span></div>
                  </div>
                  <div className="stat">
                    <div className="statLabel">Confidence</div>
                    <div className="statValue">{confidence10 === null ? "—" : Math.round(confidence10 * 10)}<span className="mutedSmall" style={{fontSize:11,marginLeft:3}}>/100</span></div>
                  </div>
                </div>

                <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, background: T.bg }}>
                  <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>Trade Levels</div>
                  <div className="kv" style={{ marginTop: 0 }}>
                    <div className="kvRow"><div className="kvKey">Entry</div><div className="kvVal">{entryText}</div></div>
                    <div className="kvRow"><div className="kvKey">Stop</div><div className="kvVal">{stopText}</div></div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div className="mutedSmall" style={{ fontWeight: 800, marginBottom: 6 }}>Targets</div>
                    {targetNums.length ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {targetNums.slice(0, 3).map((t, i) => (
                          <span key={`best_t_${i}`} className="pill pill--neutral">{`T${i + 1} ${fmtPrice(t)}`}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="mutedSmall">—</div>
                    )}
                  </div>
                </div>
              </div>

              {humanReadable && (
                <div className="best-pick-explainer">
                  {(() => {
                    const _t1 = targetNums[0] ?? null;
                    const _t2 = targetNums[1] ?? null;
                    const _t3 = targetNums[2] ?? null;
                    const cleanNotes = (text, t1, t2, t3) => {
                      if (!text) return '';
                      return text
                        .replace(/\d+\.\d{3,}/g, n => parseFloat(n).toFixed(2))
                        .replace(/\[\d[\d.,\s]*\]/g, `T1 $${t1 ?? '—'} / T2 $${t2 ?? '—'} / T3 $${t3 ?? '—'}`);
                    };
                    return (
                      <>
                        <p>{fmt(humanReadable?.summary)}</p>
                        <p><strong>Why this setup</strong> {fmt(humanReadable?.why_this_trade)}</p>
                        <p><strong>Risk notes</strong> {fmt(humanReadable?.risk_assessment)}</p>
                        <p><strong>Execution notes</strong> {fmt(cleanNotes(humanReadable?.how_to_execute, _t1, _t2, _t3))}</p>
                      </>
                    );
                  })()}
                </div>
              )}

              {bestSymbol ? (
                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn btn--ghost" onClick={() => useSymbol(bestSymbol)}>Use symbol</button>
                  <button
                    className="btn btn--primary"
                    onClick={() =>
                      savePickToPortfolioLive({
                        symbol: bestSymbol,
                        source: "best_pick",
                        analysisSnapshot: ensureAnalyzeSchema(bestPayload, bestSymbol),
                      })
                    }
                    disabled={!bestSymbol || savingPortfolio || !tradePlan}
                  >
                    {savingPortfolio ? "Saving…" : "Add to Portfolio"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  };


  // ✅ Market clock moved INTO Dashboard (so Market page can be removed from nav)
  const MarketClockCard = () => (
    <div className="card">
      <div className="cardHead">
        <div>
          <div className="cardTitle">Market clock</div>
          <div className="cardSub">Session status, next open/close.</div>
        </div>
        <div className="cardRight">
          <button className="btn btn--ghost" onClick={loadClock} disabled={loadingClock}>
            Refresh
          </button>
        </div>
      </div>
      <div className="cardBody">
        {errClock ? (
          <div className="monoBox monoBox--bad">{errClock}</div>
        ) : (
          <div className="kv">
            <div className="kvRow">
              <div className="kvKey">Status</div>
              <div className="kvVal">
                <span className="pill pill--neutral">
                  {sessionFromClockOrHeuristic(clock) === "OPEN" ? "OPEN" : "CLOSED"}
                </span>
              </div>
            </div>
            <div className="kvRow">
              <div className="kvKey">Next open (ET)</div>
              <div className="kvVal">{fmt(clock?.next_open)}</div>
            </div>
            <div className="kvRow">
              <div className="kvKey">Next close (ET)</div>
              <div className="kvVal">{fmt(clock?.next_close)}</div>
            </div>
            <div className="kvRow">
              <div className="kvKey">Updated</div>
              <div className="kvVal">{fmt(clock?.ts || clock?.timestamp)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );


  const Dashboard = () => {
    const analysisObj = analyzeData && typeof analyzeData === "object" ? analyzeData : null;

    const statusRaw = analysisObj?.status;
    const statusNorm = String(statusRaw || "").toLowerCase();
    const hasAnalysis = Boolean(analysisObj);

    const analyzeSym = normalizeSymbol(analysisObj?.symbol || symbol);

    const canRenderAnalyzeCards = Boolean(hasAnalysis);

    const analyzeBadge = pickMarketBadge(analysisObj);

    const analysisAttempted = Boolean(lastAnalyzeClickAt);
    const analyzeFallbackText = analysisAttempted
      ? "No data available for this symbol."
      : "Run an analysis above to populate this panel.";

    const tp = analysisObj?.trade_plan && typeof analysisObj.trade_plan === "object" ? analysisObj.trade_plan : null;
    const ep = analysisObj?.execution_plan && typeof analysisObj.execution_plan === "object" ? analysisObj.execution_plan : null;

    const whyArr = Array.isArray(analysisObj?.why) ? analysisObj.why : Array.isArray(analysisObj?.reasoning?.why) ? analysisObj.reasoning.why : [];
    const confirmsArr = Array.isArray(analysisObj?.what_confirms) ? analysisObj.what_confirms : Array.isArray(analysisObj?.reasoning?.confirms) ? analysisObj.reasoning.confirms : [];
    const breaksArr = Array.isArray(analysisObj?.what_breaks) ? analysisObj.what_breaks : Array.isArray(analysisObj?.reasoning?.breaks) ? analysisObj.reasoning.breaks : [];
    const whenCheckAgain = fmt(analysisObj?.when_to_recheck);

    const ameta = { status: analyzeStatus, mode: analyzeMode, message: analyzeMessage };
    const analyzeUiMode = uiModeFromMeta(ameta, { timedOut: false, hasErr: Boolean(errAnalyze) });
    const analyzeModeBadge = userFacingModeBadgeText(analyzeUiMode);
    const analyzeIsDegraded = false;

    const isSynthetic = Boolean(analysisObj && typeof analysisObj === "object" && analysisObj.__fallback);

    const isPro = userPlan === "pro";
    const gatePro = false;

    const techScores = analysisObj?.technicals && typeof analysisObj.technicals === "object" ? analysisObj.technicals : null;
    const meaningScore100 = !canRenderAnalyzeCards || isSynthetic ? null : readAiScore100(techScores);
    const meaningConf100 = !canRenderAnalyzeCards || isSynthetic ? null : readExecutionScore100(techScores);

    const DegradedAiPlaceholderCard = ({ compact = false } = {}) => null;

    const scoreToPct100 = (raw) => {
      const n0 = Number(raw);
      if (!Number.isFinite(n0)) return null;
      const n = n0 <= 10 ? n0 * 10 : n0;
      return Math.max(0, Math.min(100, n));
    };

    const RingsCard = () => {
      if (loadingAnalyze) return <SkeletonCard title="AI + Execution Rings" />;
      if (!analysisObj) return (
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">Ticker Analysis</div>
              <div className="cardSub">AI + execution scores and trade plan.</div>
            </div>
          </div>
          <div className="cardBody">
            <div className="mutedSmall">{analyzeFallbackText}</div>
          </div>
        </div>
      );

      const ai100 = Number.isFinite(Number(analysisObj?.aiScore)) ? Number(analysisObj.aiScore) : null;
      const exec100 = Number.isFinite(Number(analysisObj?.executionScore)) ? Number(analysisObj.executionScore) : null;
      const ai10 = ai100 !== null ? ai100 / 10 : null;
      const exec10 = exec100 !== null ? exec100 / 10 : null;
      const conf10 = Number.isFinite(Number(analysisObj?.confidence)) ? Number(analysisObj.confidence) / 10 : null;

      const _tp = analysisObj?.trade_plan && typeof analysisObj.trade_plan === "object" ? analysisObj.trade_plan : {};
      // Check trade_plan fields first, then top-level API fields, then mapped aliases
      const entryNum = Number(_tp?.entry ?? analysisObj?.entry ?? analysisObj?.entryPrice);
      const stopNum  = Number(_tp?.stop  ?? analysisObj?.stop  ?? analysisObj?.stopPrice);
      const rrNum    = Number(_tp?.risk_reward ?? analysisObj?.risk_reward ?? analysisObj?.riskReward);
      const gainNum  = Number(_tp?.gain_pct    ?? analysisObj?.gain_pct    ?? analysisObj?.gain);
      // targets: trade_plan.targets array first; fall back to mapped {t1,t2,t3} object
      const _tpTargets  = Array.isArray(_tp?.targets) ? _tp.targets : null;
      const _objTargets = !_tpTargets
        ? [analysisObj?.targets?.t1, analysisObj?.targets?.t2, analysisObj?.targets?.t3].filter(v => v != null)
        : null;
      const rawTargetsArr = _tpTargets ?? _objTargets ?? [];
      const targetsArr = rawTargetsArr.map(Number).filter((t) => Number.isFinite(t) && t > 0);

      const entryText = Number.isFinite(entryNum) && entryNum > 0 ? `$${entryNum.toFixed(2)}` : "Unavailable";
      const stopText = Number.isFinite(stopNum) && stopNum > 0 ? `$${stopNum.toFixed(2)}` : "Unavailable";
      const targetsText = targetsArr.length
        ? targetsArr.map((t) => `$${t.toFixed(2)}`).join(" / ")
        : "Unavailable";
      const gainText = Number.isFinite(gainNum) && gainNum !== 0 ? `${gainNum.toFixed(2)}%` : "Unavailable";
      const rrText = Number.isFinite(rrNum) && rrNum !== 0 ? rrNum.toFixed(2) : "Unavailable";

      const _NO_TRADE_DECS = ["NO_TRADE", "LOW_CONVICTION", "MISSED_ENTRY"];
      const isCardWarning = Boolean(analysisObj?.display_warning)
        || _NO_TRADE_DECS.includes(String(analysisObj?.trade_decision || "").toUpperCase());

      const humanizeReason = (reason) => {
        if (!reason) return "";
        let s = String(reason);
        s = s.replace(/Earnings risk:\s*Earnings in (\d+)d\s*\(([\d-]+)\)/,
          "Earnings report in $1 days ($2) — too risky to hold through");
        s = s.replace(/Earnings in (\d+)d\s*\(([\d-]+)\)/, "Earnings in $1 days ($2)");
        s = s.replace(/[Cc]onfidence[=\s]+([\d.]+)\s*[<≤]\s*([\d.]+)/, "Confidence too low to trade");
        s = s.replace(/[Cc]onfidence \d+\.?\d*\s*below \d+\.?\d*\s*threshold/, "Confidence too low to trade");
        s = s.replace(/final_score[=\s]+([\d.]+)\s*[<≤]\s*([\d.]+)/, "Overall score below threshold");
        s = s.replace(/Final score \d+\.?\d*\s*below \d+\.?\d*\s*threshold/, "Overall score below threshold");
        s = s.replace(/premover[=\s]+([\d.]+)\s*[<≤]\s*([\d.]+)/, "Pre-market signal too weak");
        s = s.replace(/Pre-mover score \d+\.?\d*\s*below \d+\.?\d*\s*threshold/, "Pre-market signal too weak");
        s = s.replace(/Execution score \d+\.?\d*\s*below \d+\.?\d*\s*threshold/, "Execution timing not favorable");
        s = s.replace(/No high-conviction setups found.*/i, "No clear trade setup detected");
        s = s.replace(/Edge signals \d+\s*below \d+\s*required/, "Not enough confirming signals");
        return s;
      };

      return (
        <div className="card" style={isCardWarning ? { borderColor: "rgba(251,113,133,0.10)", boxShadow: "inset 0 0 0 9999px rgba(251,113,133,0.015), 0 10px 28px rgba(0,0,0,0.32)" } : {}}>
          <div className="cardHead">
            <div>
              <div className="cardTitle">Ticker Analysis</div>
              <div className="cardSub">AI + execution scores and trade plan.</div>
            </div>
          </div>
          <div className="cardBody">
            {lastAnalyzedSymbol ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 6, background: T.bg3, border: `1px solid ${T.border2}`, marginBottom: 10, fontSize: 12, fontWeight: 700, color: T.textSec }}>
                Currently analyzing: <span style={{ color: T.text, marginLeft: 4 }}>{lastAnalyzedSymbol}</span>
              </div>
            ) : null}

            {/* ── Safety-filter warning — shown ABOVE score rings ── */}
            {(() => {
              const dw = analysisObj?.display_warning && typeof analysisObj.display_warning === "object"
                ? analysisObj.display_warning : null;
              const tdec = String(analysisObj?.trade_decision || "").toUpperCase();
              const NO_TRADE_DECS = ["NO_TRADE", "LOW_CONVICTION", "MISSED_ENTRY"];
              const shouldWarn = Boolean(dw) || NO_TRADE_DECS.includes(tdec);
              if (!shouldWarn) return null;

              const title    = dw?.title    || `System Decision: ${tdec || "NO_TRADE"}`;
              const subtitle = dw?.subtitle || "Aurexis daily scan would NOT recommend this trade";
              const reasons  = Array.isArray(dw?.reasons) && dw.reasons.length > 0 ? dw.reasons : [];
              const scc      = analysisObj?.scan_consistency_check;
              const earningsRisk = Boolean(dw?.earnings_warning || scc?.earnings_risk);
              const earningsNote = dw?.earnings_warning || scc?.earnings_note || "";
              // Parse date out of earnings note for the amber pill (e.g. "2026-05-06")
              const earningsDateMatch = earningsNote.match(/\d{4}-\d{2}-\d{2}/);
              const earningsDateStr = earningsDateMatch ? earningsDateMatch[0] : null;
              const daysToEarnings = scc?.days_to_earnings ?? null;

              return (
                <div style={{
                  background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.22)",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 14,
                }}>
                  {/* Row 1: title + earnings pill */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(252,165,165,0.92)", letterSpacing: "-0.01em" }}>
                        {title}
                      </span>
                    </div>
                    {earningsRisk && daysToEarnings != null ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, flexShrink: 0,
                        background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.30)",
                        color: "rgba(251,191,36,0.90)", letterSpacing: "0.05em", whiteSpace: "nowrap",
                      }}>EARNINGS {daysToEarnings}d</span>
                    ) : null}
                  </div>
                  {/* Row 2: subtitle */}
                  <div style={{ fontSize: 12, color: T.textFaint, marginBottom: reasons.length > 0 ? 6 : 0 }}>
                    {subtitle}
                  </div>
                  {/* Row 3: reasons — plain English */}
                  {reasons.length > 0 ? (
                    <div style={{ fontSize: 11, color: "rgba(252,165,165,0.60)", fontStyle: "italic" }}>
                      {reasons.map(humanizeReason).join(" · ")}
                    </div>
                  ) : null}
                  {/* Earnings date pill */}
                  {earningsDateStr ? (
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6,
                        background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)",
                        color: "rgba(251,191,36,0.75)", letterSpacing: "0.04em",
                      }}>EARNINGS {earningsDateStr}</span>
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {analysisObj?.llmActive === false ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.4)", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "rgba(250,204,21,0.9)", fontWeight: 700 }}>Basic analysis — AI scoring unavailable</span>
              </div>
            ) : null}
            {/* Score rings — always visible; persistent warning context when NO_TRADE */}
            {(() => {
              const tdec = String(analysisObj?.trade_decision || "").toUpperCase();
              const isRef = Boolean(analysisObj?.display_warning) || ["NO_TRADE", "LOW_CONVICTION", "MISSED_ENTRY"].includes(tdec);
              return (
                <div>
                  {isRef ? (
                    <div style={{ marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: "rgba(252,165,165,0.45)", marginBottom: 4, fontStyle: "italic" }}>
                        ⚠ {tdec || "NO_TRADE"} — see warning above
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(252,165,165,0.65)", marginBottom: 8 }}>
                        Reference only — do not trade
                      </div>
                    </div>
                  ) : null}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <AIScoreRing score={ai100} confidence={analysisObj?.confidence ?? null} loading={false} />
                    <AIScoreRing score={exec100} label="EXECUTION" size={160} strokeWidth={14} loading={false} showConfidence={false} />
                  </div>
                </div>
              );
            })()}
            <div className="mutedSmall" style={{ marginTop: 8 }}>
              Scale: donut values are 0-100 from <b>Analyze</b>. Equivalent: AI {ai10 === null ? "—" : `${ai10.toFixed(1)}/10`} • Execution {exec10 === null ? "—" : `${exec10.toFixed(1)}/10`}.
            </div>
            <div className="mutedSmall" style={{ marginTop: 4 }}>
              Best Pick card uses the latest /best_pick_v2 snapshot. Ticker Analysis uses /analyze for the currently analyzed symbol.
            </div>

            <div style={{ height: 1, width: "100%", background: T.bg3, margin: "10px 0" }} />

            {/* ── Trade Levels ─────────────────────────────── */}
            {(() => {
              const tdec = String(analysisObj?.trade_decision || "").toUpperCase();
              const isRefOnly = ["NO_TRADE", "LOW_CONVICTION", "MISSED_ENTRY"].includes(tdec)
                || analysisObj?.is_trade === false;
              const dir = String(_tp?.direction || "").toUpperCase();
              const entryMethod = ep?.entry_method ?? ep?.entryMethod ?? null;
              const t1 = targetsArr[0] ?? null;
              const t2 = targetsArr[1] ?? null;
              const t3 = targetsArr[2] ?? null;
              const hasAnyLevel = (Number.isFinite(entryNum) && entryNum > 0)
                || (Number.isFinite(stopNum) && stopNum > 0) || t1 != null;

              if (!hasAnyLevel) return (
                <div>
                  <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 6 }}>Trade Levels</div>
                  <div className="mutedSmall">{analyzeFallbackText}</div>
                </div>
              );

              const stopPct = Number.isFinite(entryNum) && entryNum > 0 && Number.isFinite(stopNum) && stopNum > 0
                ? ((stopNum - entryNum) / entryNum) * 100 : null;
              const t1Pct = Number.isFinite(entryNum) && entryNum > 0 && t1 != null
                ? ((t1 - entryNum) / entryNum) * 100 : null;
              const computedRR = Number.isFinite(entryNum) && entryNum > 0
                && Number.isFinite(stopNum) && stopNum > 0
                && t1 != null && (entryNum - stopNum) > 0
                ? (t1 - entryNum) / (entryNum - stopNum) : null;
              const rrDisplay = computedRR !== null ? computedRR
                : (Number.isFinite(rrNum) && rrNum > 0 ? rrNum : null);
              const rrColor = rrDisplay === null ? T.textMuted
                : rrDisplay >= 2.0 ? "rgba(74,222,128,0.85)"
                : rrDisplay >= 1.5 ? "rgba(250,204,21,0.85)"
                : "rgba(248,113,113,0.75)";

              // Sanity checks on trade levels
              const direction = String(_tp?.direction || "long").toLowerCase();
              const stopInvalid = direction === "long"
                && Number.isFinite(entryNum) && Number.isFinite(stopNum)
                && stopNum > entryNum;
              const stopInvalidShort = direction === "short"
                && Number.isFinite(entryNum) && Number.isFinite(stopNum)
                && stopNum < entryNum;
              const stopBad = stopInvalid || stopInvalidShort;
              const targetUnrealistic = Number.isFinite(entryNum) && entryNum > 0 && t1 != null
                && Math.abs((t1 - entryNum) / entryNum) > 0.50;
              const anyLevelFlagged = stopBad || targetUnrealistic;

              const cellStyle = {
                background: T.bg, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: "12px 14px",
              };
              const labelStyle = {
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: T.textFaint, marginBottom: 4,
              };
              const numStyle = { fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" };

              return (
                <div>
                  {/* Header + direction badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div className="mutedSmall" style={{ fontWeight: 900 }}>
                      {isRefOnly ? "Calculated Levels (Reference Only)" : "Trade Levels"}
                    </div>
                    {dir ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                        letterSpacing: "0.06em",
                        background: dir === "LONG" ? "rgba(74,222,128,0.10)" : "rgba(248,113,113,0.10)",
                        border: `1px solid ${dir === "LONG" ? "rgba(74,222,128,0.22)" : "rgba(248,113,113,0.22)"}`,
                        color: dir === "LONG" ? "rgba(74,222,128,0.80)" : "rgba(248,113,113,0.80)",
                      }}>{dir}</span>
                    ) : null}
                  </div>
                  {isRefOnly ? (
                    <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 10, fontStyle: "italic" }}>
                      These are the levels the system would use if this passed the conviction threshold. Aurexis does not recommend taking this trade.
                    </div>
                  ) : null}

                  {/* 2×2 grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {/* Entry */}
                    <div style={cellStyle}>
                      <div style={labelStyle}>Entry</div>
                      <div style={{ ...numStyle, color: T.text }}>
                        {Number.isFinite(entryNum) && entryNum > 0 ? `$${entryNum.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    {/* Stop Loss */}
                    <div style={cellStyle}>
                      <div style={labelStyle}>Stop Loss</div>
                      {stopBad ? (
                        <>
                          <div style={{ ...numStyle, color: T.textFaint }}>—</div>
                          <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2, fontStyle: "italic" }}>(invalid — system error)</div>
                        </>
                      ) : (
                        <>
                          <div style={{ ...numStyle, color: "rgba(248,113,113,0.80)" }}>
                            {Number.isFinite(stopNum) && stopNum > 0 ? `$${stopNum.toFixed(2)}` : "—"}
                          </div>
                          {stopPct !== null ? (
                            <div style={{ fontSize: 11, color: "rgba(248,113,113,0.45)", marginTop: 2 }}>
                              {stopPct.toFixed(1)}% from entry
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                    {/* Target 1 */}
                    <div style={cellStyle}>
                      <div style={labelStyle}>Target 1</div>
                      <div style={{ ...numStyle, color: "rgba(74,222,128,0.80)" }}>
                        {t1 != null ? `$${t1.toFixed(2)}` : "—"}
                        {targetUnrealistic ? <span style={{ fontSize: 13, marginLeft: 5, verticalAlign: "middle" }}>⚠</span> : null}
                      </div>
                      {t1Pct !== null ? (
                        <div style={{ fontSize: 11, color: targetUnrealistic ? "rgba(251,191,36,0.65)" : "rgba(74,222,128,0.45)", marginTop: 2 }}>
                          +{t1Pct.toFixed(1)}% from entry{targetUnrealistic ? " (target may be unrealistic)" : ""}
                        </div>
                      ) : null}
                    </div>
                    {/* R:R + T2/T3 */}
                    <div style={cellStyle}>
                      <div style={labelStyle}>R:R</div>
                      <div style={{ ...numStyle, color: rrColor }}>
                        {rrDisplay !== null ? `${rrDisplay.toFixed(2)}x` : "—"}
                      </div>
                      {(t2 != null || t3 != null) ? (
                        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>
                          {t2 != null ? `T2 $${t2.toFixed(2)}` : null}
                          {t2 != null && t3 != null ? " · " : null}
                          {t3 != null ? `T3 $${t3.toFixed(2)}` : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Entry method note */}
                  {entryMethod && String(entryMethod).trim() && String(entryMethod) !== "—" ? (
                    <div style={{ fontSize: 11, color: T.textFaint, fontStyle: "italic" }}>
                      Entry method: {String(entryMethod)}
                    </div>
                  ) : null}

                  {/* Flagged levels notice */}
                  {anyLevelFlagged ? (
                    <div style={{ marginTop: 10, fontSize: 11, padding: "7px 11px", borderRadius: 7, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.20)", color: "rgba(251,191,36,0.80)" }}>
                      ⚠ Some trade levels appear invalid for this symbol — do not trade based on these numbers.
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {analyzeSym ? (
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn btn--primary"
                  onClick={() =>
                    savePickToPortfolioLive({
                      symbol: analyzeSym,
                      source: "analyze",
                      analysisSnapshot: ensureAnalyzeSchema(analysisObj, analyzeSym),
                    })
                  }
                  disabled={!analyzeSym || savingPortfolio || !_tp || Boolean(analysisObj?.__fallback)}
                >
                  {savingPortfolio ? "Saving…" : "Add to Portfolio"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      );
    };

    const TechnicalAnalysisCard = () => {
      const ta = (analysisObj?.technicals && typeof analysisObj.technicals === "object" ? analysisObj.technicals : null)
        ?? (analysisObj?.technical_analysis && typeof analysisObj.technical_analysis === "object" ? analysisObj.technical_analysis : null);

      const taToPct100 = (raw) => {
        const n0 = Number(raw);
        if (!Number.isFinite(n0)) return null;
        const nAbs = Math.abs(n0);
        let n;
        if (nAbs <= 1) n = n0 * 100;
        else if (nAbs <= 5) n = (n0 / 5) * 100;
        else if (nAbs <= 10) n = n0 * 10;
        else n = n0;
        return Math.max(0, Math.min(100, n));
      };

      const barFillStyleForScoreLocal = (v) => {
        if (v === null) return { background: "rgba(255,255,255,0.16)" };
        if (v <= 39) return { background: "rgba(239,68,68,0.9)" };
        if (v <= 69) return { background: "rgba(250,204,21,0.9)" };
        return { background: "rgba(34,197,94,0.9)" };
      };

      const BarRow = ({ label, value }) => {
        const v = taToPct100(value);
        return (
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 36px", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <div className="mutedSmall" style={{ fontWeight: 800 }}>{label}</div>
            <div style={{ height: 10, borderRadius: 999, background: T.bg3, overflow: "hidden" }}>
              <div style={{ width: `${v === null ? 0 : v}%`, height: "100%", borderRadius: 999, ...(v === null ? {} : barFillStyleForScoreLocal(v)) }} />
            </div>
            <div className="mutedSmall" style={{ textAlign: "right", fontWeight: 800 }}>{v === null ? "—" : String(Math.round(v))}</div>
          </div>
        );
      };

      return (
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">Technical Analysis</div>
              <div className="cardSub">Momentum, trend, volatility, liquidity, risk.</div>
            </div>
          </div>
          <div className="cardBody">
            {loadingAnalyze ? (
              <SkeletonCard title="Technical Analysis" />
            ) : !analysisObj || !ta ? (
              <div className="mutedSmall">{analyzeFallbackText}</div>
            ) : (
              <div style={{ marginTop: 0 }}>
                <div className="mutedSmall" style={{ marginBottom: 10 }}>Scale guide: 0-39 weak, 40-69 mixed, 70-100 strong.</div>
                {["momentum", "trend", "volatility", "liquidity", "risk"].map((k) => (
                  <BarRow key={k} label={k.replace(/_/g, " ")} value={ta?.[k]} />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    const NewsSentimentCard = () => {
      const ns = (analysisObj?.sentiment && typeof analysisObj.sentiment === "object" ? analysisObj.sentiment : null)
        ?? (analysisObj?.news_sentiment && typeof analysisObj.news_sentiment === "object" ? analysisObj.news_sentiment : null);
      const human = analysisObj?.human_explanation && typeof analysisObj.human_explanation === "object" ? analysisObj.human_explanation : null;
      const sentimentData = analysisObj
        ? {
            direction: ns?.direction || ns?.bias || "NEUTRAL",
            summary: ns?.summary || human?.plain_summary || human?.summary || null,
            catalysts: Array.isArray(ns?.catalysts) ? ns.catalysts : [],
            risks: Array.isArray(ns?.risk_flags) ? ns.risk_flags : [],
          }
        : null;
      const hasNews =
        sentimentData &&
        (Boolean(sentimentData.summary) ||
          sentimentData.catalysts.length > 0 ||
          sentimentData.risks.length > 0);

      return (
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">News & Sentiment</div>
              <div className="cardSub">Direction, summary, catalysts, and risk flags.</div>
            </div>
          </div>
          <div className="cardBody">
            {loadingAnalyze ? (
              <SkeletonCard title="News & Sentiment" />
            ) : hasNews ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div className="kv" style={{ marginTop: 0 }}>
                  <div className="kvRow"><div className="kvKey">Direction</div><div className="kvVal">{fmt(sentimentData?.direction)}</div></div>
                </div>
                {sentimentData?.summary ? (
                  <div>
                    <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>Summary</div>
                    <div className="mutedSmall">{fmt(sentimentData?.summary)}</div>
                  </div>
                ) : null}
                {sentimentData?.catalysts?.length ? (
                  <div>
                    <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>Catalysts</div>
                    <ul className="mutedSmall" style={{ margin: 0, paddingLeft: 18 }}>
                      {sentimentData.catalysts.slice(0, 8).map((item, i) => (
                        <li key={`sent_cat_${i}`} style={{ marginBottom: 6 }}>{fmt(item)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {sentimentData?.risks?.length ? (
                  <div>
                    <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8, color: "rgba(248, 113, 113, 0.95)" }}>Risk Flags</div>
                    <ul className="mutedSmall" style={{ margin: 0, paddingLeft: 18, color: "rgba(248, 113, 113, 0.95)" }}>
                      {sentimentData.risks.slice(0, 8).map((item, i) => (
                        <li key={`sent_risk_${i}`} style={{ marginBottom: 6 }}>{fmt(item)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mutedSmall">Sentiment data will appear when available.</div>
            )}
          </div>
        </div>
      );
    };

    const TopMoversCard = () => {
      const eligibleMovers = (Array.isArray(movers) ? movers : []).filter((m) => {
        const price = Number(m?.price ?? m?.last_price ?? m?.last);
        const vol = m?.volume;
        const volume = vol != null ? Number(vol) : null;
        const sym = String(m?.symbol || "").toUpperCase();
        if (sym.includes("ZVZ") || sym.includes("TEST")) return false;
        return Number.isFinite(price) && price >= 1 && (volume === null || volume === 0 || volume >= 10000);
      });
      return (
        <div style={{
          background: darkMode ? "linear-gradient(160deg, rgba(10,13,22,0.98) 0%, rgba(13,17,30,0.98) 100%)" : "linear-gradient(160deg, rgba(248,250,252,0.98) 0%, rgba(242,246,250,0.98) 100%)",
          border: `1px solid ${T.border}`,
          borderRadius: 16, overflow: "hidden",
          boxShadow: darkMode ? "0 8px 40px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column",
          height: "100%",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px 12px",
            borderBottom: `1px solid ${T.border}`,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>Top Movers</div>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>Market leaders by movement.</div>
            </div>
            <button className="btn btn--ghost" onClick={loadMovers} disabled={loadingMovers}>Refresh</button>
          </div>
          <div style={{ flex: 1, padding: "14px 18px 18px", overflow: "auto", minHeight: 0 }}>
            {errMovers ? (
              <div className="monoBox monoBox--bad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span>Unable to load movers</span>
                <button className="btn btn--ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={loadMovers}>Retry</button>
              </div>
            ) : eligibleMovers.length > 0 ? (
              <div className="moversList" style={loadingMovers ? { opacity: 0.65 } : undefined}>
                {eligibleMovers.slice(0, 8).map((m) => {
                  const lastVal = m?.price;
                  const chgVal = m?.pct_change;
                  const chg = fmtSignedPct(chgVal);
                  return (
                    <div key={m.symbol} className="moverRow" onClick={() => onSelectMover(m.symbol)} title="Click to load">
                      <div className="moverSym">{m?.symbol ?? "—"}</div>
                      <div className="moverMeta">
                        <div className="mutedSmall">Last {lastVal === null || lastVal === undefined ? "—" : money(lastVal)}</div>
                        <div className={`moverChg ${chg.cls}`}>{chg.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mutedSmall">No liquid movers passed UI filters (price ≥ $1, volume ≥ 10k).</div>
            )}
            <div style={{ marginTop: 12 }}>
              <button className="btn btn--ghost" onClick={() => setTab("movers")}>Open full movers</button>
            </div>
          </div>
        </div>
      );
    };

    const SystemExpectationCard = () => {
      if (loadingAnalyze) return <SkeletonCard title="System Expectation" />;
      const why = Array.isArray(analysisObj?.why) ? analysisObj.why : [];
      const confirms = Array.isArray(analysisObj?.what_confirms) ? analysisObj.what_confirms : [];
      const breaks = Array.isArray(analysisObj?.what_breaks) ? analysisObj.what_breaks : [];
      const recheck = analysisObj?.when_to_recheck;
      const hasAny = Boolean((why && why.length) || (confirms && confirms.length) || (breaks && breaks.length) || (recheck !== null && recheck !== undefined && String(recheck).trim()));

      return (
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">System Expectation</div>
              <div className="cardSub">Why, confirms, breaks, and recheck timing.</div>
            </div>
          </div>
          <div className="cardBody">
            {!analysisObj || !hasAny ? (
              <div className="mutedSmall">{analyzeFallbackText}</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>Why</div>
                  {why.length ? (
                    <ul className="mutedSmall" style={{ margin: 0, paddingLeft: 18 }}>
                      {why.slice(0, 6).map((x, i) => (
                        <li key={`se_why_${i}`} style={{ marginBottom: 6 }}>{fmt(x)}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mutedSmall">{analyzeFallbackText}</div>
                  )}
                </div>

                <div>
                  <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>What confirms</div>
                  {confirms.length ? (
                    <ul className="mutedSmall" style={{ margin: 0, paddingLeft: 18 }}>
                      {confirms.slice(0, 6).map((x, i) => (
                        <li key={`se_conf_${i}`} style={{ marginBottom: 6 }}>{fmt(x)}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mutedSmall">{analyzeFallbackText}</div>
                  )}
                </div>

                <div>
                  <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>What breaks</div>
                  {breaks.length ? (
                    <ul className="mutedSmall" style={{ margin: 0, paddingLeft: 18 }}>
                      {breaks.slice(0, 6).map((x, i) => (
                        <li key={`se_break_${i}`} style={{ marginBottom: 6 }}>{fmt(x)}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mutedSmall">{analyzeFallbackText}</div>
                  )}
                </div>

                <div>
                  <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>When to recheck</div>
                  <div className="mutedSmall">{recheck === null || recheck === undefined || String(recheck).trim() === "" ? analyzeFallbackText : fmt(recheck)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    const isModuleUnavailable = (mod) => {
      if (loadingAnalyze) return false;
      if (!hasAnalysis) return true;
      if (isSynthetic) return true;
      if (!canRenderAnalyzeCards) return true;
      return !(mod && typeof mod === "object" && Object.keys(mod || {}).length);
    };

    const badgeStyleForSignal = (sig) => {
      const t = String(sig || "").trim().toLowerCase();
      if (t.includes("bull")) return { className: "pill pill--good", text: "Bullish" };
      if (t.includes("bear")) return { className: "pill pill--bad", text: "Bearish" };
      if (t.includes("neutral")) return { className: "pill pill--warn", text: "Neutral" };
      return { className: "pill pill--neutral", text: fmt(sig) || "—" };
    };

    const scoreBand = (score) => {
      const v0 = Number(score);
      if (!Number.isFinite(v0)) return null;
      const v = clamp100(v0);
      if (v <= 39) return "bad";
      if (v <= 69) return "warn";
      return "good";
    };

    const barFillStyleForScore = (score) => {
      const band = scoreBand(score);
      if (band === "good") return { background: "rgba(34,197,94,0.9)" };
      if (band === "warn") return { background: "rgba(250,204,21,0.9)" };
      if (band === "bad") return { background: "rgba(239,68,68,0.9)" };
      return { background: "rgba(255,255,255,0.16)" };
    };

    const GaugeRow = ({ label, value }) => {
      const vNum = Number(value);
      const v = Number.isFinite(vNum) ? clamp100(vNum) : null;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 36px", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <div className="mutedSmall" style={{ fontWeight: 800 }}>{label}</div>
          <div style={{ height: 10, borderRadius: 999, background: T.bg3, overflow: "hidden" }}>
            <div style={{ width: `${v === null ? 0 : v}%`, height: "100%", borderRadius: 999, ...(v === null ? {} : barFillStyleForScore(v)) }} />
          </div>
          <div className="mutedSmall" style={{ textAlign: "right", fontWeight: 800 }}>{v === null ? "—" : String(Math.round(v))}</div>
        </div>
      );
    };

    const ExecutionPlanCard = ({ compact = false } = {}) => {
      const analysisObj0 = analyzeData && typeof analyzeData === "object" ? analyzeData : null;
      const execution = (analysisObj0?.executionPlan && typeof analysisObj0.executionPlan === "object" ? analysisObj0.executionPlan : null)
        ?? (analysisObj0?.execution_plan && typeof analysisObj0.execution_plan === "object" ? analysisObj0.execution_plan : null);

      if (!execution) {
        return (
          <div className={compact ? "card card--compact card--secondary" : "card"} style={{ opacity: 0.92 }}>
            <div className="cardHead">
              <div>
                <div className="cardTitle">Execution plan</div>
                <div className="cardSub">Session timing, entry method, buy zone.</div>
              </div>
            </div>
            <div className="cardBody">
              <div className="mutedSmall">{analyzeFallbackText}</div>
            </div>
          </div>
        );
      }

      const dateText = fmtAnalyzeValue(execution?.date) || "—";
      const windowText = fmtAnalyzeValue(execution?.window) || "—";
      const executionEntryRaw = execution?.entryMethod ?? execution?.entry_method ?? execution?.entry ?? execution?.entry_price;
      const entryText = Number.isFinite(Number(executionEntryRaw)) ? fmtPrice(executionEntryRaw) : fmtAnalyzeValue(executionEntryRaw) || "—";
      const bzLow = execution?.buyZone?.low ?? execution?.buy_zone_low;
      const bzHigh = execution?.buyZone?.high ?? execution?.buy_zone_high;
      const bzText = bzLow != null && bzHigh != null ? `$${Number(bzLow).toFixed(2)} – $${Number(bzHigh).toFixed(2)}` : fmtAnalyzeValue(execution?.buy_zone) || "—";
      const bestPlan = bestPickData?.trade_plan && typeof bestPickData.trade_plan === "object" ? bestPickData.trade_plan : null;
      const bestEntry = Number(bestPlan?.entry);
      const execEntryNum = Number(execution?.entry ?? execution?.entry_price);
      const hasEntryMismatch = Number.isFinite(bestEntry) && Number.isFinite(execEntryNum) && Math.abs(bestEntry - execEntryNum) > 0.01;

      const wrapClass = compact ? "card card--compact card--secondary" : "card";

      return (
        <div className={wrapClass}>
          <div className="cardHead">
            <div>
              <div className="cardTitle">Execution plan</div>
              <div className="cardSub">Session timing, entry method, buy zone.</div>
            </div>
          </div>
          <div className="cardBody">
            {loadingAnalyze ? (
              <div className="mutedSmall" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="btnSpinner" />
                <span>Synthesizing trade model...</span>
              </div>
            ) : null}
            {!loadingAnalyze && errAnalyze && !analyzeData ? (
              <div className="monoBox monoBox--bad" style={{ marginBottom: 8 }}>Trade model unavailable — retry analysis.</div>
            ) : null}
            <div className="kv" style={{ marginTop: 0 }}>
              <div className="kvRow">
                <div className="kvKey">Date</div>
                <div className="kvVal">{dateText}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Window</div>
                <div className="kvVal">{windowText}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Entry</div>
                <div className="kvVal">{entryText}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Buy zone</div>
                <div className="kvVal">{bzText}</div>
              </div>
            </div>
            {hasEntryMismatch ? (
              <div className="mutedSmall" style={{ marginTop: 8 }}>
                Note: Best Pick entry ({fmtPrice(bestEntry)}) and Analyze execution entry ({fmtPrice(execEntryNum)}) are from different runs and can differ.
              </div>
            ) : null}
          </div>
        </div>
      );
    };

    const TradePlanCard = ({ symbol, source, analysisObj }) => {
      const analysis = analysisObj && typeof analysisObj === "object" ? analysisObj : null;
      const trade = analysis?.trade_plan && typeof analysis.trade_plan === "object" ? analysis.trade_plan : null;
      const symN = normalizeSymbol(symbol);
      const saveKey = symN ? `${symN}:${String(source || "")}` : "";
      const alreadySaved = Boolean(saveKey && savedPortfolioMap?.[saveKey]);

      const entryNum = Number(trade?.entry);
      const stopNum = Number(trade?.stop);
      const rrNum = Number(trade?.risk_reward);
      const gainNum = Number(trade?.gain_pct);
      const targetsArr = Array.isArray(trade?.targets) ? trade.targets : null;

      const entryText = Number.isFinite(entryNum) ? `$${entryNum.toFixed(2)}` : "Unavailable";
      const stopText = Number.isFinite(stopNum) ? `$${stopNum.toFixed(2)}` : "Unavailable";
      const targetsText = Array.isArray(targetsArr)
        ? targetsArr
            .map((t) => Number(t))
            .filter((t) => Number.isFinite(t))
            .map((t) => `$${t.toFixed(2)}`)
            .join(" / ") || "Unavailable"
        : "Unavailable";
      const gainText = Number.isFinite(gainNum) ? `${gainNum.toFixed(2)}%` : "Unavailable";
      const rrText = Number.isFinite(rrNum) ? rrNum.toFixed(2) : "Unavailable";

      const hasTp = Boolean(trade && trade?.entry !== undefined && trade?.entry !== null && String(trade?.entry).trim() !== "");

      return (
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">Trade Plan</div>
              <div className="cardSub">Entries, risk, and targets.</div>
            </div>
            <div className="cardRight" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn btn--primary"
                onClick={() => savePickToPortfolioLive({ symbol, source: source || "analyze", analysisSnapshot: analysis })}
                disabled={!symbol || savingPortfolio || alreadySaved || !hasTp || Boolean(analysis && analysis.__fallback)}
              >
                {alreadySaved ? "Saved" : savingPortfolio ? "Saving…" : "Save to Portfolio"}
              </button>
            </div>
          </div>
          <div className="cardBody">
            {savePortfolioErr ? <div className="monoBox monoBox--bad" style={{ marginBottom: 12 }}>{savePortfolioErr}</div> : null}
            {loadingAnalyze ? (
              <div className="mutedSmall" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span className="btnSpinner" />
                <span>Synthesizing trade model...</span>
              </div>
            ) : null}
            {!loadingAnalyze && errAnalyze && !analysis ? (
              <div className="monoBox monoBox--bad" style={{ marginBottom: 12 }}>Trade model unavailable — retry analysis.</div>
            ) : null}
            <div style={{ display: "grid", gap: 10 }}>
              <div className="kv" style={{ marginTop: 0, marginBottom: 0 }}>
                <div className="kvRow">
                  <div className="kvKey">Entry</div>
                  <div className="kvVal">{entryText}</div>
                </div>
                <div className="kvRow">
                  <div className="kvKey">Stop</div>
                  <div className="kvVal">{stopText}</div>
                </div>
                <div className="kvRow">
                  <div className="kvKey">Targets</div>
                  <div className="kvVal">{targetsText}</div>
                </div>
                <div className="kvRow">
                  <div className="kvKey">Gain</div>
                  <div className="kvVal">{gainText}</div>
                </div>
                <div className="kvRow">
                  <div className="kvKey">R/R</div>
                  <div className="kvVal">{rrText}</div>
                </div>
              </div>
              <div className="dashSplit" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, background: T.bg }}>
                  <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>Stop loss</div>
                  <div className="mutedSmall">{stopText}</div>
                </div>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, background: T.bg }}>
                  <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>Risk/Reward</div>
                  <div className="mutedSmall">{rrText}</div>
                </div>
              </div>
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, background: T.bg }}>
                <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>Targets</div>
                <div className="mutedSmall">{targetsText}</div>
              </div>
            </div>
          </div>
        </div>
      );
    };


    const showDegradedBanner = String(statusRaw || "").toLowerCase() === "degraded";

    // ---- PERFORMANCE CARD ----
    // ---- MARKET PULSE CARD ----
    const MarketPulseCard = () => {
      const session = sessionFromClockOrHeuristic(clock);
      const isOpen = session === "OPEN";
      const bestPayload0 = bestPickData && typeof bestPickData === "object" ? bestPickData : null;
      const best0 = bestPayload0?.best_pick && typeof bestPayload0.best_pick === "object" ? bestPayload0.best_pick
        : bestPayload0?.pick && typeof bestPayload0.pick === "object" ? bestPayload0.pick : bestPayload0;
      const marketRegime = String(best0?.market_regime || bestPayload0?.market_regime || "").trim().toUpperCase();
      const regimeLabel = marketRegime === "BULL" ? "Bullish" : marketRegime === "BEAR" ? "Bearish" : marketRegime || "Neutral";
      const regimeDesc = marketRegime === "BULL" ? "Momentum setups have edge" : marketRegime === "BEAR" ? "Defensive positioning preferred" : "Mixed signals — wait for clarity";
      const regimeColor = marketRegime === "BULL" ? { fg: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.18)" }
        : marketRegime === "BEAR" ? { fg: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.18)" }
        : { fg: "#fbbf24", bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.18)" };

      const topM = Array.isArray(movers) ? movers.slice(0, 4) : [];

      const nextTimeLabel = (() => {
        if (!clock) return null;
        const raw = isOpen ? clock.next_close : clock.next_open;
        if (!raw) return null;
        try {
          const d = new Date(raw);
          if (isNaN(d)) return null;
          return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
        } catch { return null; }
      })();

      return (
        <div style={{
          background: darkMode ? "linear-gradient(160deg,rgba(10,13,22,0.98),rgba(13,17,30,0.98))" : "linear-gradient(160deg,rgba(248,250,252,0.98),rgba(242,246,250,0.98))",
          border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden",
          boxShadow: darkMode ? "0 8px 40px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.06)",
          height: "100%", display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>Market Pulse</div>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>Live session & regime context</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: isOpen ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${isOpen ? "rgba(74,222,128,0.20)" : "rgba(255,255,255,0.10)"}` }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOpen ? "#4ade80" : "rgba(255,255,255,0.25)", display: "inline-block", boxShadow: isOpen ? "0 0 6px #4ade80" : "none" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: isOpen ? "#4ade80" : T.textFaint, letterSpacing: "0.05em" }}>{isOpen ? "OPEN" : "CLOSED"}</span>
            </div>
          </div>

          {/* Regime */}
          <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: T.textGhost, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Market Regime</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ padding: "5px 12px", borderRadius: 8, background: regimeColor.bg, border: `1px solid ${regimeColor.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: regimeColor.fg, letterSpacing: "0.02em" }}>{regimeLabel || "—"}</span>
              </div>
              {marketRegime ? <span style={{ fontSize: 11, color: T.textFaint }}>{regimeDesc}</span> : <span style={{ fontSize: 11, color: T.textGhost }}>Loads with daily pick</span>}
            </div>
            {nextTimeLabel ? (
              <div style={{ fontSize: 11, color: T.textGhost, marginTop: 8 }}>{isOpen ? "Closes" : "Opens"} {nextTimeLabel}</div>
            ) : null}
          </div>

          {/* Top movers mini-strip */}
          <div style={{ padding: "12px 18px 16px", flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: T.textGhost, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Today's Leaders</div>
            {topM.length === 0 ? (
              <div style={{ fontSize: 11, color: T.textGhost }}>Loading movers…</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {topM.map(m => {
                  const pct = Number(m.pct_change);
                  const isPos = pct >= 0;
                  return (
                    <button
                      key={m.symbol}
                      onClick={() => { setSymbol(m.symbol); runAnalyze(m.symbol); }}
                      style={{
                        background: isPos ? "rgba(74,222,128,0.06)" : "rgba(248,113,113,0.06)",
                        border: `1px solid ${isPos ? "rgba(74,222,128,0.14)" : "rgba(248,113,113,0.14)"}`,
                        borderRadius: 9, padding: "9px 11px", cursor: "pointer", textAlign: "left",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        transition: "background 0.12s",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{m.symbol}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: isPos ? "#4ade80" : "#f87171" }}>
                        {isPos ? "+" : ""}{Number.isFinite(pct) ? pct.toFixed(1) : "—"}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    };

    // ---- PERSONAL BEST PICK LOG CARD ----
    const AnalyzeHistoryCard = () => {
      const history = Array.isArray(bestPickLog) ? bestPickLog.slice(0, 10) : [];
      const isLocked = !canAccess(userPlan, "starter");

      const scoreColor = (sc) => {
        if (sc == null) return T.textGhost;
        if (sc >= 70) return "#4ade80";
        if (sc >= 45) return "#fbbf24";
        return "#f87171";
      };
      const scoreBg = (sc) => {
        if (sc == null) return T.bg3;
        if (sc >= 70) return "rgba(74,222,128,0.10)";
        if (sc >= 45) return "rgba(251,191,36,0.09)";
        return "rgba(248,113,113,0.09)";
      };
      const scoreBorder = (sc) => {
        if (sc == null) return T.border2;
        if (sc >= 70) return "rgba(74,222,128,0.22)";
        if (sc >= 45) return "rgba(251,191,36,0.20)";
        return "rgba(248,113,113,0.20)";
      };
      const timeAgo = (ts) => {
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
      };
      const verdictCfg = (dec) => {
        if (!dec) return null;
        if (dec.includes("HIGH") || dec.includes("BUY") || dec.includes("ACTION") || dec.includes("LONG"))
          return { text: "HIGH", color: "#4ade80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.22)" };
        if (dec.includes("NO_TRADE") || dec.includes("NOTRADE"))
          return { text: "NO TRADE", color: T.textGhost, bg: T.bg3, border: T.border };
        if (dec.includes("LOW") || dec.includes("CONVICTION"))
          return { text: "LOW", color: "#fbbf24", bg: "rgba(251,191,36,0.09)", border: "rgba(251,191,36,0.22)" };
        if (dec.includes("AVOID") || dec.includes("SHORT") || dec.includes("SELL"))
          return { text: "AVOID", color: "#f87171", bg: "rgba(248,113,113,0.09)", border: "rgba(248,113,113,0.22)" };
        return null;
      };
      const fmt = (v) => v != null ? `$${Number(v).toFixed(2)}` : "—";

      return (
        <div style={{
          background: darkMode ? "linear-gradient(160deg,rgba(10,13,22,0.98),rgba(13,17,30,0.98))" : "linear-gradient(160deg,rgba(248,250,252,0.98),rgba(242,246,250,0.98))",
          border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden",
          boxShadow: darkMode ? "0 8px 40px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.06)",
          height: "100%", display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>Personal Best Pick Log</div>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>Entry · Stop · Target from each analysis</div>
            </div>
            {history.length > 0 ? (
              <button onClick={() => { setBestPickLog([]); try { localStorage.removeItem("aurexis_best_pick_log"); } catch {} }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: T.textGhost, padding: "2px 6px" }}>
                Clear
              </button>
            ) : null}
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {history.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 28, opacity: 0.07, marginBottom: 10 }}>⊙</div>
                <div style={{ fontSize: 12, color: T.textFaint, lineHeight: 1.6 }}>Your best pick history will appear here.</div>
                <div style={{ fontSize: 11, color: T.textGhost, marginTop: 4 }}>Analyze a ticker above to log your first pick.</div>
              </div>
            ) : history.map((item, i) => {
              const vc = verdictCfg(item.decision);
              const isLast = i === history.length - 1;
              const hasTradeData = item.entry != null || item.stop != null || item.target != null;

              return (
                <div
                  key={`${item.symbol}_${item.ts}`}
                  style={{
                    position: "relative", padding: "12px 18px",
                    borderBottom: isLast ? "none" : `1px solid ${T.border}`,
                    cursor: isLocked ? "default" : "pointer", transition: "background 0.12s",
                  }}
                  onClick={() => { if (!isLocked) setSymbol(item.symbol); }}
                  onMouseEnter={e => { if (!isLocked) e.currentTarget.style.background = T.bg2; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Row content — blurred entirely for free users */}
                  <div style={{ filter: isLocked ? "blur(20px)" : "none", opacity: isLocked ? 0.15 : 1, userSelect: isLocked ? "none" : "auto", pointerEvents: isLocked ? "none" : "auto" }}>
                    {/* Top row: avatar + symbol + verdict + score + time */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hasTradeData ? 8 : 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: scoreBg(item.score), border: `1px solid ${scoreBorder(item.score)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: scoreColor(item.score) }}>{item.symbol.slice(0, 2)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: "-0.01em" }}>{item.symbol}</span>
                          {vc ? (
                            <span style={{ fontSize: 9, fontWeight: 800, color: vc.color, background: vc.bg, border: `1px solid ${vc.border}`, borderRadius: 5, padding: "2px 6px", letterSpacing: "0.04em" }}>{vc.text}</span>
                          ) : null}
                        </div>
                        <div style={{ fontSize: 10, color: T.textGhost, marginTop: 1 }}>{timeAgo(item.ts)}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: scoreColor(item.score), lineHeight: 1 }}>{item.score != null ? item.score : "—"}</div>
                        <div style={{ fontSize: 9, color: T.textGhost, marginTop: 1 }}>score</div>
                      </div>
                    </div>

                    {/* Trade data row */}
                    {hasTradeData && (
                      <div style={{ display: "flex", gap: 6, marginLeft: 44 }}>
                        {[
                          { label: "Entry", value: fmt(item.entry), color: "#60a5fa" },
                          { label: "Stop", value: fmt(item.stop), color: "#f87171" },
                          { label: "Target", value: fmt(item.target), color: "#4ade80" },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ flex: 1, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 8px" }}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: T.textGhost, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Full-row upgrade overlay for free users */}
                  {isLocked && (
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                      onClick={(e) => { e.stopPropagation(); setTab("pricing"); }}
                    >
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: darkMode ? "rgba(10,13,22,0.80)" : "rgba(255,255,255,0.88)",
                        border: "1px solid rgba(0,180,80,0.25)", borderRadius: 8,
                        padding: "5px 12px", backdropFilter: "blur(6px)",
                      }}>
                        <span style={{ fontSize: 10 }}>🔒</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80" }}>Starter to unlock</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    // ---- PERFORMANCE + RECENT PICKS (kept for data, replaced in render) ----
    const PerformanceCard = () => {
      if (loadingPerformance) return <SkeletonCard title="Performance" />;
      const perf = performanceData && typeof performanceData === "object" ? performanceData : null;

      // ── API aggregated stats (primary source) ──
      const apiTotalPicks  = Number.isFinite(Number(perf?.total_picks))    ? Number(perf.total_picks)    : null;
      const apiWins        = Number.isFinite(Number(perf?.wins))           ? Number(perf.wins)           : null;
      const apiLosses      = Number.isFinite(Number(perf?.losses))         ? Number(perf.losses)         : null;
      const apiWinRate     = Number.isFinite(Number(perf?.win_rate))       ? Number(perf.win_rate)       : null;
      const apiAvgReturn   = Number.isFinite(Number(perf?.avg_return_pct)) ? Number(perf.avg_return_pct) : null;

      // ── Computed from recentPicksData (fallback) ──
      const allPicks     = recentPicksData;
      const wonLocal     = allPicks.filter(p => /^won/.test(String(p?.status || p?.outcome || "").toLowerCase())).length;
      const lostLocal    = allPicks.filter(p => /^lost/.test(String(p?.status || p?.outcome || "").toLowerCase())).length;
      const decisiveLocal = wonLocal + lostLocal;
      const pendingCount = allPicks.filter(p => String(p?.status || p?.outcome || "").toLowerCase() === "pending").length;
      const resolvedCount = allPicks.length - pendingCount;
      const localWinRate = decisiveLocal > 0 ? (wonLocal / decisiveLocal) * 100 : null;
      const localReturns = allPicks.filter(p => Number.isFinite(Number(p?.max_return_pct))).map(p => Number(p.max_return_pct));
      const localAvgReturn = localReturns.length > 0 ? localReturns.reduce((a, b) => a + b, 0) / localReturns.length : null;

      // ── Merged: prefer API, fall back to computed ──
      const totalPicks      = apiTotalPicks ?? allPicks.length;
      const wonAllTime      = apiWins       ?? wonLocal;
      const lostAllTime     = apiLosses     ?? lostLocal;
      const allTimeWinRate  = apiWinRate    ?? localWinRate;
      const allTimeAvgReturn = apiAvgReturn ?? localAvgReturn;

      const hasAnyData = totalPicks > 0 || perf != null;

      return (
        <div style={{
          background: darkMode ? "linear-gradient(160deg, rgba(10,13,22,0.98) 0%, rgba(13,17,30,0.98) 100%)" : "linear-gradient(160deg, rgba(248,250,252,0.98) 0%, rgba(242,246,250,0.98) 100%)",
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: darkMode ? "0 8px 40px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.06)",
          height: "100%", display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px 12px",
            borderBottom: `1px solid ${T.border}`,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>Performance</div>
              {totalPicks > 0 ? (
                <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>
                  {totalPicks} pick{totalPicks !== 1 ? "s" : ""}{pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
                </div>
              ) : null}
            </div>
            {allTimeWinRate !== null ? (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                background: allTimeWinRate >= 50 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                border: `1px solid ${allTimeWinRate >= 50 ? "rgba(74,222,128,0.20)" : "rgba(248,113,113,0.20)"}`,
                color: allTimeWinRate >= 50 ? "#4ade80" : "#f87171",
                letterSpacing: "0.04em",
              }}>{allTimeWinRate.toFixed(1)}% WR</span>
            ) : null}
          </div>

          {/* Stats */}
          <div style={{ padding: "16px 18px" }}>
            {!hasAnyData ? (
              <div style={{ fontSize: 12, color: T.textFaint }}>
                Performance tracking just started — results will appear after first trades.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: T.bg3, borderRadius: 12, overflow: "hidden" }}>
                {[
                  {
                    label: "Win Rate",
                    value: allTimeWinRate !== null ? `${allTimeWinRate.toFixed(1)}%` : "—",
                    sub: (wonAllTime > 0 || lostAllTime > 0) ? `${wonAllTime}W / ${lostAllTime}L` : null,
                    color: allTimeWinRate !== null ? (allTimeWinRate >= 50 ? "#4ade80" : "#f87171") : T.textMuted,
                  },
                  {
                    label: "Picks",
                    value: totalPicks > 0 ? String(totalPicks) : "—",
                    sub: resolvedCount > 0 ? `${resolvedCount} resolved` : pendingCount > 0 ? `${pendingCount} pending` : null,
                    color: T.text,
                  },
                  {
                    label: "Avg Return",
                    value: allTimeAvgReturn !== null ? `${allTimeAvgReturn >= 0 ? "+" : ""}${allTimeAvgReturn.toFixed(1)}%` : "—",
                    sub: null,
                    color: allTimeAvgReturn !== null ? (allTimeAvgReturn >= 0 ? "#4ade80" : "#f87171") : T.textMuted,
                  },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} style={{ background: darkMode ? "rgba(9,12,22,0.90)" : "rgba(0,0,0,0.04)", padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint, marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
                    {sub ? <div style={{ fontSize: 10, color: T.textFaint, marginTop: 5 }}>{sub}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    // ---- RECENT PICKS CARD ----
    const RecentPicksCard = () => {
      if (loadingRecentPicks) return <SkeletonCard title="Recent Picks" />;

      const symTotals = {};
      recentPicksData.forEach(p => {
        const s = normalizeSymbol(p?.symbol || p?.ticker || "");
        if (s) symTotals[s] = (symTotals[s] || 0) + 1;
      });
      const symSeen = {};

      return (
        <div style={{
          background: darkMode ? "linear-gradient(160deg, rgba(10,13,22,0.98) 0%, rgba(13,17,30,0.98) 100%)" : "linear-gradient(160deg, rgba(248,250,252,0.98) 0%, rgba(242,246,250,0.98) 100%)",
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: darkMode ? "0 8px 40px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px 12px",
            borderBottom: `1px solid ${T.border}`,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>Recent Picks</div>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>Last AI trade decisions</div>
            </div>
            {recentPicksData.length > 0 ? (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                background: T.bg3, border: `1px solid ${T.border2}`,
                color: T.textFaint, letterSpacing: "0.04em",
              }}>{recentPicksData.length} picks</span>
            ) : null}
          </div>

          {/* Column labels */}
          {recentPicksData.length > 0 ? (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 60px 72px",
              padding: "7px 18px", gap: 8,
              borderBottom: `1px solid ${T.border}`,
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textGhost }}>Symbol</span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textGhost, textAlign: "right" }}>Return</span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textGhost, textAlign: "right" }}>Outcome</span>
            </div>
          ) : null}

          {/* Rows */}
          <div style={{ overflowY: "auto", maxHeight: 260 }}>
            {errRecentPicks && !recentPicksData.length ? (
              <div style={{ padding: "16px 18px", fontSize: 12, color: T.textFaint }}>{errRecentPicks}</div>
            ) : !recentPicksData.length ? (
              <div style={{ padding: "24px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 22, opacity: 0.08, marginBottom: 8 }}>◎</div>
                <div style={{ fontSize: 12, color: T.textFaint }}>No recent picks available.</div>
              </div>
            ) : recentPicksData.map((pick, i) => {
              const sym = normalizeSymbol(pick?.symbol || pick?.ticker || "");
              symSeen[sym] = (symSeen[sym] || 0) + 1;
              const displaySym = symTotals[sym] > 1 ? `${sym} #${symSeen[sym]}` : sym;
              const ret = Number(pick?.max_return_pct ?? pick?.return_pct ?? pick?.return ?? pick?.pnl_pct);
              const outcome = String(pick?.outcome || pick?.status || "pending").toLowerCase();
              const signals = Array.isArray(pick?.signals) ? pick.signals : Array.isArray(pick?.edge_signals) ? pick.edge_signals : [];
              const pickDate = fmtPickTimestamp(pick);
              const isWin  = outcome === "won" || outcome === "win" || outcome.includes("win");
              const isLoss = outcome === "lost" || outcome === "loss" || outcome.includes("loss") || outcome.includes("lose");
              const isExpired = outcome.includes("expired") || outcome.includes("neutral");
              const isPending = !isWin && !isLoss && !isExpired;
              const isLast = i === recentPicksData.length - 1;
              const isOldPending = isPending && (() => {
                try { const ms = new Date(pick?.recorded_at).getTime(); return !isNaN(ms) && (Date.now() - ms) > 5 * 24 * 60 * 60 * 1000; }
                catch { return false; }
              })();

              const retColor = isWin ? "#4ade80" : isLoss ? "#f87171" : T.textMuted;
              const outcomeBg     = isWin ? "rgba(74,222,128,0.08)" : isLoss ? "rgba(248,113,113,0.08)" : isExpired ? "rgba(251,191,36,0.06)" : T.bg2;
              const outcomeBorder = isWin ? "rgba(74,222,128,0.20)" : isLoss ? "rgba(248,113,113,0.20)" : isExpired ? "rgba(251,191,36,0.18)" : T.border2;
              const outcomeColor  = isWin ? "#4ade80"               : isLoss ? "#f87171"               : isExpired ? "#fbbf24"               : T.textFaint;
              const outcomeLabel  = isWin ? "Won" : isLoss ? "Lost" : isExpired ? "Expired" : "Pending";

              return (
                <div
                  key={`rpick_${i}`}
                  onClick={() => { if (sym) { setSymbol(sym); runAnalyze(sym); setTab("dashboard"); } }}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 60px 72px",
                    gap: 8, alignItems: "center",
                    padding: "11px 18px",
                    borderBottom: isLast ? "none" : `1px solid ${T.border}`,
                    cursor: sym ? "pointer" : "default",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (sym) e.currentTarget.style.background = T.bg2; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Symbol + date + signals */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>
                        {displaySym || "—"}
                      </span>
                      {isOldPending ? <span style={{ fontSize: 11, opacity: 0.45 }} title="Pending — evaluation window may have expired">⏳</span> : null}
                      <span style={{ fontSize: 10, color: T.textGhost }}>{pickDate ?? "—"}</span>
                    </div>
                    {signals.length > 0 ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {signals.slice(0, 3).map((s, j) => (
                          <span key={`sig_${j}`} style={{
                            fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                            background: "rgba(99,179,237,0.07)", border: "1px solid rgba(99,179,237,0.14)",
                            color: "rgba(147,210,255,0.55)", letterSpacing: "0.03em", whiteSpace: "nowrap",
                          }}>{fmt(s)}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Return */}
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: retColor, letterSpacing: "-0.01em" }}>
                      {Number.isFinite(ret) && !isPending ? `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%` : "—"}
                    </span>
                  </div>

                  {/* Outcome badge */}
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.04em", whiteSpace: "nowrap",
                      background: outcomeBg, border: `1px solid ${outcomeBorder}`, color: outcomeColor,
                      minWidth: 48,
                    }}>{outcomeLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    // ---- confidence label helper ----
    const getConfidenceLabel = (conf) => {
      const n = Number(conf);
      if (!Number.isFinite(n)) return null;
      if (n >= 70) return "High Conviction";
      if (n >= 50) return "Moderate";
      return "Low";
    };

    // ---- conviction helper ----
    const getConviction = (a) => {
      if (!a) return "WAIT";
      const ai = Number(a?.aiScore);
      const ex = Number(a?.executionScore);
      if (Number.isFinite(ai) && ai >= 70 && Number.isFinite(ex) && ex >= 65) return "HIGH";
      if (Number.isFinite(ai) && ai >= 50) return "LOW";
      return "NO TRADE";
    };

    // ---- HERO CARD (Best Pick section — ONLY uses bestPickData) ----
    const HeroCard = () => {
      const bestPayload0 = bestPickData && typeof bestPickData === "object" ? bestPickData : null;
      const best0 =
        (bestPayload0?.pick && typeof bestPayload0.pick === "object" ? bestPayload0.pick : null) ||
        (bestPayload0?.best_pick && typeof bestPayload0.best_pick === "object" ? bestPayload0.best_pick : null) ||
        bestPayload0;

      // ticker is ONLY from bestPickData — blocked symbols are treated as no pick
      const _rawTicker = normalizeSymbol(best0?.symbol || best0?.ticker || "");
      const _BLOCKED = new Set(["APPL", "ZVZ", "ZVZZT", "TEST", "FAKE", "DUMMY", "XXXX"]);
      const ticker = _BLOCKED.has(_rawTicker) ? "" : _rawTicker;

      // is_trade / no_trade_reason / trade_decision from best pick only
      const tradeDec = String(
        best0?.trade_decision || bestPayload0?.trade_decision || ""
      ).toUpperCase();
      // LOW_CONVICTION with a real ticker is still a surfaced pick — don't treat as no-trade
      const isNoTrade = (best0?.is_trade === false || bestPayload0?.is_trade === false)
        && tradeDec !== "LOW_CONVICTION";
      const noTradeReason = String(best0?.no_trade_reason || bestPayload0?.no_trade_reason || "").trim();

      // edge_signals and position_size_pct from best pick only
      const edgeSignals = Array.isArray(best0?.edge_signals) ? best0.edge_signals
        : Array.isArray(bestPayload0?.edge_signals) ? bestPayload0.edge_signals : [];
      const positionSizePct = best0?.position_size_pct ?? bestPayload0?.position_size_pct ?? null;

      const marketRegime = String(best0?.market_regime || bestPayload0?.market_regime || "").trim().toUpperCase();

      const isLowConviction = Boolean(best0?.low_conviction || bestPayload0?.low_conviction) || tradeDec === "LOW_CONVICTION";
      const lowConvictionNote = String(best0?.low_conviction_note || bestPayload0?.low_conviction_note || "").trim();

      // Scores — ONLY from bestPickData
      const toScore100 = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return Math.max(0, Math.min(100, n <= 10 ? n * 10 : n));
      };
      const ai100   = toScore100(best0?.ai_score_0_10 ?? best0?.ai_score ?? bestPayload0?.ai_score_0_10);
      const exec100 = toScore100(best0?.execution_score_0_10 ?? best0?.execution_score ?? bestPayload0?.execution_score_0_10);
      const conf100 = toScore100(best0?.confidence_0_10 ?? best0?.confidence ?? bestPayload0?.confidence_0_10 ?? bestPayload0?.confidence);

      // Trade plan — ONLY from bestPickData
      const tp0 = (best0?.trade_plan && typeof best0.trade_plan === "object" ? best0.trade_plan : null)
        || (bestPayload0?.trade_plan && typeof bestPayload0.trade_plan === "object" ? bestPayload0.trade_plan : null);
      const entryN = Number(tp0?.entry ?? best0?.entry);
      const stopN  = Number(tp0?.stop ?? best0?.stop);
      const targets0 = Array.isArray(tp0?.targets) ? tp0.targets.map(Number).filter(n => Number.isFinite(n) && n > 0) : [];
      const target1  = targets0[0] ?? null;
      const target2  = targets0[1] ?? (Number(best0?.target_2) || null);
      const target3  = targets0[2] ?? (Number(best0?.target_3) || null);
      const gainN    = Number(tp0?.gain_pct);
      const rrN      = Number(tp0?.risk_reward);

      // Full execution plan extras from normalized backend fields
      const rrRatio      = Number(best0?.risk_reward_ratio);
      const stopPct      = Number(best0?.stop_loss_pct);
      const t1GainPct    = Number(best0?.target_1_gain_pct);
      const t2GainPct    = Number(best0?.target_2_gain_pct);
      const t3GainPct    = Number(best0?.target_3_gain_pct);
      const horizonLabel = String(best0?.time_horizon_label || "3–7 days");
      const entryNote    = String(best0?.entry_note || "Limit order at entry price");
      const trailingStopPlan = Array.isArray(best0?.trailing_stop_plan) ? best0.trailing_stop_plan : [];
      const pickRationale    = Array.isArray(best0?.pick_rationale) ? best0.pick_rationale : [];
      const riskFlags        = Array.isArray(best0?.risk_flags) ? best0.risk_flags : [];

      // Live price from movers if available
      const moverMatch = ticker ? (Array.isArray(movers) ? movers.find(m => m?.symbol === ticker) : null) : null;
      const livePrice   = moverMatch ? Number(moverMatch?.price) : null;
      const livePctChg  = moverMatch ? Number(moverMatch?.pct_change) : null;

      // Position size estimate
      const posSize = (() => {
        const b = Number(sizeBudget);
        const e = Number.isFinite(entryN) && entryN > 0 ? entryN : null;
        if (!Number.isFinite(b) || b <= 0 || !e) return null;
        return Math.floor(b / e);
      })();

      // Conviction: explicit trade_decision from API takes priority over score thresholds
      const conviction = (() => {
        if (!bestPayload0) return "WAIT";
        if (tradeDec === "LOW_CONVICTION") return "LOW";
        if (tradeDec === "NO_TRADE") return "NO TRADE";
        if (ai100 !== null && ai100 >= 70 && exec100 !== null && exec100 >= 65) return "HIGH";
        if (ai100 !== null && ai100 >= 50) return "LOW";
        if (ai100 !== null) return "NO TRADE";
        return "WAIT";
      })();

      const convStyle = {
        HIGH: {
          color: "#00d462",
          glow: "0 0 20px rgba(0,196,90,0.32), 0 0 40px rgba(0,196,90,0.12)",
          bg: "rgba(0,180,80,0.10)",
          border: "rgba(0,180,80,0.28)",
          label: "HIGH CONVICTION",
          bgKey: "high",
        },
        LOW: {
          color: "#ffca5a",
          glow: "0 0 20px rgba(255,202,90,0.22), 0 0 40px rgba(255,202,90,0.08)",
          bg: "rgba(255,202,90,0.09)",
          border: "rgba(255,202,90,0.22)",
          label: "MODERATE CONVICTION",
          bgKey: "low",
        },
        "NO TRADE": {
          color: "#ff6060",
          glow: "0 0 16px rgba(255,90,90,0.18)",
          bg: "rgba(255,90,90,0.07)",
          border: "rgba(255,90,90,0.18)",
          label: "NO TRADE",
          bgKey: "notrade",
        },
        WAIT: {
          color: T.textFaint,
          glow: "none",
          bg: T.bg2,
          border: T.border,
          label: "AWAITING ANALYSIS",
          bgKey: "wait",
        },
      }[conviction] || {};

      const hasLowOpportunity = Boolean(
        bestPayload0?.error !== null && bestPayload0?.error !== undefined
      );

      // Only show no-trade card when there is genuinely no actionable setup —
      // i.e. no valid symbol OR entry/stop values missing.
      // LOW_CONVICTION with a real ticker falls through to the full pick card below.
      const NO_TRADE_DECISIONS = ["NO_TRADE", "MISSED_ENTRY"];
      const isNoTradeDecision = NO_TRADE_DECISIONS.includes(tradeDec);
      const isLowConvictionWithPick = tradeDec === "LOW_CONVICTION" && Boolean(ticker);
      if ((isNoTrade || (isNoTradeDecision && !isLowConvictionWithPick) || !ticker) && !loadingBestPick) {
        const marketRegime = String(best0?.market_regime || bestPayload0?.market_regime || "").trim().toUpperCase();
        const noTradeEdgeSignals = Array.isArray(best0?.edge_signals) ? best0.edge_signals
          : Array.isArray(bestPayload0?.edge_signals) ? bestPayload0.edge_signals : [];
        const candidateSym = normalizeSymbol(best0?.symbol || "");
        const isTestSymbol = /ZVZ|ZVZZT|TEST/.test(candidateSym);
        const showCandidate = Boolean(candidateSym && !isTestSymbol);
        const rejectionReason = noTradeReason ||
          (tradeDec === "LOW_CONVICTION" ? "Setup quality below conviction threshold" :
           tradeDec === "MISSED_ENTRY"   ? "Pick already moved past calculated entry" :
           tradeDec === "NO_TRADE"       ? "No setups passed all quality gates" :
           (conf100 != null && conf100 < 65 ? "Confidence below threshold" : "Setup did not meet entry criteria"));
        const candidatePrice = (Number.isFinite(livePrice) && livePrice > 0) ? livePrice
          : (Number.isFinite(entryN) && entryN > 0) ? entryN : null;

        const regimeColor = marketRegime === "BULL" ? { fg: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.22)" }
          : marketRegime === "BEAR"  ? { fg: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.22)" }
          : marketRegime             ? { fg: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.22)" }
          : null;

        // Compute "next scan" time — next market open (9:30 ET next trading day)
        const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
        const hoursUntilOpen = (() => {
          const h = nowET.getHours(), m = nowET.getMinutes();
          // If before 9:30 today, hours until 9:30
          if (h < 9 || (h === 9 && m < 30)) return Math.ceil((9 * 60 + 30 - (h * 60 + m)) / 60);
          // After 9:30 — next day 9:30
          return Math.ceil((24 * 60 - (h * 60 + m) + 9 * 60 + 30) / 60);
        })();

        return (
          <div style={{
            background: darkMode ? "linear-gradient(145deg, rgba(10,13,20,0.98) 0%, rgba(12,16,26,0.98) 100%)" : "#ffffff",
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "28px 28px 24px",
            position: "relative",
            overflow: "hidden",
            boxShadow: darkMode ? "0 4px 32px rgba(0,0,0,0.45)" : "0 2px 12px rgba(0,0,0,0.06)",
          }}>
            {/* Subtle grid texture overlay */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.018,
              backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0px, transparent 1px, transparent 28px)",
              backgroundSize: "28px 28px",
            }} />

            {/* ── Header row ────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: T.bg2, border: `1px solid ${T.border2}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, color: T.textGhost, flexShrink: 0,
                }}>⊘</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", color: T.text, lineHeight: 1.2 }}>
                    System Decision: {tradeDec || "NO_TRADE"}
                  </div>
                  <div style={{ fontSize: 12, color: T.textFaint, marginTop: 3, letterSpacing: "0.01em" }}>
                    Watchlist candidate only — Aurexis does not recommend trading this setup
                  </div>
                </div>
              </div>
              {regimeColor ? (
                <motion.div
                  animate={{ opacity: [1, 0.55, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 0 }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 999, flexShrink: 0,
                    background: regimeColor.bg, border: `1px solid ${regimeColor.border}`,
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: regimeColor.fg,
                  }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: regimeColor.fg, display: "inline-block", boxShadow: `0 0 6px ${regimeColor.fg}` }} />
                  {marketRegime}
                </motion.div>
              ) : null}
            </div>

            {/* ── Confidence + reason (dim, no color) ───────── */}
            {(conf100 != null || rejectionReason) ? (
              <div style={{ marginBottom: 16, paddingLeft: 52, display: "flex", flexDirection: "column", gap: 4 }}>
                {conf100 != null ? (
                  <div style={{ fontSize: 12, color: T.textFaint }}>
                    Confidence {conf100}/100 (required ≥ 65)
                  </div>
                ) : null}
                {rejectionReason ? (
                  <div style={{ fontSize: 12, color: T.textGhost }}>
                    {rejectionReason}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* ── Divider ────────────────────────────────────── */}
            <div style={{ height: 1, background: T.bg3, marginBottom: 20 }} />

            {/* ── Top Watchlist Candidate (starter+ only) ────── */}
            {showCandidate ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint, marginBottom: 12 }}>
                  Top Watchlist Candidate
                </div>
                <PlanGate requires="starter" userPlan={userPlan} setTab={setTab}>
                  <div style={{
                    background: "rgba(99,179,237,0.04)", border: "1px solid rgba(99,179,237,0.12)",
                    borderRadius: 12, padding: "16px 18px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: T.text }}>{candidateSym}</span>
                      {candidatePrice != null ? (
                        <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 500 }}>Near ${candidatePrice.toFixed(2)}</span>
                      ) : null}
                      {conf100 != null ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                          background: "rgba(99,179,237,0.10)", border: "1px solid rgba(99,179,237,0.20)",
                          color: "rgba(147,210,255,0.80)", letterSpacing: "0.04em", marginLeft: "auto",
                        }}>AI {conf100}/100</span>
                      ) : null}
                    </div>
                    {noTradeEdgeSignals.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                        {noTradeEdgeSignals.slice(0, 5).map((sig, i) => (
                          <span key={`csig_${i}`} style={{
                            padding: "3px 9px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                            background: "rgba(99,179,237,0.07)", border: "1px solid rgba(99,179,237,0.16)",
                            color: "rgba(147,210,255,0.65)", letterSpacing: "0.03em", whiteSpace: "nowrap",
                          }}>{fmt(sig)}</span>
                        ))}
                      </div>
                    ) : null}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: T.textFaint, fontStyle: "italic" }}>
                        Monitoring for conviction confirmation — no entry signal yet
                      </span>
                    </div>
                  </div>
                </PlanGate>
              </div>
            ) : null}

            {/* ── Edge Signals (only when no candidate card shown) ── */}
            {noTradeEdgeSignals.length > 0 && !showCandidate ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint, marginBottom: 10 }}>
                  Edge Signals Detected
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {noTradeEdgeSignals.slice(0, 6).map((sig, i) => (
                    <span key={`sig_${i}`} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: "rgba(99,179,237,0.07)", border: "1px solid rgba(99,179,237,0.16)",
                      color: "rgba(147,210,255,0.65)", letterSpacing: "0.03em", whiteSpace: "nowrap",
                    }}>{fmt(sig)}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* ── Footer row ─────────────────────────────────── */}
            <div style={{ height: 1, background: T.bg3, marginBottom: 16 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: T.textGhost }}>⏱</span>
                <span style={{ fontSize: 12, color: T.textFaint, letterSpacing: "0.02em" }}>
                  Next scan in <span style={{ color: T.textMuted, fontWeight: 600 }}>{hoursUntilOpen}h</span>
                  {" · "}
                  <span style={{ color: T.textFaint, fontWeight: 600 }}>{etToLocal(9, 30)}</span>
                  <span style={{ color: T.textGhost }}> your time</span>
                  <span style={{ color: T.textGhost }}> · 9:30 AM ET</span>
                </span>
                <span style={{ fontSize: 11, color: T.textGhost, margin: "0 4px" }}>·</span>
                <span style={{ fontSize: 12, color: T.textGhost, fontStyle: "italic" }}>
                  {isNoTrade ? "Next opportunity likely within 1–3 days" : "Use Analyze to evaluate a specific ticker"}
                </span>
              </div>
              {!bestPayload0 ? (
                <RippleButton className="btn btn--primary" style={{ fontSize: 12, padding: "7px 16px" }} onClick={loadBestPick} disabled={loadingBestPick}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    {loadingBestPick ? <span className="btnSpinner" /> : null}
                    <span>{loadingBestPick ? "Scanning…" : "Run Scan"}</span>
                  </span>
                </RippleButton>
              ) : null}
            </div>
          </div>
        );
      }

      // Loading state
      if (loadingBestPick && !ticker) {
        return (
          <div className="card heroCard heroCard--wait">
            <div className="heroBg heroBg--wait" />
            <div className="heroBody">
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
                <span className="btnSpinner" />
                <span className="mutedSmall" style={{ fontSize: 13.5 }}>
                  {loadingAnalyze ? "Analyzing market structure…" : "Scanning for top opportunity…"}
                </span>
              </div>
            </div>
          </div>
        );
      }

      if (!ticker && errBestPick) {
        return (
          <div className="card heroCard heroCard--wait">
            <div className="heroBg heroBg--wait" />
            <div className="heroBody">
              <div style={{ display: "grid", gap: 10, padding: "12px 0" }}>
                <span className="mutedSmall" style={{ fontSize: 13.5 }}>
                  {bestPickTimedOut ? "Scanner timed out — click Refresh to retry" : errBestPick}
                </span>
                <div>
                  <button className="btn btn--ghost" onClick={loadBestPick} disabled={loadingBestPick}>Refresh</button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      const isFreeUser = !canAccess(userPlan, "starter");
      // Gate shows for free users unless they unlocked this session (freePickUsed + bestPickData loaded)
      const showBlurGate = isFreeUser && !(freePickUsed && bestPickData);

      if (bestPickDailyLimit && !canAccess(userPlan, "pro")) {
        return (
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
              <div className="card heroCard heroCard--bull">
                <div className="heroBg heroBg--bull" />
                <div className="heroBody" style={{ minHeight: 220 }} />
              </div>
            </div>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, rgba(7,9,16,0.70) 0%, rgba(7,9,16,0.92) 100%)",
              backdropFilter: "blur(2px)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "32px 24px", gap: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#00b450", textTransform: "uppercase", marginBottom: 4 }}>Daily Limit</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.3 }}>You've used today's pick</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 1.6, maxWidth: 280, marginBottom: 8 }}>
                Starter includes 2 picks per week. Come back next week or upgrade to Pro for unlimited picks.
              </div>
              <button
                onClick={() => setTab("pricing")}
                style={{
                  padding: "12px 32px", borderRadius: 10, cursor: "pointer",
                  fontWeight: 700, fontSize: 14,
                  background: "linear-gradient(90deg, #00b450, #00d462)",
                  color: "#fff", border: "none", boxShadow: "0 4px 20px rgba(0,180,80,0.35)",
                }}
              >
                Upgrade to Pro for unlimited picks →
              </button>
            </div>
          </div>
        );
      }

      const heroCard = (
        <div className={`card heroCard heroCard--${convStyle.bgKey}`}>
          <div className={`heroBg heroBg--${convStyle.bgKey}`} />
          <div className="heroBody">
            <div className="heroTop">
              <div className="heroLeft">
                <div className="aiPickLabel">
                  Today's AI Pick
                  {isLowConviction && (
                    <span style={{
                      display: "inline-block", marginLeft: 10,
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                      padding: "2px 7px", borderRadius: 4,
                      background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.30)",
                      color: "rgba(251,191,36,0.85)", verticalAlign: "middle",
                    }}>MODERATE</span>
                  )}
                </div>
                {false ? null : (
                  <>
                    <div className="heroTicker">{ticker || "—"}</div>
                    <div className="heroPrice">
                      {Number.isFinite(livePrice) && livePrice > 0 ? (
                        <>
                          <span className="heroPriceValue" style={{ fontSize: 22 }}>${livePrice.toFixed(2)}</span>
                          {Number.isFinite(livePctChg) ? (
                            <span className={`heroPriceChange ${livePctChg >= 0 ? "heroChangeUp" : "heroChangeDown"}`}>
                              {livePctChg >= 0 ? "+" : ""}{livePctChg.toFixed(2)}%
                            </span>
                          ) : null}
                        </>
                      ) : Number.isFinite(entryN) && entryN > 0 ? (
                        <span className="heroPriceValue" style={{ opacity: 0.55, fontSize: 16 }}>
                          Near ${entryN.toFixed(2)}
                        </span>
                      ) : null}
                      {loadingAnalyze ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                          <span className="btnSpinner" style={{ width: 10, height: 10 }} />
                        </span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>

              <div className="heroRight">
                {isLowConviction ? (
                  <div
                    className="heroConvictionBadge"
                    style={{
                      color: "rgba(251,191,36,0.9)",
                      boxShadow: "0 0 16px rgba(251,191,36,0.15)",
                      background: "rgba(251,191,36,0.08)",
                      borderColor: "rgba(251,191,36,0.25)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      padding: "6px 14px",
                    }}
                  >
                    MODERATE
                  </div>
                ) : marketRegime ? (
                  <div
                    className="heroConvictionBadge"
                    style={{
                      color: convStyle.color,
                      boxShadow: convStyle.glow,
                      background: convStyle.bg,
                      borderColor: convStyle.border,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      padding: "6px 14px",
                    }}
                  >
                    {marketRegime}
                  </div>
                ) : null}
                {loadingBestPick ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, opacity: 0.5, marginTop: 6 }}>
                    <span className="btnSpinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.3, color: T.textMuted }}>Refreshing</span>
                  </div>
                ) : null}
              </div>
            </div>

            {canAccess(userPlan, "starter") ? (
              <div style={{ marginTop: 8, marginBottom: 4 }}>
                {/* ── Entry + Stop row ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint, marginBottom: 4 }}>Entry</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: T.text, letterSpacing: "-0.02em", marginBottom: 3 }}>
                      {Number.isFinite(entryN) && entryN > 0 ? `$${entryN.toFixed(2)}` : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.4 }}>{entryNote}</div>
                  </div>
                  <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(248,113,113,0.6)", marginBottom: 4 }}>Stop Loss</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(248,113,113,0.9)", letterSpacing: "-0.02em", marginBottom: 3 }}>
                      {Number.isFinite(stopN) && stopN > 0 ? `$${stopN.toFixed(2)}` : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(248,113,113,0.5)" }}>
                      {Number.isFinite(stopPct) && stopPct > 0 ? `${stopPct.toFixed(1)}% below entry — exit here if wrong` : "Exit if thesis breaks"}
                    </div>
                  </div>
                </div>

                {/* ── Targets row ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                  {[
                    { label: "T1 — Take 50%", val: target1, pct: t1GainPct, note: "First profit target", color: "rgba(134,239,172,0.85)", bg: "rgba(134,239,172,0.05)", border: "rgba(134,239,172,0.15)" },
                    { label: "T2 — Take 25%", val: target2, pct: t2GainPct, note: "Let winner run", color: "rgba(52,211,153,0.85)", bg: "rgba(52,211,153,0.05)", border: "rgba(52,211,153,0.15)" },
                    { label: "T3 — Trail rest", val: target3, pct: t3GainPct, note: "Full extension", color: "rgba(16,185,129,0.85)", bg: "rgba(16,185,129,0.05)", border: "rgba(16,185,129,0.15)" },
                  ].map(({ label, val, pct, note, color, bg, border }) => (
                    <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color, marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color, letterSpacing: "-0.02em", marginBottom: 2 }}>
                        {val !== null && Number.isFinite(Number(val)) ? `$${Number(val).toFixed(2)}` : "—"}
                      </div>
                      <div style={{ fontSize: 9, color, opacity: 0.65 }}>
                        {Number.isFinite(pct) && pct > 0 ? `+${pct.toFixed(1)}%` : note}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Stats row: R:R · Size · Horizon ── */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {[
                    { label: "Risk:Reward", val: Number.isFinite(rrRatio) && rrRatio > 0 ? `1 : ${rrRatio.toFixed(1)}` : null },
                    { label: "Position Size", val: positionSizePct !== null ? `${Number(positionSizePct).toFixed(1)}% of portfolio` : null },
                    { label: "Time Horizon", val: horizonLabel },
                  ].filter(x => x.val).map(({ label, val }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: T.textFaint }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: T.text }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* ── Trailing stop plan ── */}
                {trailingStopPlan.length > 0 && (
                  <div style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(251,191,36,0.6)", marginBottom: 8 }}>Trailing Stop Plan</div>
                    {trailingStopPlan.map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i < trailingStopPlan.length - 1 ? 6 : 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(251,191,36,0.75)", minWidth: 36, flexShrink: 0 }}>+{step.trigger_pct}%</span>
                        <span style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.4 }}>{step.action}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Why this trade ── */}
                {pickRationale.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint, marginBottom: 6 }}>Why This Setup</div>
                    {pickRationale.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
                        <span style={{ color: "#00b450", fontSize: 10, marginTop: 2, flexShrink: 0 }}>▸</span>
                        <span style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Risk flags ── */}
                {riskFlags.length > 0 && (
                  <div style={{ background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.10)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(248,113,113,0.55)", marginBottom: 6 }}>Watch Out For</div>
                    {riskFlags.map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 3 }}>
                        <span style={{ color: "rgba(248,113,113,0.6)", fontSize: 10, marginTop: 2, flexShrink: 0 }}>⚠</span>
                        <span style={{ fontSize: 11, color: "rgba(248,113,113,0.7)", lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", margin: "8px 0" }}>
                <div style={{ filter: "blur(5px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    {[["Entry", "$███.██"], ["Stop Loss", "$███.██"]].map(([l, v]) => (
                      <div key={l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 9, color: T.textFaint, marginBottom: 4, textTransform: "uppercase", fontWeight: 800 }}>{l}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {["T1 +█.█%", "T2 +██%", "T3 +██%"].map(v => (
                      <div key={v} style={{ background: "rgba(134,239,172,0.05)", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: "rgba(134,239,172,0.85)" }}>$███</div>
                        <div style={{ fontSize: 9, color: "rgba(134,239,172,0.5)" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "linear-gradient(135deg,rgba(7,11,18,0.7),rgba(7,11,18,0.6))", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#4ade80", letterSpacing: "0.06em", textTransform: "uppercase" }}>Starter · $9/mo</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Unlock full execution plan</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: -2 }}>Entry · Stop · 3 targets · Trailing stop plan</div>
                  <button onClick={() => setTab("pricing")} style={{ marginTop: 6, padding: "8px 20px", borderRadius: 9, background: "#00b450", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Upgrade →</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
              {!isLowConviction && ai100 !== null ? (
                <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.textFaint }}>AI Score</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{Math.round(ai100)}</span>
                </div>
              ) : null}
              {Number.isFinite(rrN) && rrN > 0 ? (
                canAccess(userPlan, "starter") ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.textFaint }}>R/R</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{rrN.toFixed(2)}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 6, alignItems: "baseline", filter: "blur(4px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.textFaint }}>R/R</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>2.4</span>
                  </div>
                )
              ) : null}
              {positionSizePct !== null && Number.isFinite(Number(positionSizePct)) ? (
                <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.textFaint }}>Size</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{Number(positionSizePct).toFixed(1)}%</span>
                </div>
              ) : null}
            </div>

            {edgeSignals.length > 0 ? (
              canAccess(userPlan, "starter") ? (
                <div className="edgeSignals" style={{ marginBottom: 14 }}>
                  {edgeSignals.slice(0, 5).map((sig, i) => (
                    <span key={`edge_${i}`} className="edgeSignalBadge">{fmt(sig)}</span>
                  ))}
                </div>
              ) : (
                <div className="edgeSignals" style={{ marginBottom: 14, filter: "blur(5px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
                  {edgeSignals.slice(0, 5).map((sig, i) => (
                    <span key={`edge_${i}`} className="edgeSignalBadge">{fmt(sig)}</span>
                  ))}
                </div>
              )
            ) : null}

            <div className="heroActions">
              {ticker && tp0 ? (
                <RippleButton
                  className="btn btn--primary"
                  onClick={() => savePickToPortfolioLive({
                    symbol: ticker,
                    source: "best_pick",
                    analysisSnapshot: ensureAnalyzeSchema(bestPayload0, ticker),
                  })}
                  disabled={savingPortfolio || Boolean(savedPortfolioMap?.[`${ticker}:best_pick`])}
                >
                  {savedPortfolioMap?.[`${ticker}:best_pick`] ? "Tracked ✓" : savingPortfolio ? "Saving…" : "Track Pick"}
                </RippleButton>
              ) : null}
              {ticker ? (
                <RippleButton className="btn btn--ghost" onClick={loadBestPick} disabled={loadingBestPick}>
                  {loadingBestPick ? "Refreshing…" : "Refresh"}
                </RippleButton>
              ) : null}
            </div>
            <div className="heroTrustLine">AI scans 1,200+ stocks daily to surface high-conviction setups</div>
          </div>
        </div>
      );

      if (!showBlurGate) return heroCard;

      return (
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ filter: "blur(18px)", opacity: 0.25, pointerEvents: "none", userSelect: "none" }}>
            {heroCard}
          </div>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, rgba(7,9,16,0.70) 0%, rgba(7,9,16,0.92) 100%)",
            backdropFilter: "blur(2px)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "32px 24px", gap: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
              color: "#00b450", textTransform: "uppercase", marginBottom: 4,
            }}>Members Only</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.3 }}>
              Unlock Today's AI Pick
            </div>
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center",
              lineHeight: 1.6, maxWidth: 280, marginBottom: 8,
            }}>
              {freePickUsed
                ? "You've used your free pick for this month. Upgrade to see every daily pick."
                : "Upgrade to Starter for unlimited daily picks, or use your 1 free pick for this month."}
            </div>
            <button
              onClick={() => setTab("pricing")}
              style={{
                padding: "12px 32px", borderRadius: 10, cursor: "pointer",
                fontWeight: 700, fontSize: 14,
                background: "linear-gradient(90deg, #00b450, #00d462)",
                color: "#fff", border: "none", boxShadow: "0 4px 20px rgba(0,180,80,0.35)",
              }}
            >
              Upgrade to Starter →
            </button>
            {!freePickUsed && (
              <button
                onClick={_useFreePick}
                disabled={freePickLoading}
                style={{
                  background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                  color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 500,
                  padding: "8px 20px", cursor: freePickLoading ? "default" : "pointer",
                  opacity: freePickLoading ? 0.6 : 1,
                }}
              >
                {freePickLoading ? "Unlocking…" : "Use my free pick for this month"}
              </button>
            )}
          </div>
        </div>
      );
    };


    // ---- ANALYSIS (merged: Why This Trade + AI Summary + Advanced Metrics) ----
    const AnalysisCard = () => {
      const [activeTab, setActiveTab] = React.useState("why");
      const a = analysisObj;

      // Why This Trade data
      const why      = Array.isArray(a?.why) ? a.why : [];
      const confirms = Array.isArray(a?.what_confirms) ? a.what_confirms : [];
      const breaks   = Array.isArray(a?.what_breaks) ? a.what_breaks : [];
      const trSummary  = a?.summary || a?.whyThisSetup || "";
      const riskNotes = a?.riskNotes || "";
      const execNotes = a?.executionNotes || "";
      const whyHasContent = Boolean(trSummary || why.length || confirms.length || breaks.length || riskNotes || execNotes);

      // AI Summary data
      const ns = (a?.sentiment && typeof a.sentiment === "object" ? a.sentiment : null)
        ?? (a?.news_sentiment && typeof a.news_sentiment === "object" ? a.news_sentiment : null);
      const human = a?.human_explanation && typeof a.human_explanation === "object" ? a.human_explanation : null;
      const direction  = ns?.direction || ns?.bias || "NEUTRAL";
      const nsSummary  = ns?.summary || human?.plain_summary || human?.summary || null;
      const catalysts  = Array.isArray(ns?.catalysts) ? ns.catalysts : [];
      const nsRisks    = Array.isArray(ns?.risk_flags) ? ns.risk_flags : [];
      const dirStyle = (() => {
        const d = String(direction || "").toUpperCase();
        if (d.includes("BULL") || d.includes("POS")) return { cls: "pill pill--good", text: "Bullish" };
        if (d.includes("BEAR") || d.includes("NEG")) return { cls: "pill pill--bad",  text: "Bearish" };
        return { cls: "pill pill--neutral", text: "Neutral" };
      })();
      const summaryHasContent = Boolean(nsSummary || catalysts.length || nsRisks.length);

      // Advanced Metrics data
      const ta = (a?.technicals && typeof a.technicals === "object" ? a.technicals : null)
        ?? (a?.technical_analysis && typeof a.technical_analysis === "object" ? a.technical_analysis : null);

      const taToPct = (raw) => {
        const n0 = Number(raw);
        if (!Number.isFinite(n0)) return null;
        const nAbs = Math.abs(n0);
        let n;
        if (nAbs <= 1) n = n0 * 100;
        else if (nAbs <= 5) n = (n0 / 5) * 100;
        else if (nAbs <= 10) n = n0 * 10;
        else n = n0;
        return Math.max(0, Math.min(100, n));
      };

      const barColor = (v) => {
        if (v === null) return "rgba(255,255,255,0.14)";
        if (v <= 39) return "rgba(239,68,68,0.85)";
        if (v <= 69) return "rgba(250,204,21,0.85)";
        return "rgba(34,197,94,0.85)";
      };

      const ep =
        (a?.executionPlan && typeof a.executionPlan === "object" ? a.executionPlan : null) ??
        (a?.execution_plan && typeof a.execution_plan === "object" ? a.execution_plan : null);
      const bzLow  = ep?.buyZone?.low ?? ep?.buy_zone_low;
      const bzHigh = ep?.buyZone?.high ?? ep?.buy_zone_high;
      const bzText = bzLow != null && bzHigh != null
        ? `$${Number(bzLow).toFixed(2)} – $${Number(bzHigh).toFixed(2)}`
        : "—";

      const _advTp   = a?.trade_plan && typeof a.trade_plan === "object" ? a.trade_plan : {};
      const _advEntry = Number(_advTp?.entry ?? a?.entry ?? bzLow);
      const _advStop  = Number(_advTp?.stop  ?? a?.stop  ?? a?.execution_plan?.stop);
      const _advDir   = String(_advTp?.direction || a?.direction || "long").toLowerCase();
      const _advRawTgts = Array.isArray(_advTp?.targets) ? _advTp.targets
        : a?.targets && !Array.isArray(a.targets) && typeof a.targets === "object"
          ? [a.targets.t1, a.targets.t2, a.targets.t3].filter(v => v != null)
          : Array.isArray(a?.take_profit) ? a.take_profit : [];
      const _advTargets = _advRawTgts.map(Number).filter(v => Number.isFinite(v) && v > 0);
      const _advHasStop = Number.isFinite(_advStop) && _advStop > 0;
      const _advStopBad = _advDir === "long" && _advHasStop && Number.isFinite(_advEntry) && _advEntry > 0 && _advStop > _advEntry;
      const _advStopShortBad = _advDir === "short" && _advHasStop && Number.isFinite(_advEntry) && _advEntry > 0 && _advStop < _advEntry;
      const _advStopInvalid = _advStopBad || _advStopShortBad;
      const _advTargetUnrealistic = _advTargets.length > 0 && Number.isFinite(_advEntry) && _advEntry > 0
        && _advTargets.some(t => Math.abs((t - _advEntry) / _advEntry) > 0.50);
      const _advIsWarn = Boolean(a?.display_warning)
        || ["NO_TRADE", "LOW_CONVICTION", "MISSED_ENTRY"].includes(String(a?.trade_decision || "").toUpperCase());

      const tabs = [
        { id: "why",     label: "Why This Trade" },
        { id: "summary", label: "AI Summary" },
        { id: "metrics", label: "Advanced Metrics" },
      ];

      if (loadingAnalyze) return <SkeletonCard title="Analysis" />;

      return (
        <div style={{
          background: darkMode ? "linear-gradient(160deg, rgba(10,13,22,0.98) 0%, rgba(13,17,30,0.98) 100%)" : "linear-gradient(160deg, rgba(248,250,252,0.98) 0%, rgba(242,246,250,0.98) 100%)",
          border: `1px solid ${_advIsWarn && activeTab === "metrics" ? "rgba(251,113,133,0.25)" : T.border}`,
          borderRadius: 16, overflow: "hidden",
          boxShadow: darkMode
            ? (_advIsWarn && activeTab === "metrics" ? "0 8px 40px rgba(0,0,0,0.5), inset 0 0 0 9999px rgba(251,113,133,0.015)" : "0 8px 40px rgba(0,0,0,0.5)")
            : "0 2px 12px rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column",
          height: "100%",
        }}>
          <div style={{ padding: "14px 18px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>Analysis</div>
              {activeTab === "summary" && summaryHasContent ? <span className={dirStyle.cls}>{dirStyle.text}</span> : null}
            </div>
            <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>Setup reasoning, market context, and technical metrics.</div>
          </div>

          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border2}`, paddingLeft: 20, paddingRight: 20, marginTop: 12 }}>
            {tabs.map(t => {
              const tabLocked = !canAccess(userPlan, "starter") && (t.id === "summary" || t.id === "metrics");
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "8px 14px", fontSize: 12.5,
                    fontWeight: activeTab === t.id ? 700 : 500,
                    color: activeTab === t.id ? T.text : T.textFaint,
                    borderBottom: activeTab === t.id ? `2px solid ${T.textSec}` : "2px solid transparent",
                    marginBottom: "-1px", transition: "color 0.15s ease, border-color 0.15s ease",
                    letterSpacing: "0.02em", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  {t.label}
                  {tabLocked && <span style={{ fontSize: 9, background: "rgba(0,180,80,0.15)", color: "#4ade80", borderRadius: 3, padding: "1px 4px", fontWeight: 700, letterSpacing: "0.04em" }}>STARTER</span>}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, padding: "14px 18px 18px", overflow: "auto", minHeight: 0 }}>
            {activeTab === "why" && (
              !a || !whyHasContent ? (
                <div className="mutedSmall">{analyzeFallbackText}</div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {trSummary ? (
                    <div className="whySection">
                      <div className="whySectionTitle">Summary</div>
                      <p className="whySectionText">{fmt(trSummary)}</p>
                    </div>
                  ) : null}
                  {why.length > 0 ? (
                    <div className="whySection">
                      <div className="whySectionTitle">Setup Signals</div>
                      <ul className="whyList">
                        {why.slice(0, 5).map((x, i) => (
                          <li key={`why_${i}`} className="whyListItem">
                            <span className="whyDot whyDot--good">●</span>
                            <span>{fmt(x)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {confirms.length > 0 ? (
                    <div className="whySection">
                      <div className="whySectionTitle">What Confirms</div>
                      <ul className="whyList">
                        {confirms.slice(0, 4).map((x, i) => (
                          <li key={`conf_${i}`} className="whyListItem">
                            <span className="whyDot whyDot--neutral">◆</span>
                            <span>{fmt(x)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {(breaks.length > 0 || riskNotes) ? (
                    <div className="whySection">
                      <div className="whySectionTitle whySectionTitle--warn">Risk Factors</div>
                      <ul className="whyList">
                        {breaks.slice(0, 4).map((x, i) => (
                          <li key={`break_${i}`} className="whyListItem">
                            <span className="whyDot whyDot--bad">▲</span>
                            <span>{fmt(x)}</span>
                          </li>
                        ))}
                        {!breaks.length && riskNotes ? (
                          <li className="whyListItem">
                            <span className="whyDot whyDot--bad">▲</span>
                            <span>{fmt(riskNotes)}</span>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                  {execNotes ? (
                    <div className="whySection">
                      <div className="whySectionTitle">Execution Notes</div>
                      <p className="whySectionText">{fmt(execNotes)}</p>
                    </div>
                  ) : null}
                </div>
              )
            )}

            {activeTab === "summary" && !canAccess(userPlan, "starter") && (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", minHeight: 200 }}>
                <div style={{ filter: "blur(5px)", opacity: 0.6, pointerEvents: "none", userSelect: "none", padding: "4px 0" }}>
                  <div style={{ padding: "8px 0 6px", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", marginBottom: 6 }}>OVERVIEW</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>Strong institutional accumulation noted across multiple sessions. Analyst upgrades driven by earnings revision momentum and improving forward guidance. Options flow skewing heavily bullish with large call sweeps at key strikes.</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", marginBottom: 6 }}>KEY DRIVERS</div>
                    {["Bullish catalyst in earnings revision cycle", "Institutional accumulation across 3 consecutive sessions", "Short interest declining — covering pressure building", "Analyst upgrade: PT raised from $820 → $950", "Call/Put ratio at 2.4x — unusual bullish flow"].map((txt, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 5 }}>
                        <span style={{ color: "#4ade80", fontSize: 11, marginTop: 1 }}>●</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{txt}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", marginBottom: 6 }}>RISK FLAGS</div>
                    {["Broad market macro headwinds — watch SPY", "Earnings report in 18 days — volatility likely"].map((txt, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 5 }}>
                        <span style={{ color: "#f87171", fontSize: 11, marginTop: 1 }}>▲</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{txt}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 16px 24px", background: "linear-gradient(to bottom, rgba(7,9,16,0) 20%, rgba(7,9,16,0.7) 55%, rgba(7,9,16,0.96) 100%)" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,180,80,0.12)", border: "1px solid rgba(0,180,80,0.25)", borderRadius: 16, padding: "2px 10px", marginBottom: 7 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: "#4ade80", letterSpacing: "0.06em" }}>STARTER · $9/MO</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Unlock AI news & sentiment analysis</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>Catalysts, risk flags, and analyst sentiment — updated on every analysis.</div>
                    <button onClick={() => setTab("pricing")} style={{ padding: "8px 22px", borderRadius: 8, background: "linear-gradient(135deg,#00b450,#15803d)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 18px rgba(0,180,80,0.25)" }}>Upgrade to Starter →</button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "summary" && canAccess(userPlan, "starter") && (
              !a || !summaryHasContent ? (
                <div className="mutedSmall">Sentiment data will appear after analysis.</div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {nsSummary ? (
                    <div className="whySection">
                      <div className="whySectionTitle">Overview</div>
                      <p className="whySectionText">{fmt(nsSummary)}</p>
                    </div>
                  ) : null}
                  {catalysts.length > 0 ? (
                    <div className="whySection">
                      <div className="whySectionTitle">Key Drivers</div>
                      <ul className="whyList">
                        {catalysts.slice(0, 5).map((item, i) => (
                          <li key={`cat_${i}`} className="whyListItem">
                            <span className="whyDot whyDot--good">●</span>
                            <span>{fmt(item)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {nsRisks.length > 0 ? (
                    <div className="whySection">
                      <div className="whySectionTitle whySectionTitle--warn">Risk Flags</div>
                      <ul className="whyList">
                        {nsRisks.slice(0, 4).map((item, i) => (
                          <li key={`risk_${i}`} className="whyListItem">
                            <span className="whyDot whyDot--bad">▲</span>
                            <span>{fmt(item)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )
            )}

            {activeTab === "metrics" && !canAccess(userPlan, "starter") && (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", minHeight: 200 }}>
                <div style={{ filter: "blur(5px)", opacity: 0.6, pointerEvents: "none", userSelect: "none", padding: "4px 0" }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", marginBottom: 8 }}>TECHNICAL SCORES</div>
                    {[["Momentum", 78],["Trend", 71],["Volatility", 55],["Liquidity", 84],["Risk", 38]].map(([lbl, val]) => {
                      const clr = val >= 70 ? "rgba(74,222,128,0.8)" : val >= 40 ? "rgba(251,191,36,0.7)" : "rgba(248,113,113,0.7)";
                      return (
                        <div key={lbl} style={{ display: "grid", gridTemplateColumns: "90px 1fr 28px", gap: 10, alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{lbl}</div>
                          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
                            <div style={{ width: `${val}%`, height: "100%", borderRadius: 3, background: clr }} />
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textAlign: "right" }}>{val}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", marginBottom: 8 }}>EXECUTION PLAN</div>
                    {[["Entry Zone","$868.40 – $874.00"],["Stop Loss","$851.20"],["Target 1","$912.50"],["Target 2","$954.80"],["R/R Ratio","2.4:1"]].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{k}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[["AI SCORE","87","High Conviction"],["EXECUTION","79","Strong Setup"]].map(([lbl,sc,desc]) => (
                      <div key={lbl} style={{ flex: 1, padding: "10px", background: "rgba(0,180,80,0.06)", borderRadius: 9, border: "1px solid rgba(0,180,80,0.12)", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>{lbl}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: "#4ade80" }}>{sc}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 16px 24px", background: "linear-gradient(to bottom, rgba(7,9,16,0) 20%, rgba(7,9,16,0.7) 55%, rgba(7,9,16,0.96) 100%)" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,180,80,0.12)", border: "1px solid rgba(0,180,80,0.25)", borderRadius: 16, padding: "2px 10px", marginBottom: 7 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: "#4ade80", letterSpacing: "0.06em" }}>STARTER · $9/MO</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Unlock technical scores & execution plan</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>Momentum, trend, volatility, R/R ratio, stop loss, and AI score rings.</div>
                    <button onClick={() => setTab("pricing")} style={{ padding: "8px 22px", borderRadius: 8, background: "linear-gradient(135deg,#00b450,#15803d)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 18px rgba(0,180,80,0.25)" }}>Upgrade to Starter →</button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "metrics" && canAccess(userPlan, "starter") && (
              !a ? (
                <div className="mutedSmall">{analyzeFallbackText}</div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {ta ? (
                    <div>
                      <div className="mutedSmall" style={{ fontWeight: 800, marginBottom: 12 }}>Technical Scores</div>
                      <div className="mutedSmall" style={{ fontSize: 11, color: T.textFaint, marginBottom: 10 }}>
                        0–39 weak · 40–69 mixed · 70–100 strong
                      </div>
                      {["momentum", "trend", "volatility", "liquidity", "risk"].map((k) => {
                        const v = taToPct(ta?.[k]);
                        return (
                          <div key={k} style={{ display: "grid", gridTemplateColumns: "100px 1fr 30px", gap: 10, alignItems: "center", marginBottom: 9 }}>
                            <div className="mutedSmall" style={{ fontWeight: 700, textTransform: "capitalize", fontSize: 12 }}>{k}</div>
                            <div style={{ height: 7, borderRadius: 999, background: T.bg3, overflow: "hidden" }}>
                              <div style={{ width: `${v === null ? 0 : v}%`, height: "100%", borderRadius: 999, background: barColor(v), transition: "width 600ms ease" }} />
                            </div>
                            <div className="mutedSmall" style={{ textAlign: "right", fontWeight: 800, fontSize: 11 }}>{v === null ? "—" : Math.round(v)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {(ep || _advHasStop || _advTargets.length > 0) ? (
                    <div>
                      <div className="mutedSmall" style={{ fontWeight: 800, marginBottom: 10 }}>Execution Plan</div>
                      <div className="kv" style={{ marginTop: 0 }}>
                        {ep?.date ? <div className="kvRow"><div className="kvKey">Date</div><div className="kvVal">{fmtAnalyzeValue(ep.date)}</div></div> : null}
                        {ep?.window ? <div className="kvRow"><div className="kvKey">Window</div><div className="kvVal">{fmtAnalyzeValue(ep.window)}</div></div> : null}
                        {bzText !== "—" ? <div className="kvRow"><div className="kvKey">Buy Zone</div><div className="kvVal">{bzText}</div></div> : null}
                        {_advHasStop ? (
                          <div className="kvRow">
                            <div className="kvKey">Stop Loss</div>
                            <div className="kvVal">
                              {_advStopInvalid ? (
                                <span style={{ color: T.textFaint }}>— <span style={{ fontSize: 11, fontStyle: "italic" }}>(invalid)</span></span>
                              ) : (
                                <span style={{ color: "rgba(248,113,113,0.80)" }}>${_advStop.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        ) : null}
                        {_advTargets.length > 0 ? (
                          <div className="kvRow">
                            <div className="kvKey">Targets</div>
                            <div className="kvVal">
                              <span style={{ color: "rgba(74,222,128,0.80)" }}>{_advTargets.map(t => `$${t.toFixed(2)}`).join(", ")}</span>
                              {_advTargetUnrealistic ? <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(251,191,36,0.55)", fontStyle: "italic" }}>(may be unrealistic)</span> : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {a && (Number.isFinite(Number(a?.aiScore)) || Number.isFinite(Number(a?.executionScore))) ? (
                    <div>
                      <div className="mutedSmall" style={{ fontWeight: 800, marginBottom: 10 }}>Score Rings</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <AIScoreRing
                          score={Number.isFinite(Number(a?.aiScore)) ? Number(a.aiScore) : null}
                          confidence={a?.confidence ?? null}
                          loading={false}
                        />
                        <AIScoreRing
                          score={Number.isFinite(Number(a?.executionScore)) ? Number(a.executionScore) : null}
                          label="EXECUTION"
                          size={108}
                          strokeWidth={11}
                          loading={false}
                          showConfidence={false}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            )}
          </div>
        </div>
      );
    };


    const BestPickFromAnalyzeCard = () => {
      if (!analysisObj) return null;
      const bp = analysisObj?.best_pick && typeof analysisObj.best_pick === "object" ? analysisObj.best_pick : null;
      if (!bp) return null;

      const sym = normalizeSymbol(bp?.symbol || "");
      if (!sym) return null;

      const scoreRaw = Number(bp?.score);
      const confRaw = bp?.confidence;
      const score100 = Number.isFinite(scoreRaw) ? (scoreRaw <= 10 ? scoreRaw * 10 : scoreRaw) : null;
      const confNum = Number(confRaw);
      const confText = Number.isFinite(confNum) ? String(confRaw) : fmt(confRaw);

      return (
        <div className="card" style={{ border: `1px solid ${T.borderStrong}` }}>
          <div className="cardHead">
            <div>
              <div className="cardTitle">Best Pick</div>
              <div className="cardSub">Top idea for the analyzed symbol.</div>
            </div>
          </div>
          <div className="cardBody">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 10, minWidth: 240 }}>
                <div className="mutedSmall" style={{ fontWeight: 900, fontSize: 18 }}>{sym}</div>
                <div className="mutedSmall" style={{ fontWeight: 800, opacity: 0.9 }}>
                  <b>Confidence:</b> {confText}
                </div>
              </div>

              {score100 !== null ? (
                <div className="scoreRings">
                  <div className="ring ring--hero">
                    <ScoreRingSvg score100={clamp100(score100)} variant="md" />
                    <div className="ringInner ringInner--hero">
                      <div style={{ display: "grid", placeItems: "center" }}>
                        <div className="ringValue ringValue--hero">{`${(clamp100(score100) / 10).toFixed(1)}/10`}</div>
                        <div className="ringLabel">AI Score</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="dashBoardGrid">
        {showDegradedBanner ? (
          <div className="dashCell dashCell--banner">
            <SystemAlert
              type="warning"
              message="Market data degraded — some analytics may be delayed."
            />
          </div>
        ) : null}

        <motion.div className="dashCell dashCell--hero"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0 }}>
          <HeroCard />
        </motion.div>

        <motion.div className="dashCell dashCell--performance"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}>
          <MarketPulseCard />
        </motion.div>
        <motion.div className="dashCell dashCell--picks"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}>
          <AnalyzeHistoryCard />
        </motion.div>
        <div className="dashCell dashCell--why">
          {analyzeIsLowConviction ? (
            <div className="card lowConvictionCard">
              <div className="cardHead">
                <div>
                  <div className="cardTitle">⚠ Low Conviction — Trade Not Recommended</div>
                  <div className="cardSub">The AI analysis found insufficient edge to recommend a trade.</div>
                </div>
              </div>
              <div className="cardBody">
                <div className="mutedSmall">
                  {normalizeSymbol(analyzeData?.symbol || symbol) || "This symbol"} did not meet the threshold for a high-conviction trade setup.
                  Consider waiting for a stronger setup or analyzing a different symbol.
                </div>
              </div>
            </div>
          ) : (
            <ProGate enabled={gatePro} onUpgrade={() => setTab("pricing")}>
              <AnalysisCard />
            </ProGate>
          )}
        </div>

        <div className="dashCell dashCell--summary"><TopMoversCard /></div>
      </div>
    );
  };


  const MarketIntelligence = () => {
    return null;
  };


  const Portfolio = () => {
    const [positions, setPositions] = useState([]);
    const [openOrders, setOpenOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [cancellingOrderId, setCancellingOrderId] = useState(null);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [trackedOpen, setTrackedOpen] = useState(false);

    async function loadPortfolio() {
      setLoading(true);
      setFetchError(false);
      try {
        const controller = new AbortController();
        const t = window.setTimeout(() => controller.abort(), 12000);
        let res;
        try {
          res = await fetch(`${API_BASE_URL}/portfolio`, { signal: controller.signal });
        } finally {
          window.clearTimeout(t);
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const nextPositions = Array.isArray(data?.positions)
          ? data.positions
          : Array.isArray(data?.items)
            ? data.items
            : [];

        const items = nextPositions
          .map((p0) => (p0 && typeof p0 === "object" ? p0 : null))
          .filter(Boolean);

        setPositions(items);

        // Fetch open orders from Alpaca
        try {
          const ordersController = new AbortController();
          const ot = window.setTimeout(() => ordersController.abort(), 8000);
          let ordersRes;
          try {
            ordersRes = await fetch(`${API_BASE_URL}/orders`, { signal: ordersController.signal });
          } finally {
            window.clearTimeout(ot);
          }
          if (ordersRes.ok) {
            const ordersData = await ordersRes.json();
            const orders = Array.isArray(ordersData?.orders)
              ? ordersData.orders
              : Array.isArray(ordersData?.items)
                ? ordersData.items
                : Array.isArray(ordersData)
                  ? ordersData
                  : [];
            setOpenOrders(orders.filter(Boolean));
          }
        } catch {
          setOpenOrders([]);
        }
      } catch (e) {
        console.error("Portfolio fetch failed:", e);
        setPositions([]);
        setOpenOrders([]);
        setFetchError(true);
      } finally {
        setLoading(false);
        setLastUpdatedAt(Date.now());
      }
    }

    useEffect(() => {
      loadPortfolio();
      safeLoad(loadAccount);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Use account state from outer scope for real account data
    const accountValue = account?.account_value ?? account?.equity;
    const cash = account?.cash;

    const cancelOrder = async (orderId) => {
      if (!orderId) return;
      setCancellingOrderId(orderId);
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" });
        if (res.ok) {
          showToast("Order cancelled");
          setOpenOrders((prev) => prev.filter((o) => (o?.id ?? o?.order_id ?? o?.client_order_id) !== orderId));
        } else {
          showToast("Failed to cancel order");
        }
      } catch {
        showToast("Failed to cancel order");
      } finally {
        setCancellingOrderId(null);
      }
    };

    const closePosition = async (sym) => {
      const s = normalizeSymbol(sym);
      if (!s) return;
      try {
        await safeApiCall(() => apiRemovePortfolio(s), { onToast: showLiveDataToast, context: "portfolio_remove" });
        showToast("Closed");
        await loadPortfolioLive();
        await loadAccount();
      } catch (e) {
        showToast(friendlyError(e, "portfolio") || "Could not close");
      }
    };

    const analyzePosition = async (sym) => {
      const s = normalizeSymbol(sym);
      if (!s) return;
      setAnalyzeModalSymbol(s);
      await runAnalyze(s);
    };

    const PortfolioTable = ({ positions: tablePositions, orders: tableOrders }) => {

      const realPositions = (tablePositions ?? []).filter(
        (p) => Number(p?.shares ?? p?.qty ?? p?.quantity ?? 0) !== 0 ||
               Number(p?.avg_price ?? p?.avg_entry ?? p?.avg_entry_price ?? p?.entry_price ?? 0) !== 0
      );
      const trackedSymbols = (tablePositions ?? []).filter(
        (p) => Number(p?.shares ?? p?.qty ?? p?.quantity ?? 0) === 0 &&
               Number(p?.avg_price ?? p?.avg_entry ?? p?.avg_entry_price ?? p?.entry_price ?? 0) === 0
      );
      const hasMainContent = realPositions.length > 0 || (tableOrders ?? []).length > 0;

      const renderRow = (pos, i) => {
        const sym = normalizeSymbol(pos?.symbol || pos?.ticker);
        const entry = pos?.avg_entry ?? pos?.avg_entry_price ?? pos?.entry ?? pos?.entry_price ?? null;
        const current = pos?.current_price ?? pos?.current ?? pos?.price ?? (sym ? portfolioPriceMapLive?.[sym] : undefined) ?? null;
        const computedPnlPct =
          Number.isFinite(Number(entry)) && Number.isFinite(Number(current)) && Number(entry) !== 0
            ? (Number(current) - Number(entry)) / Number(entry)
            : null;
        const pnlPct =
          pos?.pnl_pct ??
          pos?.pl_pct ??
          pos?.unrealized_pnl_pct ??
          pos?.unrealizedPlPct ??
          computedPnlPct ??
          null;
        const decision =
          pos?.decision ??
          pos?.ai_decision ??
          pos?.signal ??
          pos?.side ??
          pos?.recommendation ??
          null;
        const decisionText = String(decision || "").trim().toUpperCase();
        const decisionCls =
          decisionText.includes("BUY") || decisionText.includes("LONG")
            ? "pill pill--good"
            : decisionText.includes("SELL") || decisionText.includes("SHORT")
              ? "pill pill--bad"
              : "pill pill--neutral";
        const stop = pos?.stop ?? pos?.stop_loss ?? pos?.stopLoss ?? null;
        const target =
          pos?.target ??
          pos?.take_profit ??
          pos?.takeProfit ??
          (Array.isArray(pos?.targets) ? pos.targets[0] : null) ??
          null;

        return (
          <tr key={`${sym || "pos"}_${i}`}>
            <td><b>{sym || "—"}</b></td>
            <td>{entry === null || entry === undefined ? "—" : money(entry)}</td>
            <td>{current === null || current === undefined ? "—" : money(current)}</td>
            <td className={Number(pnlPct) > 0 ? "goodTxt" : Number(pnlPct) < 0 ? "badTxt" : ""}>{pnlPct === null || pnlPct === undefined ? "—" : pct(Number(pnlPct) * (Math.abs(Number(pnlPct)) <= 1 ? 100 : 1))}</td>
            <td>{stop === null || stop === undefined ? "—" : money(stop)}</td>
            <td>{target === null || target === undefined ? "—" : money(target)}</td>
            <td>
              <span className={decisionText ? decisionCls : "pill pill--neutral"}>
                {decisionText || "—"}
              </span>
            </td>
            <td></td>
          </tr>
        );
      };

      const renderOrderRow = (order, i) => {
        const sym = normalizeSymbol(order?.symbol);
        const orderId = order?.id ?? order?.order_id ?? order?.client_order_id;
        const side = String(order?.side || "").toUpperCase();
        const status = String(order?.status || "pending").toUpperCase();
        const limitPrice = order?.limit_price ?? order?.price ?? null;
        const current = (sym ? portfolioPriceMapLive?.[sym] : undefined) ?? null;
        const sideCls = side === "BUY" ? "pill pill--good" : side === "SELL" ? "pill pill--bad" : "pill pill--neutral";
        const isCancelling = cancellingOrderId === orderId;
        return (
          <tr key={`order_${orderId || i}`}>
            <td><b>{sym || "—"}</b></td>
            <td>{limitPrice === null ? "—" : money(limitPrice)}</td>
            <td>{current === null ? "—" : money(current)}</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>
              <span className={sideCls}>{side || "ORDER"}</span>
              {" "}<span className="pill pill--neutral" style={{ fontSize: 10 }}>{status}</span>
            </td>
            <td>
              {orderId ? (
                <button
                  className="btn btn--ghost"
                  style={{ fontSize: 11, padding: "3px 10px", color: "rgba(255,80,80,0.8)", borderColor: "rgba(255,80,80,0.25)" }}
                  onClick={() => cancelOrder(orderId)}
                  disabled={isCancelling}
                >
                  {isCancelling ? "…" : "Cancel"}
                </button>
              ) : null}
            </td>
          </tr>
        );
      };

      return (
        <>
          {hasMainContent && (
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Entry</th>
                  <th>Current</th>
                  <th>P&L</th>
                  <th>Stop</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {realPositions.map((pos, i) => renderRow(pos, i))}
                {(tableOrders ?? []).map((order, i) => renderOrderRow(order, i))}
              </tbody>
            </table>
          )}

          {trackedSymbols.length > 0 && (
            <div className="trackedSymbolsSection">
              <button
                className="trackedSymbolsToggle"
                onClick={() => setTrackedOpen((o) => !o)}
              >
                <span>{trackedOpen ? "▾" : "▸"}</span>
                <span>Tracked Symbols</span>
                <span className="trackedSymbolsCount">{trackedSymbols.length}</span>
              </button>
              {trackedOpen && (
                <table className="table trackedSymbolsTable">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Current</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedSymbols.map((pos, i) => {
                      const sym = normalizeSymbol(pos?.symbol || pos?.ticker);
                      const current = pos?.current_price ?? pos?.current ?? pos?.price ?? (sym ? portfolioPriceMapLive?.[sym] : undefined) ?? null;
                      return (
                        <tr key={`tracked_${sym || i}`} className="trackedSymbolRow">
                          <td><b>{sym || "—"}</b></td>
                          <td>{current === null || current === undefined ? "—" : money(current)}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="btn btn--ghost trackedRemoveBtn"
                              onClick={() => closePosition(sym)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      );
    };

    return (
      <div className="pageGrid">
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">Portfolio</div>
              <div className="cardSub">Your open positions.</div>
            </div>
            <div className="cardRight">
              <div className="mutedSmall" style={{ fontSize: 11 }}>{`Last updated: ${lastUpdatedAt ? fmtTime(lastUpdatedAt) : "—"}`}</div>
              <button className="btn btn--ghost" onClick={loadPortfolio} disabled={loading}>
                Refresh Portfolio
              </button>
            </div>
          </div>

          <div className="cardBody">
            {errPortfolio ? <div className="monoBox monoBox--bad" style={{ marginBottom: 12 }}>{errPortfolio}</div> : null}

            {!loading && (positions.length > 0 || openOrders.length > 0 || accountValue !== null || cash !== null) ? (
              <div className="stats3" style={{ marginBottom: 14 }}>
                <div className="stat">
                  <div className="statLabel">Account value</div>
                  <div className="statValue">{accountValue !== null && accountValue !== undefined ? money(accountValue) : "—"}</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Cash</div>
                  <div className="statValue">{cash !== null && cash !== undefined ? money(cash) : "—"}</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Positions</div>
                  <div className="statValue">{positions.length ? String(positions.length) : "0"}</div>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0" }}>
                <span className="btnSpinner" />
                <span className="mutedSmall">Loading portfolio…</span>
              </div>
            ) : positions.length === 0 && openOrders.length === 0 ? (
              <div className="premiumEmptyState">
                <span className="premiumEmptyIcon">◎</span>
                <div className="premiumEmptyTitle">No open positions</div>
                <div className="premiumEmptySub">
                  {fetchError
                    ? "Could not load portfolio data. Check your connection and try refreshing."
                    : "Analyze a stock and save it to start tracking your trades and performance here."}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
                  {fetchError
                    ? <button className="btn btn--ghost" onClick={loadPortfolio}>Retry</button>
                    : <button className="btn btn--primary" onClick={goToAnalyzeFlow}>Analyze a Stock</button>}
                </div>
              </div>
            ) : (
              <PortfolioTable positions={positions} orders={openOrders} />
            )}
          </div>
        </div>
      </div>
    );
  };


  class PortfolioErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error, info) {
      console.error("Portfolio render error:", error, info);
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="pageGrid">
            <div className="card">
              <div className="cardHead">
                <div>
                  <div className="cardTitle">Portfolio</div>
                  <div className="cardSub">Your positions and performance.</div>
                </div>
              </div>
              <div className="cardBody">
                <div className="premiumEmptyState">
                  <span className="premiumEmptyIcon">◎</span>
                  <div className="premiumEmptyTitle">Nothing to show yet</div>
                  <div className="premiumEmptySub">
                    Analyze a stock and save it to your portfolio to start tracking performance.
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <button className="btn btn--ghost" onClick={() => this.setState({ hasError: false })}>
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }


  const Movers = () => {
    const [sort, setSort] = useState({ key: "pct_change", dir: "desc" });

    const sorted = useMemo(() => {
      const rows = (Array.isArray(movers) ? movers : []).filter((m) => {
        const price = Number(m?.price ?? m?.last_price ?? m?.last);
        const vol = m?.volume;
        const volume = vol != null ? Number(vol) : null;
        return Number.isFinite(price) && price >= 1 && (volume === null || volume === 0 || volume >= 10000);
      });
      const key = String(sort?.key || "");
      const dir = sort?.dir === "asc" ? 1 : -1;

      const num = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      rows.sort((a, b) => {
        if (key === "symbol") {
          const as = String(a?.symbol || "");
          const bs = String(b?.symbol || "");
          return as.localeCompare(bs) * dir;
        }
        const av = num(a?.[key]);
        const bv = num(b?.[key]);
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return (av - bv) * dir;
      });
      return rows;
    }, [movers, sort]);

    const onSort = (key) => {
      setSort((prev) => {
        const k = String(key || "");
        const same = prev?.key === k;
        const nextDir = same ? (prev?.dir === "asc" ? "desc" : "asc") : "desc";
        return { key: k, dir: nextDir };
      });
    };

    const thStyle = { cursor: "pointer", userSelect: "none" };

    return (
    <div className="pageGrid">
      <div className="card">
        <div className="cardHead">
          <div>
            <div className="cardTitle">Top Movers</div>
            <div className="cardSub">Market leaders by momentum — click any row to analyze.</div>
          </div>
          <div className="cardRight">
            {loadingMovers ? <span className="btnSpinner" /> : null}
            <button className="btn btn--ghost" onClick={loadMovers} disabled={loadingMovers}>
              {loadingMovers ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>


        <div className="cardBody">
          {Array.isArray(movers) && movers.some((m) => String(m?.data_status || m?.dataStatus || "").toLowerCase() === "auth_error") ? (
            <SystemAlert type="warning" message="Market data unavailable — check Alpaca keys." />
          ) : null}
          {moversFailure ? (
            <SystemAlert type="warning" message="Top movers unavailable — refresh." />
          ) : null}
          {errMovers ? (
            <div className="monoBox monoBox--bad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span>Unable to load movers</span>
              <button className="btn btn--ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={loadMovers}>Retry</button>
            </div>
          ) : sorted?.length ? (
            (() => {
              const FREE_MOVERS_LIMIT = 5;
              const isFreeUser = !canAccess(userPlan, "starter");
              const visibleMovers = isFreeUser ? sorted.slice(0, FREE_MOVERS_LIMIT) : sorted;
              const hiddenCount = isFreeUser ? Math.max(0, sorted.length - FREE_MOVERS_LIMIT) : 0;

              const renderRow = (m) => {
                const status = String(m?.data_status ?? m?.dataStatus ?? "").toLowerCase();
                const isAuthError = status === "auth_error";
                const lastValRaw = m?.price ?? m?.last_price ?? m?.lastPrice ?? m?.last;
                const lastVal = isAuthError ? null : lastValRaw;
                const priorClose = m?.prior_close ?? m?.priorClose ?? m?.prev_close ?? m?.prevClose;
                const chgValRaw = m?.pct_change ?? m?.change_percent ?? m?.pctChange ?? m?.change_pct ?? m?.changePct;
                const chgVal0 = isAuthError ? null : chgValRaw;
                const chgVal = Number(chgVal0) === 0 && Number.isFinite(Number(priorClose)) && Number.isFinite(Number(lastVal)) && Number(priorClose) !== 0
                  ? ((Number(lastVal) - Number(priorClose)) / Number(priorClose)) * 100
                  : chgVal0;
                const volValRaw = m?.volume;
                const volVal = isAuthError ? null : volValRaw;
                const chg = fmtSignedPct(chgVal);
                return (
                  <tr
                    key={m.symbol}
                    className="rowClickable"
                    onClick={() => onSelectMover(m.symbol)}
                    title="Click to load"
                  >
                    <td><b style={{ fontSize: 13.5 }}>{m?.symbol ?? "—"}</b></td>
                    <td>{lastVal === null || lastVal === undefined || !Number.isFinite(Number(lastVal)) || Number(lastVal) <= 0 ? "—" : money(lastVal)}</td>
                    <td className={chg.cls} style={{ fontWeight: 800 }}>{chg.text}</td>
                    <td>{volVal === null || volVal === undefined || !Number.isFinite(Number(volVal)) || Number(volVal) <= 0 ? "—" : fmtVol(volVal)}</td>
                  </tr>
                );
              };

              return (
                <div style={{ position: "relative" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={thStyle} onClick={() => onSort("symbol")}>Symbol</th>
                        <th style={thStyle} onClick={() => onSort("price")}>Last</th>
                        <th style={thStyle} onClick={() => onSort("pct_change")}>% Change</th>
                        <th style={thStyle} onClick={() => onSort("volume")}>Volume</th>
                      </tr>
                    </thead>
                    <tbody style={loadingMovers ? { opacity: 0.65 } : undefined}>
                      {visibleMovers.map(renderRow)}
                    </tbody>
                  </table>
                  {isFreeUser && hiddenCount > 0 && (
                    <div style={{ position: "relative", marginTop: -2, minHeight: "calc(100vh - 340px)" }}>
                      {/* All hidden rows blurred — fills remaining screen space */}
                      <div style={{
                        filter: "blur(8px)", opacity: 0.35, pointerEvents: "none", userSelect: "none",
                      }}>
                        <table className="table" style={{ marginTop: 0 }}>
                          <tbody>
                            {sorted.slice(FREE_MOVERS_LIMIT).map(renderRow)}
                          </tbody>
                        </table>
                      </div>
                      {/* Gradient overlay — covers from top so even first hidden row is mostly hidden */}
                      <div style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        background: "linear-gradient(to bottom, rgba(7,9,15,0.55) 0%, rgba(7,9,15,0.85) 40%, rgba(7,9,15,0.99) 70%)",
                      }} />
                      {/* CTA card */}
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "flex-end", justifyContent: "center",
                        padding: "0 16px 32px",
                      }}>
                        <div style={{
                          width: "100%", maxWidth: 380,
                          background: "rgba(12,16,28,0.72)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14, padding: "16px 18px",
                          backdropFilter: "blur(20px)",
                          boxShadow: "0 6px 32px rgba(0,0,0,0.50), 0 0 0 1px rgba(0,180,80,0.05)",
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em", marginBottom: 3 }}>
                              {hiddenCount} more movers
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
                              Full list unlocked on Starter · $9/mo
                            </div>
                          </div>
                          <button onClick={() => setTab("pricing")} style={{
                            flexShrink: 0, padding: "9px 18px", borderRadius: 9, cursor: "pointer",
                            background: "linear-gradient(135deg,#00c853,#15803d)", color: "#fff",
                            border: "none", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                            boxShadow: "0 0 18px rgba(0,180,80,0.28)",
                          }}>Upgrade →</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="mutedSmall">No liquid movers available (UI filter: price ≥ $1 and volume ≥ 10k).</div>
          )}
        </div>
      </div>
    </div>
    );
  };




  const Watchlist = () => {
    const AI_SCORE_THRESHOLD = 7.0;

    const [systemCandidates, setSystemCandidates] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [candidatesError, setCandidatesError] = useState("");

    async function loadSystemCandidates() {
      setLoadingCandidates(true);
      setCandidatesError("");
      try {
        const controller = new AbortController();
        const t = window.setTimeout(() => controller.abort(), 90000);
        const _tok = localStorage.getItem("aurexis_token");
        const res = await fetch(`${API_BASE_URL}/best_pick_v2?allow_llm_news=false`, {
          signal: controller.signal,
          headers: _tok ? { Authorization: `Bearer ${_tok}` } : {},
        });
        window.clearTimeout(t);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        const payload = raw && typeof raw === "object" ? raw : null;
        const data =
          (payload?.data && typeof payload.data === "object" ? payload.data : null) ||
          (payload?.result && typeof payload.result === "object" ? payload.result : null) ||
          (payload?.payload && typeof payload.payload === "object" ? payload.payload : null) ||
          payload;

        let candidateArr =
          (Array.isArray(data?.candidates) ? data.candidates : null) ||
          (Array.isArray(data?.close_candidates) ? data.close_candidates : null) ||
          (Array.isArray(data?.runners_up) ? data.runners_up : null) ||
          (Array.isArray(data?.watchlist_candidates) ? data.watchlist_candidates : null) ||
          (Array.isArray(data?.near_picks) ? data.near_picks : null) ||
          (Array.isArray(data?.all_candidates) ? data.all_candidates : null) ||
          (Array.isArray(data?.ranked_candidates) ? data.ranked_candidates : null) ||
          (Array.isArray(raw?.candidates) ? raw.candidates : null) ||
          (Array.isArray(raw?.watchlist_candidates) ? raw.watchlist_candidates : null) ||
          [];

        if (candidateArr.length === 0) {
          const bp =
            (data?.best_pick && typeof data.best_pick === "object" ? data.best_pick : null) ||
            (data?.pick && typeof data.pick === "object" ? data.pick : null) ||
            null;
          const sym = normalizeSymbol(bp?.symbol || bp?.ticker || data?.symbol || data?.ticker || "");
          if (sym && (bp?.is_trade === false || data?.is_trade === false || bp?.no_trade_reason || data?.no_trade_reason)) {
            candidateArr = [bp || data];
          }
        }

        const normalize10 = (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return null;
          if (n <= 1) return Math.round(n * 100) / 10;
          if (n <= 10) return Math.round(n * 10) / 10;
          return Math.round(n) / 10;
        };

        const processed = candidateArr
          .filter((c) => c && typeof c === "object")
          .map((c) => {
            const sym = normalizeSymbol(c?.symbol || c?.ticker || "");
            if (!sym || /ZVZ|ZVZZT|TEST/.test(sym)) return null;
            const rawScore =
              c?.final_score ?? c?.ai_score_0_10 ?? c?.ai_score ?? c?.score_0_10 ?? c?.score ??
              c?.premover ?? c?.confidence_0_10 ?? c?.confidence ?? c?.technical_score ?? null;
            const score = rawScore !== null ? normalize10(rawScore) : null;
            const edgeSignals = Array.isArray(c?.edge_signals) ? c.edge_signals : [];
            const noTradeReason = String(c?.no_trade_reason || c?.rejection_reason || "").trim();
            return { symbol: sym, score, edgeSignals, noTradeReason };
          })
          .filter(Boolean)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        setSystemCandidates(processed);
      } catch (e) {
        console.error("System watchlist candidates load failed:", e);
        setCandidatesError("Could not load system candidates — click refresh to retry");
      } finally {
        setLoadingCandidates(false);
      }
    }

    useEffect(() => {
      loadSystemCandidates();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── System Candidate Card ─────────────────────────────────────
    const CandidateCard = ({ candidate }) => {
      const { symbol: sym, score, edgeSignals, noTradeReason } = candidate;
      const progress = score !== null ? Math.min(100, Math.round((score / AI_SCORE_THRESHOLD) * 100)) : null;
      const progressColor =
        progress === null ? "rgba(255,255,255,0.12)" :
        progress >= 90 ? "rgba(74,222,128,0.65)" :
        progress >= 72 ? "rgba(251,191,36,0.65)" :
        "rgba(147,197,253,0.50)";

      const signalText = edgeSignals.length > 0
        ? edgeSignals.slice(0, 3).map((s) => fmt(s)).join(" · ")
        : noTradeReason || "Edge signals detected";

      return (
        <div style={{
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "16px 18px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: T.text, lineHeight: 1 }}>
              {sym}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
              padding: "4px 9px", borderRadius: 999,
              background: "rgba(147,197,253,0.07)", border: "1px solid rgba(147,197,253,0.16)",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(147,197,253,0.70)",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(147,197,253,0.55)", display: "inline-block" }} />
              WATCHING FOR BREAKOUT
            </div>
          </div>

          <div style={{ fontSize: 12, color: T.textFaint, marginBottom: 14, lineHeight: 1.5 }}>
            <span style={{ color: T.textGhost, fontSize: 11 }}>Edge signals: </span>
            <span style={{ color: "rgba(147,210,255,0.62)" }}>{signalText}</span>
          </div>

          {score !== null ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: T.textGhost, letterSpacing: "0.02em" }}>Conviction progress</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.textSec, letterSpacing: "-0.01em" }}>
                  Score: {score.toFixed(1)} / {AI_SCORE_THRESHOLD.toFixed(1)} needed
                </span>
              </div>
              <div style={{ height: 5, background: T.bg3, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: progressColor, borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>
              <div style={{ fontSize: 10, color: T.textGhost, marginTop: 4 }}>{progress}% of threshold</div>
            </div>
          ) : (
            <div style={{ marginBottom: 14, fontSize: 12, color: T.textGhost }}>Score pending scan</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setSymbol(sym); setTab("dashboard"); runAnalyze(sym); }}
              style={{
                padding: "6px 14px", borderRadius: 7,
                background: T.bg3, border: `1px solid ${T.border2}`,
                color: T.textSec, fontSize: 11, fontWeight: 600,
                cursor: "pointer", letterSpacing: "0.03em",
              }}
            >Analyze →</button>
            <button
              onClick={() => addToWatchlistLive(sym)}
              disabled={addingWatchlist}
              style={{
                padding: "6px 14px", borderRadius: 7,
                background: "transparent", border: `1px solid ${T.border}`,
                color: T.textFaint, fontSize: 11, fontWeight: 600,
                cursor: "pointer", letterSpacing: "0.03em",
              }}
            >+ Watch</button>
          </div>
        </div>
      );
    };

    return (
      <div className="pageGrid">

        {/* ── System Watchlist Section ─────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "20px 22px 18px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: "-0.015em", lineHeight: 1.3 }}>
                  System Watchlist — Stocks Building Momentum
                </div>
                <div style={{ fontSize: 12, color: T.textFaint, marginTop: 5, lineHeight: 1.5 }}>
                  These setups are close but haven't cleared our conviction threshold yet
                </div>
              </div>
              <button
                onClick={loadSystemCandidates}
                disabled={loadingCandidates}
                style={{
                  background: "none", border: "none",
                  color: T.textGhost, fontSize: 12,
                  cursor: "pointer", padding: "4px 0", flexShrink: 0,
                }}
              >
                {loadingCandidates ? "Scanning…" : "Refresh"}
              </button>
            </div>
          </div>
          <div style={{ height: 1, background: T.bg3 }} />

          {/* Body */}
          {loadingCandidates ? (
            <div style={{ padding: "36px 22px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span className="btnSpinner" style={{ width: 14, height: 14, borderWidth: 2, display: "inline-block" }} />
                <span style={{ fontSize: 13, color: T.textFaint }}>Scanning market for close candidates…</span>
              </div>
            </div>
          ) : candidatesError ? (
            <div style={{ padding: "28px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "rgba(248,113,113,0.55)", marginBottom: 12 }}>{candidatesError}</div>
              <button
                onClick={loadSystemCandidates}
                style={{
                  padding: "7px 18px", borderRadius: 8,
                  background: T.bg2, border: `1px solid ${T.border2}`,
                  color: T.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                Retry scan
              </button>
            </div>
          ) : systemCandidates.length === 0 ? (
            <div style={{ padding: "40px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 24, opacity: 0.10, marginBottom: 14 }}>◈</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.textFaint, marginBottom: 6 }}>
                No close candidates right now
              </div>
              <div style={{ fontSize: 12, color: T.textGhost, maxWidth: 260, margin: "0 auto" }}>
                The system will populate this list when stocks build enough momentum to be near-threshold.
              </div>
            </div>
          ) : (
            <div style={{ padding: "16px", display: "grid", gap: 10 }}>
              {systemCandidates.map((candidate) => (
                <CandidateCard key={candidate.symbol} candidate={candidate} />
              ))}
            </div>
          )}
        </div>

      </div>
    );
  };


  
  const Screener = () => {
    const results = screenerResults;
    const setResults = setScreenerResults;
    const loading = screenerLoading;
    const setLoading = setScreenerLoading;
    const hasScreened = screenerHasRun;
    const setHasScreened = setScreenerHasRun;
    const sortCol = screenerSortCol;
    const setSortCol = setScreenerSortCol;
    const sortDir = screenerSortDir;
    const setSortDir = setScreenerSortDir;

    const unwrapAnalysis = (raw) => {
      if (!raw || typeof raw !== "object") return null;
      return (
        (raw.analysis && typeof raw.analysis === "object" ? raw.analysis : null) ||
        (raw.data && typeof raw.data === "object" ? raw.data : null) ||
        (raw.result && typeof raw.result === "object" ? raw.result : null) ||
        raw
      );
    };

    const toScore100 = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return null;
      if (n <= 1) return Math.round(n * 100);
      if (n <= 10) return Math.round(n * 10);
      return Math.round(Math.min(100, n));
    };

    const toConf10 = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return null;
      return parseFloat((n > 10 ? n / 10 : n).toFixed(1));
    };

    const extractDir = (d) => {
      const raw = String(
        d?.decision?.direction || d?.trade_plan?.direction ||
        d?.direction || d?.bias ||
        d?.sentiment?.direction || d?.news_sentiment?.direction || ""
      ).toUpperCase();
      if (raw.includes("BULL") || raw.includes("LONG") || raw.includes("BUY")) return "BULLISH";
      if (raw.includes("BEAR") || raw.includes("SHORT") || raw.includes("SELL")) return "BEARISH";
      return "NEUTRAL";
    };

    const screenOne = async (sym) => {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 30000);
      try {
        const _tok = localStorage.getItem("aurexis_token");
        const res = await fetch(
          `${API_BASE_URL}/analyze/${encodeURIComponent(sym)}?budget=1000&risk=medium&timeframe=swing`,
          { signal: controller.signal, headers: _tok ? { Authorization: `Bearer ${_tok}` } : {} }
        );
        window.clearTimeout(t);
        if (!res.ok) return { symbol: sym, error: true };
        const raw = await res.json();
        const d = unwrapAnalysis(raw);
        if (!d) return { symbol: sym, error: true };
        const tech = d?.technicals?.technical_analysis || d?.technical_analysis || {};
        const dbp = d?.best_pick && typeof d.best_pick === "object" ? d.best_pick : null;
        return {
          symbol: sym,
          aiScore: toScore100(dbp?.ai_score_0_100 ?? d?.ai_score_0_100 ?? d?.ai_score_0_10 ?? d?.ai_score ?? d?.technicals?.ai_score),
          momentum: toScore100(tech?.momentum ?? d?.technicals?.momentum),
          trend: toScore100(tech?.trend ?? d?.technicals?.trend),
          confidence: toConf10(d?.confidence_0_10 ?? d?.confidence_10 ?? (dbp?.confidence_0_100 != null ? dbp.confidence_0_100 / 10 : null) ?? (d?.confidence_0_100 != null ? d.confidence_0_100 / 10 : null) ?? d?.confidence),
          direction: extractDir(d),
          error: false,
        };
      } catch {
        window.clearTimeout(t);
        return { symbol: sym, error: true };
      }
    };

    async function batchedScreen(symbols) {
      const results = [];
      for (let i = 0; i < symbols.length; i += 3) {
        const batch = symbols.slice(i, i + 3);
        const batchResults = await Promise.all(batch.map(sym => screenOne(sym)));
        results.push(...batchResults);
        if (i + 3 < symbols.length) await new Promise(r => setTimeout(r, 500));
      }
      return results;
    }

    const runScreen = async () => {
      if (screenerRunningRef.current) return;
      const syms = (screenerInputRef.current?.value || "")
        .split(/[,\s]+/)
        .map((s) => normalizeSymbol(s))
        .filter((s) => s && /^[A-Z]{1,5}$/.test(s));
      if (!syms.length) return;
      screenerRunningRef.current = true;
      setLoading(true);
      setHasScreened(true);
      try {
        const allResults = await batchedScreen(syms);
        setResults(allResults);
      } finally {
        screenerRunningRef.current = false;
        setLoading(false);
      }
    };

    const handleSort = (col) => {
      if (col === sortCol) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      else { setSortCol(col); setSortDir("desc"); }
    };

    const sortedResults = [...results].sort((a, b) => {
      const isStr = sortCol === "symbol" || sortCol === "direction";
      const av = a[sortCol];
      const bv = b[sortCol];
      if (isStr) {
        return sortDir === "desc"
          ? String(bv ?? "").localeCompare(String(av ?? ""))
          : String(av ?? "").localeCompare(String(bv ?? ""));
      }
      const an = av ?? (sortDir === "desc" ? -Infinity : Infinity);
      const bn = bv ?? (sortDir === "desc" ? -Infinity : Infinity);
      return sortDir === "desc" ? bn - an : an - bn;
    });

    const scoreColor = (s) =>
      s === null ? "rgba(255,255,255,0.28)"
      : s >= 70  ? "#4ade80"
      : s >= 50  ? "#fbbf24"
      : "#f87171";

    const dirStyle = (dir) =>
      dir === "BULLISH" ? { color: "#4ade80", bg: "rgba(74,222,128,0.09)",    border: "rgba(74,222,128,0.22)" }
      : dir === "BEARISH" ? { color: "#f87171", bg: "rgba(248,113,113,0.09)", border: "rgba(248,113,113,0.22)" }
      : { color: T.textFaint, bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.10)" };

    const COL_HEADERS = [
      { key: "symbol",     label: "Symbol" },
      { key: "aiScore",    label: "AI Score" },
      { key: "momentum",   label: "Momentum" },
      { key: "trend",      label: "Trend" },
      { key: "confidence", label: "Confidence" },
      { key: "direction",  label: "Bias" },
    ];

    const thBase = {
      padding: "10px 16px",
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      cursor: "pointer",
      whiteSpace: "nowrap",
      userSelect: "none",
      borderBottom: `1px solid ${T.border}`,
      background: darkMode ? "rgba(8,12,22,0.70)" : "rgba(240,242,248,0.90)",
      transition: "color 0.12s",
    };

    const loadingSymCount = (screenerInputRef.current?.value || "").split(/[,\s]+/).filter((s) => s.trim()).length;

    return (
      <div className="pageGrid">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>

          {/* Header + Search */}
          <div style={{ padding: "20px 22px 18px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: "-0.015em", marginBottom: 4 }}>
                Screener
              </div>
              <div style={{ fontSize: 12, color: T.textFaint }}>
                Enter symbols separated by commas. Click any column header to sort.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{
                flex: 1, display: "flex", alignItems: "center",
                background: T.bg2, border: `1px solid ${T.border2}`,
                borderRadius: 9, padding: "0 14px", gap: 8,
              }}>
                <span style={{ fontSize: 12, color: T.textGhost, flexShrink: 0 }}>⊞</span>
                <input
                  ref={screenerInputRef}
                  defaultValue={DEFAULT_SCREENER_SYMBOLS.join(", ")}
                  onKeyDown={(e) => { if (e.key === "Enter") runScreen(); }}
                  placeholder="AAPL, NVDA, MSFT, TSLA…"
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    color: T.text, fontSize: 13, fontWeight: 500,
                    padding: "12px 0", fontFamily: "inherit", letterSpacing: "0.02em",
                  }}
                />
              </div>
              <RippleButton
                className="btn btn--primary"
                onClick={runScreen}
                disabled={loading}
                style={{ padding: "10px 22px", flexShrink: 0 }}
              >
                {loading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <span className="btnSpinner" />
                    <span>Screening…</span>
                  </span>
                ) : "Screen"}
              </RippleButton>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ padding: "52px 22px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span className="btnSpinner" style={{ width: 14, height: 14, borderWidth: 2, display: "inline-block" }} />
                <span style={{ fontSize: 13, color: T.textFaint }}>
                  Analyzing {loadingSymCount} symbol{loadingSymCount !== 1 ? "s" : ""} in parallel…
                </span>
              </div>
            </div>
          ) : !hasScreened || results.length === 0 ? (
            <div style={{ padding: "52px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 28, opacity: 0.08, marginBottom: 14 }}>⊞</div>
              <div style={{ fontSize: 13, color: T.textFaint }}>Add tickers above and click Screen</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {COL_HEADERS.map(({ key, label }) => (
                      <th
                        key={key}
                        style={{
                          ...thBase,
                          color: sortCol === key ? T.textSec : T.textGhost,
                        }}
                        onClick={() => handleSort(key)}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {label}
                          <span style={{ fontSize: 9, opacity: sortCol === key ? 0.75 : 0.20 }}>
                            {sortCol === key ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
                          </span>
                        </span>
                      </th>
                    ))}
                    <th style={{ ...thBase, cursor: "default", width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((row, i) => {
                    const ds = dirStyle(row.direction);
                    const isLast = i === sortedResults.length - 1;
                    return (
                      <tr
                        key={`scr_${row.symbol}_${i}`}
                        onClick={() => {
                          if (!row.error) { setSymbol(row.symbol); setTab("dashboard"); runAnalyze(row.symbol); }
                        }}
                        style={{
                          borderBottom: isLast ? "none" : `1px solid ${T.border}`,
                          cursor: row.error ? "default" : "pointer",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => { if (!row.error) e.currentTarget.style.background = T.bg2; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        {/* Symbol */}
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", color: row.error ? T.textGhost : T.text }}>
                            {row.symbol}
                          </span>
                          {row.error ? (
                            <span style={{ fontSize: 10, color: "rgba(248,113,113,0.45)", marginLeft: 7, fontWeight: 400 }}>unavailable</span>
                          ) : null}
                        </td>

                        {/* AI Score */}
                        <td style={{ padding: "14px 16px" }}>
                          {row.error || row.aiScore === null ? (
                            <span style={{ color: T.textGhost, fontSize: 13 }}>—</span>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <div style={{ width: 48, height: 4, background: T.bg3, borderRadius: 2, flexShrink: 0 }}>
                                <div style={{ width: `${row.aiScore}%`, height: "100%", background: scoreColor(row.aiScore), borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(row.aiScore), minWidth: 26 }}>{row.aiScore}</span>
                            </div>
                          )}
                        </td>

                        {/* Momentum */}
                        <td style={{ padding: "14px 16px" }}>
                          {row.error || row.momentum === null ? (
                            <span style={{ color: T.textGhost, fontSize: 13 }}>—</span>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <div style={{ width: 48, height: 4, background: T.bg3, borderRadius: 2, flexShrink: 0 }}>
                                <div style={{ width: `${row.momentum}%`, height: "100%", background: scoreColor(row.momentum), borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(row.momentum), minWidth: 26 }}>{row.momentum}</span>
                            </div>
                          )}
                        </td>

                        {/* Trend */}
                        <td style={{ padding: "14px 16px" }}>
                          {row.error || row.trend === null ? (
                            <span style={{ color: T.textGhost, fontSize: 13 }}>—</span>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <div style={{ width: 48, height: 4, background: T.bg3, borderRadius: 2, flexShrink: 0 }}>
                                <div style={{ width: `${row.trend}%`, height: "100%", background: scoreColor(row.trend), borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(row.trend), minWidth: 26 }}>{row.trend}</span>
                            </div>
                          )}
                        </td>

                        {/* Confidence */}
                        <td style={{ padding: "14px 16px" }}>
                          {row.error || row.confidence === null ? (
                            <span style={{ color: T.textGhost, fontSize: 13 }}>—</span>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(row.confidence * 10) }}>
                              {row.confidence.toFixed(1)}
                            </span>
                          )}
                        </td>

                        {/* Bias badge */}
                        <td style={{ padding: "14px 16px" }}>
                          {row.error ? (
                            <span style={{ color: T.textGhost, fontSize: 13 }}>—</span>
                          ) : (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                              letterSpacing: "0.06em", whiteSpace: "nowrap",
                              color: ds.color, background: ds.bg, border: `1px solid ${ds.border}`,
                            }}>
                              {row.direction === "BULLISH" ? "▲" : row.direction === "BEARISH" ? "▼" : "●"}{" "}{row.direction}
                            </span>
                          )}
                        </td>

                        {/* Analyze button */}
                        <td style={{ padding: "14px 16px" }}>
                          {!row.error && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSymbol(row.symbol);
                                setTab("dashboard");
                                runAnalyze(row.symbol);
                              }}
                              style={{
                                padding: "5px 12px", borderRadius: 7,
                                background: T.bg3, border: `1px solid ${T.border2}`,
                                color: T.textMuted, fontSize: 11, fontWeight: 600,
                                cursor: "pointer", letterSpacing: "0.02em", whiteSpace: "nowrap",
                              }}
                            >
                              Analyze →
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TradeJournal = () => {
    // journalAddOpen lives in App (survives remounts). Form values in refs (no state = no re-renders).
    const symRef    = useRef(null);
    const entryRef  = useRef(null);
    const stopRef   = useRef(null);
    const targetRef = useRef(null);
    const notesRef  = useRef(null);
    const [journalAddErr,  setJournalAddErr]  = useState("");
    const [fetchingSymbol, setFetchingSymbol] = useState(false);

    // On remount, restore any in-progress values from the stable App-level ref.
    useEffect(() => {
      const d = journalAddDataRef.current;
      if (symRef.current)    symRef.current.value    = d.symbol;
      if (entryRef.current)  entryRef.current.value  = d.entry;
      if (stopRef.current)   stopRef.current.value   = d.stop;
      if (targetRef.current) targetRef.current.value = d.target;
      if (notesRef.current)  notesRef.current.value  = d.notes;
    }, []);

    const saveField = (key, val) => { journalAddDataRef.current[key] = val; };

    const closeForm = () => {
      journalAddDataRef.current = { symbol: "", entry: "", stop: "", target: "", notes: "" };
      setJournalAddOpen(false);
      setJournalAddErr("");
    };

    const autoFillFromSymbol = async (sym) => {
      if (!sym || !/^[A-Z]{1,10}$/.test(sym)) return;
      setFetchingSymbol(true);
      try {
        const _tok = localStorage.getItem("aurexis_token");
        const res = await fetch(
          `${API_BASE_URL}/analyze/${encodeURIComponent(sym)}?budget=1000&risk=medium&timeframe=swing`,
          { signal: AbortSignal.timeout(20000), headers: _tok ? { Authorization: `Bearer ${_tok}` } : {} }
        );
        if (!res.ok) return;
        const raw = await res.json();
        const unwrapped = (raw?.analysis && typeof raw.analysis === "object" ? raw.analysis : null)
          || (raw?.data   && typeof raw.data   === "object" ? raw.data   : null)
          || (raw?.result && typeof raw.result === "object" ? raw.result : null)
          || raw;
        const { entry, stop, targets } = extractPlanNumbers(unwrapped);
        const target0 = targets.length > 0 ? targets[0] : null;
        // Write directly into DOM inputs — no state update, no re-render, no focus loss.
        if (entry  !== null && entryRef.current  && !entryRef.current.value)  { entryRef.current.value  = String(entry);  saveField("entry",  String(entry)); }
        if (stop   !== null && stopRef.current   && !stopRef.current.value)   { stopRef.current.value   = String(stop);   saveField("stop",   String(stop)); }
        if (target0 !== null && targetRef.current && !targetRef.current.value) { targetRef.current.value = String(target0); saveField("target", String(target0)); }
      } catch {
        // leave fields untouched on error
      } finally {
        setFetchingSymbol(false);
      }
    };

    const total   = journalTrades.length;
    const closed  = journalTrades.filter(t => t.status !== "open");
    const won     = closed.filter(t => t.status === "won");
    const winRate = closed.length > 0 ? Math.round(won.length / closed.length * 100) : null;
    const rets    = closed.map(t => t.returnPct).filter(r => Number.isFinite(r));
    const avgRet  = rets.length > 0 ? rets.reduce((a, b) => a + b, 0) / rets.length : null;
    const bestRet = rets.length > 0 ? Math.max(...rets) : null;
    const bestTrade = bestRet !== null ? closed.find(t => t.returnPct === bestRet) : null;

    const submitAdd = () => {
      const sym = normalizeSymbol(symRef.current?.value || "");
      if (!sym || !/^[A-Z]{1,10}$/.test(sym)) { setJournalAddErr("Enter a valid symbol."); return; }
      const entry = parseFloat(entryRef.current?.value || "");
      if (!Number.isFinite(entry) || entry <= 0) { setJournalAddErr("Enter a valid entry price."); return; }
      const stop   = stopRef.current?.value   ? parseFloat(stopRef.current.value)   : null;
      const target = targetRef.current?.value ? parseFloat(targetRef.current.value) : null;
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      saveJournalTrades([
        { id, symbol: sym, entryPrice: entry, stopPrice: stop, targetPrice: target,
          enteredAt: new Date().toISOString(), exitPrice: null, exitedAt: null,
          status: "open", returnPct: null, notes: (notesRef.current?.value || "").trim() },
        ...journalTrades,
      ]);
      closeForm();
    };

    const submitClose = (id) => {
      const exit = parseFloat(journalClosePrice);
      if (!Number.isFinite(exit) || exit <= 0) { setJournalCloseErr("Enter a valid exit price."); return; }
      saveJournalTrades(journalTrades.map(t => {
        if (t.id !== id) return t;
        const ret = ((exit - t.entryPrice) / t.entryPrice) * 100;
        return { ...t, exitPrice: exit, exitedAt: new Date().toISOString(),
          status: exit >= t.entryPrice ? "won" : "lost",
          returnPct: parseFloat(ret.toFixed(2)) };
      }));
      setJournalCloseId(null); setJournalClosePrice(""); setJournalCloseErr("");
    };

    const updateNote = (id, val) =>
      saveJournalTrades(journalTrades.map(t => t.id === id ? { ...t, notes: val } : t));

    const deleteTrade = (id) =>
      saveJournalTrades(journalTrades.filter(t => t.id !== id));

    const fmtD = (iso) => {
      if (!iso) return "—";
      try { return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" }); }
      catch { return "—"; }
    };
    const fmtP = (n) =>
      Number.isFinite(n) ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

    const inp = {
      background: T.bg2, border: `1px solid ${T.border2}`,
      borderRadius: 6, color: T.text, fontSize: 13,
      padding: "7px 10px", outline: "none", fontFamily: "inherit",
    };

    const summaryStats = [
      { label: "Total Trades",  value: String(total), colored: null },
      { label: "Win Rate",      value: winRate !== null ? `${winRate}%` : "—", colored: null },
      { label: "Avg Return",    value: avgRet  !== null ? `${avgRet  >= 0 ? "+" : ""}${avgRet.toFixed(2)}%` : "—", colored: avgRet },
      { label: "Best Trade",    value: bestTrade ? `${bestTrade.symbol} +${bestRet.toFixed(1)}%` : "—", colored: bestRet },
    ];

    return (
      <div className="pageGrid">
        {/* ── Summary bar ── */}
        {total > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {summaryStats.map(({ label, value, colored }) => (
              <div key={label} style={{
                padding: "16px 18px", borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: darkMode ? "rgba(10,12,16,0.7)" : "rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontSize: 10, color: T.textFaint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
                <div style={{
                  fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em",
                  color: colored !== null && colored !== undefined
                    ? (colored >= 0 ? "#4ade80" : "#f87171")
                    : "rgba(255,255,255,0.88)",
                }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Main card ── */}
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">Trade Journal</div>
              <div className="cardSub">
                {total === 0 ? "Log your trades to track performance." : `${total} trade${total !== 1 ? "s" : ""} logged · ${closed.length} closed`}
              </div>
            </div>
            <div className="cardRight">
              <RippleButton
                className={journalAddOpen ? "btn btn--ghost" : "btn btn--primary"}
                style={{ fontSize: 12, padding: "7px 14px" }}
                onClick={() => journalAddOpen ? closeForm() : setJournalAddOpen(true)}
              >
                {journalAddOpen ? "✕ Cancel" : "+ Add Trade Manually"}
              </RippleButton>
            </div>
          </div>

          {/* ── Add trade form ── */}
          {journalAddOpen && (
            <div style={{
              padding: "18px 20px 16px",
              background: T.bg,
              borderTop: `1px solid ${T.border}`,
              borderBottom: `1px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>New Trade</div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 110px 110px 110px 1fr", gap: 8, marginBottom: 10 }}>
                {/* Symbol — uncontrolled, onBlur triggers auto-fill */}
                <div style={{ position: "relative" }}>
                  <input
                    ref={symRef}
                    style={{ ...inp, width: "100%", paddingRight: fetchingSymbol ? 28 : undefined }}
                    placeholder="Symbol"
                    onChange={e => { e.target.value = e.target.value.toUpperCase(); saveField("symbol", e.target.value); }}
                    onBlur={e => autoFillFromSymbol(normalizeSymbol(e.target.value))}
                    onKeyDown={e => { if (e.key === "Enter") submitAdd(); if (e.key === "Escape") closeForm(); }}
                  />
                  {fetchingSymbol && (
                    <span className="btnSpinner" style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }} />
                  )}
                </div>
                {/* Remaining fields — uncontrolled, values read from DOM on submit */}
                {[
                  { ref: entryRef,  placeholder: "Entry $",         fkey: "entry"  },
                  { ref: stopRef,   placeholder: "Stop $",          fkey: "stop"   },
                  { ref: targetRef, placeholder: "Target $",        fkey: "target" },
                  { ref: notesRef,  placeholder: "Notes (optional)", fkey: "notes"  },
                ].map(({ ref, placeholder, fkey }) => (
                  <input
                    key={fkey}
                    ref={ref}
                    style={{ ...inp, width: "100%" }}
                    placeholder={placeholder}
                    onChange={e => saveField(fkey, e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submitAdd(); if (e.key === "Escape") closeForm(); }}
                  />
                ))}
              </div>
              {journalAddErr && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 10 }}>{journalAddErr}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <RippleButton className="btn btn--primary" style={{ fontSize: 12, padding: "7px 18px" }} onClick={submitAdd}>Submit</RippleButton>
                <RippleButton className="btn btn--ghost" style={{ fontSize: 12, padding: "7px 14px" }} onClick={closeForm}>Cancel</RippleButton>
              </div>
            </div>
          )}

          <div className="cardBody" style={{ padding: 0, maxHeight: 400, overflowY: "auto" }}>
            {journalTrades.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 14, opacity: 0.15 }}>▤</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.textFaint, marginBottom: 6 }}>No trades logged yet</div>
                <div style={{ fontSize: 12, color: T.textGhost }}>Click "+ Add Trade Manually" above to log your first entry.</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ margin: 0, minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Symbol</th>
                      <th>Entry</th>
                      <th>Stop</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th>Return</th>
                      <th style={{ minWidth: 180 }}>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journalTrades.map(trade => {
                      const isClosing = journalCloseId === trade.id;
                      const statusClass = trade.status === "won" ? "pill--good"
                        : trade.status === "lost" ? "pill--bad" : "pill--neutral";
                      return (
                        <tr key={trade.id}>
                          <td style={{ fontSize: 11, color: T.textFaint, whiteSpace: "nowrap" }}>{fmtD(trade.enteredAt)}</td>
                          <td style={{ fontWeight: 700, letterSpacing: "0.05em", fontSize: 13 }}>{trade.symbol}</td>
                          <td style={{ fontFamily: "monospace", fontSize: 12 }}>{fmtP(trade.entryPrice)}</td>
                          <td style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(248,113,113,0.75)" }}>{fmtP(trade.stopPrice)}</td>
                          <td style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(74,222,128,0.75)" }}>{fmtP(trade.targetPrice)}</td>
                          <td><span className={`pill ${statusClass}`} style={{ fontSize: 10 }}>{trade.status}</span></td>
                          <td style={{
                            fontWeight: 700, fontSize: 12, whiteSpace: "nowrap",
                            color: trade.returnPct !== null
                              ? (trade.returnPct >= 0 ? "#4ade80" : "#f87171")
                              : "rgba(255,255,255,0.25)",
                          }}>
                            {trade.returnPct !== null ? `${trade.returnPct >= 0 ? "+" : ""}${trade.returnPct.toFixed(2)}%` : "—"}
                          </td>
                          <td>
                            <textarea
                              style={{
                                ...inp, width: "100%", minHeight: 30, maxHeight: 80,
                                resize: "vertical", fontSize: 11, padding: "5px 8px",
                                lineHeight: 1.45,
                              }}
                              value={trade.notes}
                              onChange={e => updateNote(trade.id, e.target.value)}
                              placeholder="Add note…"
                            />
                          </td>
                          <td style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                            {trade.status === "open" ? (
                              isClosing ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <input
                                    style={{ ...inp, width: 76, fontSize: 11, padding: "4px 7px" }}
                                    placeholder="Exit $"
                                    value={journalClosePrice}
                                    autoFocus
                                    onChange={e => { setJournalClosePrice(e.target.value); setJournalCloseErr(""); }}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") submitClose(trade.id);
                                      if (e.key === "Escape") { setJournalCloseId(null); setJournalClosePrice(""); }
                                    }}
                                  />
                                  <button
                                    title="Confirm close"
                                    style={{ ...inp, cursor: "pointer", padding: "4px 8px", color: "#4ade80", borderColor: "rgba(74,222,128,0.28)", fontSize: 14, lineHeight: 1 }}
                                    onClick={() => submitClose(trade.id)}
                                  >✓</button>
                                  <button
                                    title="Cancel"
                                    style={{ ...inp, cursor: "pointer", padding: "4px 8px", color: T.textFaint, fontSize: 14, lineHeight: 1 }}
                                    onClick={() => { setJournalCloseId(null); setJournalClosePrice(""); setJournalCloseErr(""); }}
                                  >✕</button>
                                </div>
                              ) : (
                                <RippleButton
                                  className="btn btn--ghost"
                                  style={{ fontSize: 11, padding: "4px 10px" }}
                                  onClick={() => { setJournalCloseId(trade.id); setJournalClosePrice(""); setJournalCloseErr(""); }}
                                >
                                  Close Trade
                                </RippleButton>
                              )
                            ) : (
                              <span style={{ fontSize: 11, color: T.textGhost, whiteSpace: "nowrap" }}>
                                Closed {fmtD(trade.exitedAt)}
                              </span>
                            )}
                            <button
                              title="Delete trade"
                              style={{ background: "none", border: "none", cursor: "pointer", color: T.textGhost, fontSize: 13, padding: "2px 5px", marginLeft: 4, verticalAlign: "middle" }}
                              onClick={() => deleteTrade(trade.id)}
                            >⌫</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {journalCloseErr && (
              <div style={{ padding: "8px 20px", fontSize: 12, color: "#f87171", borderTop: `1px solid ${T.border}` }}>{journalCloseErr}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const settingsSection = {
    padding: "20px 22px",
    borderRadius: 12,
    border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.07)",
    background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.65)",
  };
  const settingsSectionTitle = {
    fontSize: 13,
    fontWeight: 700,
    color: darkMode ? "rgba(255,255,255,0.75)" : "rgba(8,10,22,0.80)",
    marginBottom: 4,
    letterSpacing: "-0.01em",
  };
  const settingsSectionSub = {
    fontSize: 13,
    color: darkMode ? "rgba(255,255,255,0.35)" : "rgba(8,10,22,0.44)",
    lineHeight: 1.55,
  };

  const Support = () => {
    const [openFaq, setOpenFaq] = React.useState(null);
    const faqs = [
      {
        q: "How does the AI pick stocks?",
        a: "Aurexis scans 1,200+ stocks daily using a multi-signal model — momentum, volume anomalies, options flow, short interest, and news sentiment. Each signal is weighted by its historical win rate and combined into a conviction score.",
      },
      {
        q: "When does the daily pick update?",
        a: "The scanner runs every morning before market open. Your Best Pick card refreshes automatically — check back before 9:30 AM ET on trading days. On weekends and market holidays the card will show the last session's result or a NO_TRADE status.",
      },
      {
        q: "Is this real money trading?",
        a: "No — Aurexis is a research and analysis tool, not a brokerage. It surfaces high-conviction setups for you to review. You execute trades yourself through your own broker.",
      },
      {
        q: "How accurate is the AI analysis?",
        a: "Aurexis uses a multi-signal conviction model that weighs momentum, volume, options flow, and news sentiment. Every pick is tracked live — outcomes update automatically as trades resolve over 1–5 trading days.",
      },
      {
        q: "Can I log my own trades or monitor stocks?",
        a: "Yes, with a Starter plan. The Trade Journal lets you manually log any trade with entry, stop, and target — it calculates your P&L automatically. The Watchlist lets you monitor AI-screened candidates and track setups before they trigger. Both are unlocked on Starter ($9/mo).",
      },
      {
        q: "How do I report a bug or wrong data?",
        a: "Email us at aurexis.app@gmail.com with the ticker, date, and a screenshot. We typically respond within 24 hours.",
      },
    ];

    return (
      <div className="pageGrid">
        {/* Header banner */}
        <div style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(16,18,32,0.0) 100%)",
          border: "1px solid rgba(99,102,241,0.18)",
          borderRadius: 16,
          padding: "28px 30px",
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 22,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "rgba(99,102,241,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, flexShrink: 0,
          }}>◌</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4 }}>Support Center</div>
            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>
              Questions, feedback, or something broken? We've got you.
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">Frequently Asked Questions</div>
              <div className="cardSub">Answers to the most common questions about Aurexis.</div>
            </div>
          </div>
          <div className="cardBody" style={{ padding: "0 0 8px" }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  borderBottom: i < faqs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", background: "none", border: "none", cursor: "pointer",
                    padding: "16px 22px", display: "flex", justifyContent: "space-between",
                    alignItems: "center", gap: 16, textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{faq.q}</span>
                  <span style={{
                    fontSize: 16, color: T.textFaint, flexShrink: 0,
                    transform: openFaq === i ? "rotate(45deg)" : "none",
                    transition: "transform 0.18s",
                    display: "inline-block",
                  }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 22px 18px", fontSize: 13, color: T.textMuted, lineHeight: 1.65 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact & Links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{
            ...settingsSection,
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(99,102,241,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
              }}>✉</div>
              <div>
                <div style={settingsSectionTitle}>Email Support</div>
                <div style={{ ...settingsSectionSub, fontSize: 12 }}>Typically reply within 24h</div>
              </div>
            </div>
            <a
              href="mailto:aurexis.app@gmail.com"
              style={{
                display: "block", textAlign: "center", padding: "9px 0",
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)",
                color: "rgba(180,182,255,0.9)", textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.22)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,0.12)"}
            >
              aurexis.app@gmail.com
            </a>
          </div>

          <div style={{
            ...settingsSection,
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(74,222,128,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
              }}>◈</div>
              <div>
                <div style={settingsSectionTitle}>System Status</div>
                <div style={{ ...settingsSectionSub, fontSize: 12 }}>Live scanner & API health</div>
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)",
              color: "#4ade80",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 6px #4ade80" }} />
              All systems operational
            </div>
          </div>
        </div>

        {/* What's coming */}
        <div style={{ ...settingsSection }}>
          <div style={{ ...settingsSectionTitle, marginBottom: 10 }}>What's Coming</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
            {["Price alerts", "Mobile app", "Portfolio sync", "Options flow feed", "Strategy backtesting", "Multi-account support"].map(item => (
              <div key={item} style={{
                padding: "8px 12px", borderRadius: 8, fontSize: 12,
                background: T.bg2, border: `1px solid ${T.border}`,
                color: T.textMuted, display: "flex", alignItems: "center", gap: 7,
              }}>
                <span style={{ fontSize: 9, color: T.textGhost }}>▸</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ ...settingsSection, background: T.bg, borderColor: T.textHint }}>
          <div style={{ ...settingsSectionTitle, color: T.textFaint, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>Disclaimer</div>
          <div style={{ ...settingsSectionSub, color: T.textGhost, marginTop: 6, fontSize: 12 }}>
            Aurexis is for educational and informational purposes only. Nothing on this platform constitutes investment advice or a recommendation to buy or sell any security. Past performance does not guarantee future results. Always do your own research and consult a licensed financial advisor before making any investment decisions.
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Brain Stats — self-learning signal weight tracker
  // ---------------------------------------------------------------------------
  const BrainStats = () => {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      fetch(`${API}/scan/brain_stats`)
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    }, []);

    const multColor = (m) => {
      if (!m) return "rgba(255,255,255,0.4)";
      if (m >= 1.3) return "#4ade80";
      if (m <= 0.7) return "#fb7185";
      return "rgba(255,255,255,0.6)";
    };

    return (
      <div className="pageGrid">
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">◈ Scanner Brain</div>
              <div className="cardSub">Learns from every pick. Signals that predict wins get boosted automatically.</div>
            </div>
          </div>
          <div className="cardBody">
            {loading && <div style={{ color: T.textFaint, padding: 20 }}>Loading brain stats…</div>}
            {!loading && !data && <div style={{ color: "#fb7185", padding: 20 }}>Could not load brain data.</div>}
            {data && (
              <div style={{ display: "grid", gap: 20 }}>

                {/* Summary row */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {[
                    { label: "Picks Recorded", val: data.total_picks_recorded ?? "—" },
                    { label: "Outcomes Checked", val: data.outcomes_checked ?? "—" },
                    { label: "Win Rate", val: data.overall_win_rate_pct != null ? `${data.overall_win_rate_pct}%` : "—" },
                    { label: "Best Pick", val: data.best_ever ? `${data.best_ever.symbol} +${data.best_ever.change_pct}%` : "—" },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background: T.bg2, borderRadius: 8, padding: "12px 18px", minWidth: 130 }}>
                      <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Signal weight table */}
                {data.signal_weights?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, marginBottom: 8, letterSpacing: "0.06em" }}>LEARNED SIGNAL WEIGHTS</div>
                    <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 12 }}>
                      Multipliers update automatically as outcomes come in. Green = this signal predicts wins. Red = unreliable.
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ color: T.textFaint, fontSize: 11 }}>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>Signal</th>
                          <th style={{ textAlign: "right", padding: "4px 8px" }}>Appearances</th>
                          <th style={{ textAlign: "right", padding: "4px 8px" }}>Win Rate</th>
                          <th style={{ textAlign: "right", padding: "4px 8px" }}>Multiplier</th>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.signal_weights.map(s => (
                          <tr key={s.signal} style={{ borderTop: `1px solid ${T.border}` }}>
                            <td style={{ padding: "6px 8px", fontFamily: "monospace", color: T.textSec }}>{s.signal}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: T.textMuted }}>{s.appearances}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: T.textSec }}>{s.win_rate_pct}%</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: multColor(s.multiplier) }}>{s.multiplier}x</td>
                            <td style={{ padding: "6px 8px" }}>
                              <span style={{
                                fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                                background: s.status === "boosted" ? "rgba(74,222,128,0.12)" : s.status === "penalized" ? "rgba(251,113,133,0.12)" : T.bg3,
                                color: s.status === "boosted" ? "#4ade80" : s.status === "penalized" ? "#fb7185" : T.textMuted,
                              }}>{s.status.toUpperCase()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Recent picks with outcomes */}
                {data.recent_picks?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, marginBottom: 8, letterSpacing: "0.06em" }}>RECENT PICKS & OUTCOMES</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ color: T.textFaint, fontSize: 11 }}>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>Symbol</th>
                          <th style={{ textAlign: "right", padding: "4px 8px" }}>Score</th>
                          <th style={{ textAlign: "right", padding: "4px 8px" }}>Entry</th>
                          <th style={{ textAlign: "right", padding: "4px 8px" }}>Change</th>
                          <th style={{ textAlign: "right", padding: "4px 8px" }}>Days</th>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent_picks.map((p, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                            <td style={{ padding: "6px 8px", fontWeight: 700, color: T.text }}>{p.symbol}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: T.textMuted }}>{p.score}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: T.textMuted }}>{p.entry != null ? `$${p.entry}` : "—"}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: p.change_pct > 0 ? "#4ade80" : p.change_pct < 0 ? "#fb7185" : T.textMuted }}>
                              {p.change_pct != null ? `${p.change_pct > 0 ? "+" : ""}${p.change_pct}%` : "pending"}
                            </td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: T.textFaint }}>{p.days != null ? `${p.days}d` : "—"}</td>
                            <td style={{ padding: "6px 8px" }}>
                              {p.won == null
                                ? <span style={{ color: T.textFaint, fontSize: 11 }}>PENDING</span>
                                : p.won
                                  ? <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 11 }}>WIN</span>
                                  : <span style={{ color: "#fb7185", fontWeight: 700, fontSize: 11 }}>MISS</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {(!data.signal_weights?.length && !data.recent_picks?.length) && (
                  <div style={{ color: T.textFaint, fontSize: 13, padding: 12 }}>
                    The brain is brand new — no picks recorded yet. Use the Screener to analyze stocks and come back after a day or two to see it learning.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Settings = () => {
    // Refresh token + profile from DB whenever Settings opens
    React.useEffect(() => {
      const token = localStorage.getItem("aurexis_token");
      if (!token) return;
      // Refresh JWT so usePlan() picks up the latest plan from the DB
      fetch(`${API}/auth/refresh-token`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.access_token) {
            localStorage.setItem("aurexis_token", data.access_token);
            window.dispatchEvent(new Event("storage")); // wake up usePlan()
          }
        })
        .catch(() => {});
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(me => { if (me?.id) setUserProfile(me); })
        .catch(() => {});
    }, []);

    const firstName = userProfile?.first_name || "";
    const lastName = userProfile?.last_name || "";
    const email = userProfile?.email || "";
    const plan = userProfile?.plan || "free";
    const memberSince = userProfile?.created_at
      ? new Date(userProfile.created_at).getFullYear()
      : new Date().getFullYear();
    const isPaidPlan = plan !== "free" && userProfile?.subscription_status === "active";
    const isCancelling = userProfile?.cancel_at_period_end;
    const periodEndDate = userProfile?.current_period_end
      ? new Date(userProfile.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;
    const planLabel = plan === "free" ? "Free" : plan.charAt(0).toUpperCase() + plan.slice(1);

    const [cancelLoading, setCancelLoading] = React.useState(false);

    async function handleCancelSubscription() {
      if (!window.confirm("Cancel your subscription? You'll keep full access until the end of your billing period.")) return;
      setCancelLoading(true);
      try {
        const token = localStorage.getItem("aurexis_token");
        const r = await fetch(`${API}/stripe/cancel-subscription`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error();
        const me = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then(x => x.json());
        setUserProfile(me);
        showToast("Subscription cancelled. Access continues until " + (periodEndDate || "end of period") + ".");
      } catch { showToast("Something went wrong. Please try again."); }
      finally { setCancelLoading(false); }
    }

    async function handleReactivateSubscription() {
      setCancelLoading(true);
      try {
        const token = localStorage.getItem("aurexis_token");
        const r = await fetch(`${API}/stripe/reactivate-subscription`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error();
        const me = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then(x => x.json());
        setUserProfile(me);
        showToast("Subscription reactivated — you're all set.");
      } catch { showToast("Something went wrong. Please try again."); }
      finally { setCancelLoading(false); }
    }
    const displayName = firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : email || "Aurexis User";
    const initials = firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : firstName
        ? firstName.slice(0, 2).toUpperCase()
        : email
          ? email.slice(0, 2).toUpperCase()
          : "AU";
    const toggleRow = (label, enabled, onChange) => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.06)" }}>
        <span style={{ fontSize: 13, color: darkMode ? "rgba(255,255,255,0.65)" : "rgba(8,10,22,0.62)" }}>{label}</span>
        <button
          onClick={onChange}
          style={{
            width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
            background: enabled ? "rgba(0,180,80,0.75)" : darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.10)",
            position: "relative", transition: "background 0.2s", flexShrink: 0,
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: enabled ? 20 : 3,
            width: 16, height: 16, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }} />
        </button>
      </div>
    );

    const [compactView, setCompactView] = React.useState(false);

    // ── Alert preferences ──────────────────────────────────────────────────
    const [alertNewPick,  setAlertNewPick]  = React.useState(true);
    const [alertOutcome,  setAlertOutcome]  = React.useState(true);
    const [alertLoaded,   setAlertLoaded]   = React.useState(false);

    React.useEffect(() => {
      const token = localStorage.getItem("aurexis_token");
      if (!token || alertLoaded) return;
      fetch(`${API}/alerts/preferences`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          if (d.alerts_new_pick != null) setAlertNewPick(!!d.alerts_new_pick);
          if (d.alerts_outcome  != null) setAlertOutcome(!!d.alerts_outcome);
          setAlertLoaded(true);
        })
        .catch(() => setAlertLoaded(true));
    }, [alertLoaded]);

    async function _saveAlertPrefs(newPick, outcome) {
      const token = localStorage.getItem("aurexis_token");
      if (!token) return;
      try {
        const r = await fetch(`${API}/alerts/preferences`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ phone: null, alerts_new_pick: newPick, alerts_outcome: outcome, alerts_channel: "email" }),
        });
        if (r.ok) showToast("Alert preference saved.");
      } catch { showToast("Couldn't save — check your connection."); }
    }

    return (
      <div className="pageGrid">
        {/* Account profile card */}
        <div style={{
          background: darkMode
            ? "linear-gradient(160deg, rgba(10,13,22,0.98) 0%, rgba(13,17,30,0.98) 100%)"
            : "linear-gradient(160deg, rgba(248,250,252,0.98) 0%, rgba(242,246,250,0.98) 100%)",
          border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16, padding: "24px 26px",
          display: "flex", alignItems: "center", gap: 20,
        }}>
          <div style={{
            width: 58, height: 58, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(0,180,80,0.3) 0%, rgba(0,140,60,0.25) 100%)",
            border: "2px solid rgba(0,180,80,0.30)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 800, color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(8,10,22,0.85)",
            letterSpacing: "-0.01em",
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: darkMode ? "#fff" : "rgba(8,10,22,0.90)", letterSpacing: "-0.02em" }}>{displayName}</div>
            <div style={{ fontSize: 12, color: darkMode ? "rgba(255,255,255,0.35)" : "rgba(8,10,22,0.40)", marginTop: 3 }}>{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan · Member since {memberSince}</div>
          </div>
          <div style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: "rgba(0,180,80,0.10)", border: "1px solid rgba(0,180,80,0.22)",
            color: "rgba(0,180,80,0.90)", letterSpacing: "0.04em",
          }}>{plan.toUpperCase()}</div>
        </div>

        {/* Plan */}
        <div style={{ ...settingsSection }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={settingsSectionTitle}>Plan & Billing</div>
              <div style={{ ...settingsSectionSub, marginTop: 4 }}>
                {isPaidPlan
                  ? isCancelling
                    ? <>You're on the <b style={{ color: darkMode ? "rgba(255,255,255,0.75)" : "rgba(8,10,22,0.75)" }}>{planLabel}</b> plan. Cancels on <b style={{ color: "#f87171" }}>{periodEndDate}</b> — you'll keep full access until then.</>
                    : <>You're on the <b style={{ color: "#4ade80" }}>{planLabel}</b> plan. Your subscription renews automatically.</>
                  : <>You're on the <b style={{ color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(8,10,22,0.65)" }}>Free</b> plan. Upgrade to unlock full picks, analysis, and scanner access.</>
                }
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
              {isPaidPlan && isCancelling && (
                <button
                  className="btn btn--primary"
                  style={{ fontSize: 11, padding: "5px 12px" }}
                  onClick={handleReactivateSubscription}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? "…" : "Reactivate"}
                </button>
              )}
              {isPaidPlan && !isCancelling && (
                <button
                  className="btn btn--ghost"
                  style={{ fontSize: 11, padding: "5px 12px", color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }}
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? "…" : "Cancel Plan"}
                </button>
              )}
              {!isPaidPlan && (
                <button
                  className="btn btn--primary"
                  style={{ fontSize: 11, padding: "5px 12px" }}
                  onClick={() => setTab("pricing")}
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div style={{ ...settingsSection }}>
          <div style={{ ...settingsSectionTitle, marginBottom: 4 }}>Alerts</div>
          <div style={{ fontSize: 12, color: darkMode ? "rgba(255,255,255,0.38)" : "rgba(8,10,22,0.42)", marginBottom: 18, lineHeight: 1.6 }}>
            Get notified by email when the AI finds a new pick or when an existing pick hits its target or stop.
          </div>
          {toggleRow("New pick alert", alertNewPick, () => {
            setAlertNewPick(prev => {
              const next = !prev;
              _saveAlertPrefs(next, alertOutcome);
              return next;
            });
          })}
          {toggleRow("Pick outcome alert (win/loss)", alertOutcome, () => {
            setAlertOutcome(prev => {
              const next = !prev;
              _saveAlertPrefs(alertNewPick, next);
              return next;
            });
          })}
        </div>

        {/* Display */}
        <div style={{ ...settingsSection }}>
          <div style={{ ...settingsSectionTitle, marginBottom: 12 }}>Display</div>
          {toggleRow("Compact card view", compactView, () => setCompactView(p => !p))}
          <div style={{ paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: darkMode ? "rgba(255,255,255,0.3)" : "rgba(8,10,22,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Appearance</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: true,  label: "Dark",  icon: "🌙" },
                { id: false, label: "Light", icon: "☀️" },
              ].map(({ id, label, icon }) => (
                <button
                  key={String(id)}
                  onClick={() => setDarkMode(id)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "10px 16px", borderRadius: 10, cursor: "pointer",
                    fontWeight: 700, fontSize: 13,
                    background: darkMode === id
                      ? "rgba(0,180,80,0.12)"
                      : darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                    border: darkMode === id
                      ? "1px solid rgba(0,180,80,0.28)"
                      : darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)",
                    color: darkMode === id
                      ? "rgba(0,180,80,0.95)"
                      : darkMode ? "rgba(255,255,255,0.45)" : "rgba(8,10,22,0.45)",
                    transition: "background 0.18s, border 0.18s, color 0.18s",
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div style={{ ...settingsSection }}>
          <div style={settingsSectionTitle}>Data & Privacy</div>
          <div style={{ ...settingsSectionSub, marginTop: 6, marginBottom: 16 }}>Your data is never sold or shared with third parties. Aurexis does not store personal trading positions.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Data storage", val: "Local device only" },
              { label: "Analytics", val: "Anonymous usage" },
              { label: "API keys", val: "Never stored" },
              { label: "Trade data", val: "Not collected" },
            ].map(({ label, val }) => (
              <div key={label} style={{ padding: "10px 14px", borderRadius: 8, background: darkMode ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.03)", border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.07)" }}>
                <div style={{ fontSize: 11, color: darkMode ? "rgba(255,255,255,0.3)" : "rgba(8,10,22,0.38)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(8,10,22,0.65)" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ ...settingsSection, borderColor: "rgba(251,113,133,0.12)", background: "rgba(251,113,133,0.02)" }}>
          <div style={{ ...settingsSectionTitle, color: "rgba(251,113,133,0.7)" }}>Account Actions</div>
          <div style={{ ...settingsSectionSub, marginTop: 4, marginBottom: 16 }}>Irreversible actions — proceed with care.</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn--ghost"
              style={{ fontSize: 12, padding: "7px 16px", color: darkMode ? "rgba(255,255,255,0.38)" : "rgba(8,10,22,0.40)", borderColor: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)" }}
              onClick={() => {
                localStorage.removeItem("aurexis_token");
                localStorage.removeItem("aurexis_user_email");
                localStorage.removeItem("aurexis_force_onboarding");
                window.location.href = "/";
              }}
            >
              Sign out
            </button>
            <button
              className="btn btn--ghost"
              style={{ fontSize: 12, padding: "7px 16px", color: "rgba(251,113,133,0.5)", borderColor: "rgba(251,113,133,0.12)" }}
              onClick={() => {
                if (window.confirm("Are you sure? This cannot be undone.")) {
                  const token = localStorage.getItem("aurexis_token");
                  fetch(`${API}/auth/delete-account`, {
                    method: "DELETE",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  }).finally(() => {
                    localStorage.removeItem("aurexis_token");
                    localStorage.removeItem("aurexis_user_email");
                    window.location.href = "/";
                  });
                }
              }}
            >
              Delete account
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Pricing = () => {
    const [upgradeLoading, setUpgradeLoading] = React.useState(null);
    const [upgradeError, setUpgradeError] = React.useState("");

    // Feature matrix definition
    const FEATURE_CATEGORIES = [
      {
        label: "AI Pick",
        features: [
          { key: "daily_pick",    label: "Daily AI pick (stock + direction)" },
          { key: "entry_targets", label: "Live entry, stop & Fibonacci targets" },
          { key: "rr_ratio",      label: "Risk/Reward ratio" },
          { key: "edge_signals",  label: "Edge signals" },
        ],
      },
      {
        label: "Analysis",
        features: [
          { key: "analyze_limit",  label: "3 stock analyses per day" },
          { key: "analyze_unltd",  label: "Unlimited stock analysis" },
          { key: "why_this_trade", label: "\"Why This Trade\" reasoning" },
          { key: "ai_summary",     label: "AI news & sentiment summary" },
          { key: "adv_metrics",    label: "Advanced technical metrics" },
        ],
      },
      {
        label: "Dashboard",
        features: [
          { key: "market_regime",  label: "Market regime indicator" },
          { key: "top_movers_5",   label: "Top Movers (5 tickers)" },
          { key: "top_movers_all", label: "Top Movers (full, unlimited)" },
          { key: "perf_tracking",  label: "Performance tracking" },
          { key: "recent_picks",   label: "Recent picks history (30 days)" },
        ],
      },
      {
        label: "Tools",
        features: [
          { key: "watchlist",      label: "Watchlist" },
          { key: "trade_journal",  label: "Trade journal" },
          { key: "screener",       label: "Multi-ticker screener" },
          { key: "portfolio",      label: "Portfolio tracking" },
        ],
      },
      {
        label: "Elite",
        features: [
          { key: "options_flow",   label: "Options flow feed" },
          { key: "insider",        label: "Insider buying signals" },
          { key: "backtesting",    label: "Strategy backtesting" },
          { key: "priority_sup",   label: "Priority support" },
        ],
      },
    ];

    const PLAN_FEATURES = {
      free:    new Set(["daily_pick", "market_regime", "top_movers_5", "analyze_limit", "why_this_trade"]),
      starter: new Set(["daily_pick", "entry_targets", "rr_ratio", "edge_signals", "analyze_unltd", "why_this_trade", "ai_summary", "adv_metrics", "market_regime", "top_movers_5", "top_movers_all", "perf_tracking", "recent_picks", "watchlist", "trade_journal"]),
      pro:     new Set(["daily_pick", "entry_targets", "rr_ratio", "edge_signals", "analyze_unltd", "why_this_trade", "ai_summary", "adv_metrics", "market_regime", "top_movers_5", "top_movers_all", "perf_tracking", "recent_picks", "watchlist", "trade_journal", "screener", "portfolio"]),
      elite:   new Set(["daily_pick", "entry_targets", "rr_ratio", "edge_signals", "analyze_unltd", "why_this_trade", "ai_summary", "adv_metrics", "market_regime", "top_movers_5", "top_movers_all", "perf_tracking", "recent_picks", "watchlist", "trade_journal", "screener", "portfolio", "options_flow", "insider", "backtesting", "priority_sup"]),
    };

    const plans = [
      {
        id: "free",
        name: "FREE",
        price: "$0",
        period: "forever",
        badge: null,
        badgeColor: null,
        accent: T.borderStrong,
        btnLabel: "Get Started Free",
      },
      {
        id: "starter",
        name: "STARTER",
        price: "$9",
        period: "per month",
        badge: "MOST POPULAR",
        badgeColor: "#00b450",
        accent: "rgba(0,180,80,0.55)",
        btnLabel: "Get Starter",
      },
      {
        id: "pro",
        name: "PRO",
        price: "$29",
        period: "per month",
        badge: null,
        badgeColor: null,
        accent: "rgba(99,102,241,0.55)",
        btnLabel: "Get Pro",
      },
      {
        id: "elite",
        name: "ELITE",
        price: "$99",
        period: "per month",
        badge: "FOR SERIOUS TRADERS",
        badgeColor: "#f59e0b",
        accent: "rgba(245,158,11,0.55)",
        btnLabel: "Join Elite",
      },
    ];

    async function handleUpgrade(plan) {
      if (plan.id === userPlan) return;
      setUpgradeError("");

      if (plan.id === "free") {
        window.location.href = "/signup?plan=free";
        return;
      }

      setUpgradeLoading(plan.id);
      try {
        const token = localStorage.getItem("aurexis_token");
        const res = await fetch(`${API}/stripe/create-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            plan: plan.id,
            success_url: `${window.location.origin}/app?payment=success`,
            cancel_url: `${window.location.origin}/app`,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setUpgradeError(data?.detail || data?.message || "Could not start checkout."); return; }
        const url = data?.url || data?.checkout_url;
        if (url) {
          let parsed; try { parsed = new URL(String(url)); } catch { parsed = null; }
          if (!parsed || !["https://checkout.stripe.com", "https://billing.stripe.com"].includes(parsed.origin)) {
            setUpgradeError("Invalid checkout URL."); return;
          }
          window.location.href = parsed.href;
        } else {
          setUpgradeError("No checkout URL returned.");
        }
      } catch {
        setUpgradeError("Network error — check your connection.");
      } finally {
        setUpgradeLoading(null);
      }
    }

    return (
      <div style={{ padding: "28px 20px 48px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.textFaint, marginBottom: 10 }}>PRICING</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: T.text, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 10 }}>Simple, transparent pricing.</div>
          <div style={{ fontSize: 13, color: T.textMuted }}>One winning trade covers months of the subscription.</div>
        </div>

        {upgradeError && (
          <div style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.16)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, textAlign: "center" }}>
            {upgradeError}
          </div>
        )}

        {/* Plan grid — 4 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {plans.map((plan) => {
            const isCurrent = plan.id === userPlan;
            const isLoading = upgradeLoading === plan.id;
            const isPopular = plan.badge === "MOST POPULAR";
            const planFeatures = PLAN_FEATURES[plan.id] || new Set();

            return (
              <div key={plan.id} style={{
                borderRadius: 16,
                border: `1px solid ${plan.accent}`,
                background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.98)",
                padding: "24px 18px 20px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                boxShadow: isPopular ? `0 0 0 1px ${plan.accent}, 0 4px 28px rgba(0,180,80,0.10)` : "none",
              }}>
                {/* Badge */}
                {plan.badge && (
                  <div style={{
                    position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                    background: plan.badgeColor, color: "#fff",
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.10em",
                    padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
                  }}>
                    {plan.badge}
                  </div>
                )}

                {/* Plan name */}
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: T.textFaint, marginBottom: 8 }}>{plan.name}</div>

                {/* Price */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", color: T.text, lineHeight: 1 }}>{plan.price}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 18 }}>{plan.period}</div>

                {/* Feature matrix */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                  {FEATURE_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      {/* Category label */}
                      <div style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                        color: T.textFaint, marginBottom: 6, paddingBottom: 4,
                        borderBottom: `1px solid ${T.border}`,
                      }}>
                        {cat.label}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {cat.features.map((feat) => {
                          const included = planFeatures.has(feat.key);
                          return (
                            <div key={feat.key} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                              <span style={{
                                flexShrink: 0, marginTop: 1, fontSize: 12, fontWeight: 700,
                                color: included ? "#00b450" : (darkMode ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.20)"),
                              }}>
                                {included ? "✓" : "✗"}
                              </span>
                              <span style={{
                                fontSize: 11.5,
                                lineHeight: 1.45,
                                color: included ? T.textSec : (darkMode ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.25)"),
                                textDecoration: included ? "none" : "line-through",
                              }}>
                                {feat.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrent || isLoading}
                  style={{
                    display: "block",
                    marginTop: 20,
                    padding: "10px 0",
                    borderRadius: 10,
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isCurrent ? "default" : "pointer",
                    width: "100%",
                    fontFamily: "inherit",
                    background: isCurrent
                      ? (darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)")
                      : isPopular
                        ? "#00b450"
                        : darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                    color: isCurrent ? T.textFaint : isPopular ? "#fff" : T.text,
                    border: isPopular && !isCurrent ? "none" : `1px solid ${T.border2}`,
                    opacity: isLoading ? 0.6 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {isCurrent ? "Current Plan" : isLoading ? "Redirecting…" : plan.btnLabel}
                </button>
                {!isCurrent && <div style={{ fontSize: 10, color: T.textGhost, textAlign: "center", marginTop: 8 }}>Cancel anytime</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  const Launch = () => {
    const [running, setRunning] = useState(false);
    const [rows, setRows] = useState([]);

    const addRow = (next) => {
      setRows((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        next,
      ]);
    };

    const run = async () => {
      if (running) return;
      setRunning(true);
      setRows([]);

      const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      const msSince = () => {
        const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
        return Math.max(0, Math.round(t1 - t0));
      };

      const check = async (label, fn) => {
        const start = msSince();
        try {
          const data = await fn();
          const end = msSince();
          addRow({ label, ok: true, ms: Math.max(0, end - start), detail: "OK" });
          return { ok: true, data };
        } catch (e) {
          const end = msSince();
          addRow({ label, ok: false, ms: Math.max(0, end - start), detail: friendlyError(e, "launch") || String(e?.message || e || "Failed") });
          return { ok: false, data: null };
        }
      };

      const authRes = await check("Alpaca auth valid", async () => apiGetAccount());
      await check("Movers ranking", async () => apiGetMovers());
      await check("Best pick scanning", async () => apiGet("/best_pick_v2?max_scan=1200&allow_llm_news=false"));

      const analyzeRes = await check(
        "Trade plans generating",
        async () => apiAnalyzeSymbol("SPY", { budget: 1000, risk: "medium", timeframe: "swing", timeoutMs: 60000 })
      );

      const unwrapped = analyzeRes?.data ? normalizeAnalysis(analyzeRes.data) : null;
      const a = unwrapped?.analysis && typeof unwrapped.analysis === "object" ? unwrapped.analysis : null;
      const trade = a?.trade_plan && typeof a.trade_plan === "object" ? a.trade_plan : null;
      const exec = a?.execution_plan && typeof a.execution_plan === "object" ? a.execution_plan : null;
      const tech = a?.technical_analysis && typeof a.technical_analysis === "object" ? a.technical_analysis : null;
      const news = a?.news_sentiment && typeof a.news_sentiment === "object" ? a.news_sentiment : null;

      addRow({
        label: "Execution timing working",
        ok: Boolean(exec && (exec.date || exec.window || exec.entry_method || exec.buy_zone)),
        ms: 0,
        detail: exec && (exec.date || exec.window || exec.entry_method || exec.buy_zone) ? "OK" : "Missing execution_plan fields",
      });

      addRow({
        label: "LLM reasoning active",
        ok:
          (Array.isArray(a?.why) && a.why.length > 0) ||
          (Array.isArray(a?.what_confirms) && a.what_confirms.length > 0) ||
          (Array.isArray(a?.what_breaks) && a.what_breaks.length > 0),
        ms: 0,
        detail:
          (Array.isArray(a?.why) && a.why.length > 0) ||
          (Array.isArray(a?.what_confirms) && a.what_confirms.length > 0) ||
          (Array.isArray(a?.what_breaks) && a.what_breaks.length > 0)
            ? "OK"
            : "Missing reasoning arrays",
      });

      addRow({
        label: "Sentiment populated",
        ok: Boolean(news && (news.summary || news.direction || (Array.isArray(news.headlines) && news.headlines.length))),
        ms: 0,
        detail: news && (news.summary || news.direction || (Array.isArray(news.headlines) && news.headlines.length)) ? "OK" : "Missing news_sentiment fields",
      });

      addRow({
        label: "Bars fetching",
        ok: Boolean(tech || a?.technical_analysis || a?.price || a?.price_context),
        ms: 0,
        detail: Boolean(tech || a?.technical_analysis || a?.price || a?.price_context) ? "OK" : "Price/technical fields missing",
      });

      addRow({
        label: "Trade plans generating",
        ok: Boolean(trade && trade.entry !== undefined && trade.entry !== null && String(trade.entry).trim() !== ""),
        ms: 0,
        detail: trade && trade.entry !== undefined && trade.entry !== null && String(trade.entry).trim() !== "" ? "OK" : "Trade plan missing entry",
      });

      if (authRes?.ok) {
        await check("Market state", async () => apiGetMarketState());
      } else {
        addRow({ label: "Market state", ok: false, ms: 0, detail: "Skipped (auth failed)" });
      }

      setRunning(false);
    };

    return (
      <div className="pageGrid">
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">Launch readiness</div>
              <div className="cardSub">Verifies core subsystems and UI bindings.</div>
            </div>
            <div className="cardRight">
              <button className="btn btn--ghost" onClick={run} disabled={running}>
                {running ? "Running…" : "Run checks"}
              </button>
            </div>
          </div>
          <div className="cardBody">
            {rows?.length ? (
              <div className="kv" style={{ marginTop: 0 }}>
                {rows.map((r, i) => (
                  <div key={`lr_${i}`} className="kvRow">
                    <div className="kvKey">{String(r?.label || "")}</div>
                    <div className="kvVal">
                      <span className={r?.ok ? "pill pill--good" : "pill pill--bad"} style={{ marginRight: 10 }}>
                        {r?.ok ? "PASS" : "FAIL"}
                      </span>
                      <span className="mutedSmall">{String(r?.detail || "")}</span>
                      {Number.isFinite(Number(r?.ms)) && Number(r.ms) > 0 ? (
                        <span className="mutedSmall" style={{ marginLeft: 10, opacity: 0.8 }}>{`${Math.round(Number(r.ms))}ms`}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mutedSmall">Run checks to validate production stability.</div>
            )}
          </div>
        </div>
      </div>
    );
  };


  // -------- Save pick (paper portfolio engine) --------
  const AUREXIS_PORTFOLIO_KEY = "AUREXIS_paper_portfolio_v1";


  function useAurexisPortfolio(prices) {
    const [state, setState] = useState(() => {
      try {
        const raw = localStorage.getItem(AUREXIS_PORTFOLIO_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    });


    const base = state && typeof state === "object" ? state : { cash: 100000, positions: [] };


    const positions = Array.isArray(base.positions) ? base.positions : [];


    // compute equity
    let equity = 0;
    for (const p of positions) {
      const sym = String(p.symbol || "").toUpperCase();
      const qty = Number(p.qty);
      const entry = Number(p.entry);
      const now = Number(prices?.[sym]);


      if (!Number.isFinite(qty) || !Number.isFinite(entry)) continue;


      const cost = qty * entry;
      const mv = Number.isFinite(now) ? qty * now : cost;
      equity += mv;
    }


    const cash = Number.isFinite(base.cash) ? base.cash : 0;
    const total = cash + equity;


    const save = (next) => {
      setState(next);
      try {
        localStorage.setItem(AUREXIS_PORTFOLIO_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    };


    const addPosition = (pos) => {
      const sym = String(pos?.symbol || "").toUpperCase();
      const qty = Number(pos?.qty);
      const entry = Number(pos?.entry);


      if (!sym || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(entry) || entry <= 0) {
        return { ok: false, reason: "INVALID" };
      }


      const cost = qty * entry;
      const currentCash = Number.isFinite(base.cash) ? base.cash : 0;


      if (currentCash < cost) {
        return { ok: false, reason: "INSUFFICIENT_CASH" };
      }


      const existingIdx = positions.findIndex((p) => String(p?.symbol || "").toUpperCase() === sym);
      let nextPositions = positions;


      if (existingIdx >= 0) {
        const existing = positions[existingIdx];
        const oldQty = Number(existing?.qty);
        const oldEntry = Number(existing?.entry);
        const newQty = (Number.isFinite(oldQty) ? oldQty : 0) + qty;


        const wavgEntry =
          newQty > 0 && Number.isFinite(oldEntry)
            ? (oldEntry * (Number.isFinite(oldQty) ? oldQty : 0) + entry * qty) / newQty
            : entry;


        const merged = {
          ...existing,
          qty: newQty,
          entry: wavgEntry,
          ts: pos?.ts || new Date().toISOString(),
        };


        nextPositions = positions.map((p, i) => (i === existingIdx ? merged : p));
      } else {
        nextPositions = [pos, ...positions];
      }


      const next = {
        ...base,
        cash: Math.max(0, currentCash - cost),
        positions: nextPositions,
      };


      save(next);
      return { ok: true };
    };


    return { cash, equity, total, positions, addPosition };
  }


  function savePick() {
    // Keep V1 basic: save symbol + entry from analysis if possible
    const sym = normalizeSymbol(symbol);
    const entry = extractAnalysisPrice(analyzeData);


    if (!sym) {
      showToast("Missing symbol");
      return;
    }


    if (entry === null) {
      showToast("Run Analyze first");
      return;
    }


    let qty = null;
    let entryToSave = entry;
    if (tradeType === "shares") {
      const budgetNum = _toNum(sizeBudget);
      const riskPctNum = _toNum(sizeRiskPct);
      const entryNum = _toNum(sizeEntryOverride) !== null ? _toNum(sizeEntryOverride) : entry;
      const stopNum = _toNum(sizeStopOverride) !== null ? _toNum(sizeStopOverride) : _toNum(analyzeData?.price_context?.stop);
      const riskDollars = budgetNum !== null && riskPctNum !== null ? (budgetNum * riskPctNum) / 100.0 : null;
      const riskPerShare = entryNum !== null && stopNum !== null ? entryNum - stopNum : null;
      const byRisk =
        riskDollars !== null && riskPerShare !== null && riskPerShare > 0 ? Math.floor(riskDollars / riskPerShare) : null;
      const byBudget = budgetNum !== null && entryNum !== null && entryNum > 0 ? Math.floor(budgetNum / entryNum) : null;
      const finalShares =
        byRisk !== null && byBudget !== null ? Math.max(0, Math.min(byRisk, byBudget)) : byRisk !== null ? Math.max(0, byRisk) : byBudget;
      qty = Number.isFinite(Number(finalShares)) && Number(finalShares) > 0 ? Number(finalShares) : null;
      entryToSave = Number.isFinite(Number(entryNum)) && Number(entryNum) > 0 ? Number(entryNum) : entry;
    } else {
      // options: use explicit Contracts input only (never invent)
      const c = _toNum(optContracts);
      qty = Number.isFinite(Number(c)) && Number(c) > 0 ? Number(c) : null;
    }


    if (qty === null) {
      showToast("Enter sizing inputs first (qty cannot be determined)");
      return;
    }


    const pos = {
      symbol: sym,
      side: "long",
      qty: qty,
      entry: entryToSave,
      ts: new Date().toISOString(),
    };


    const res = portfolio.addPosition(pos);
    if (res?.ok) {
      showToast("Saved pick");
      return;
    }


    if (res?.reason === "INSUFFICIENT_CASH") {
      showToast("Insufficient paper cash");
      return;
    }


    showToast("Could not save pick");
  }


  // -------- Header command bar --------
  const onCmdChange = (e) => {
    const nextSymbol = String(e.target.value || "").toUpperCase();
    setSymbol(nextSymbol);
    const v = validateCmdSymbol(nextSymbol);
    setCmdErr(v.ok ? "" : v.message);
  };

  function goToAnalyzeFlow() {
    setTab("dashboard");
    requestAnimationFrame(() => {
      cmdInputRef.current?.focus?.();
      cmdInputRef.current?.select?.();
    });
  }


  const onCmdSubmit = (e) => {
    e.preventDefault();
    const v = validateCmdSymbol(symbol);
    if (!v.ok) {
      setCmdErr(v.message);
      showToast(v.message);
      return;
    }
    setSymbol(v.cleaned);
    setCmdErr("");
    showToast("Loaded");
    runAnalyze(v.cleaned);
  };


  const headerAccountValue =
    (account && typeof account === "object" ? account?.equity : null) ??
    (portfolioLive && typeof portfolioLive === "object"
      ? portfolioLive?.account_value ?? portfolioLive?.accountValue ?? portfolioLive?.equity ?? portfolioLive?.total_value
      : null);
  const marketSession = sessionFromClockOrHeuristic(clock) === "OPEN" ? "OPEN" : "CLOSED";

// ------------ Render current tab ------------
const renderPage = () => {
  if (tab === "dashboard") return <Dashboard />;
  if (tab === "movers") return <Movers />;
  if (tab === "screener") return <PlanGate requires="pro" userPlan={userPlan} setTab={setTab}><Screener /></PlanGate>;
  if (tab === "launch") return <Launch />;
  if (tab === "portfolio")
    return (
      <PlanGate requires="pro" userPlan={userPlan} setTab={setTab}>
        <PortfolioErrorBoundary>
          <Portfolio />
        </PortfolioErrorBoundary>
      </PlanGate>
    );
  if (tab === "watchlist") return <PlanGate requires="starter" feature="watchlist" userPlan={userPlan} setTab={setTab}><Watchlist /></PlanGate>;
  if (tab === "tradejournal") return <PlanGate requires="starter" feature="tradejournal" userPlan={userPlan} setTab={setTab}><TradeJournal /></PlanGate>;
  if (tab === "settings") return <Settings />;
  if (tab === "support") return <Support />;
  if (tab === "pricing") return <Pricing />;
  return <Dashboard />;
};


  let safePage = null;
  let safeRenderErr = "";
  try {
    safePage = renderPage();
  } catch (e) {
    safeRenderErr = friendlyError(e, "render");
    safePage = <Dashboard />;
  }




  return (
    <div className="appShell">
      <div className="layout" style={{ display: "flex" }}>
        <aside
          className="sidebar"
          style={{
            width: sidebarCollapsed ? 56 : 200,
            minWidth: sidebarCollapsed ? 56 : 200,
            maxWidth: sidebarCollapsed ? 56 : 200,
            transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1), max-width 0.22s cubic-bezier(0.4,0,0.2,1)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            gap: 0,
            flexShrink: 0,
          }}
        >
          <div className="sideTop" style={{ padding: sidebarCollapsed ? "18px 0 10px" : "18px 14px 10px", transition: "padding 0.22s" }}>
            {!sidebarCollapsed && (
              <div className="sideBrand" style={{ overflow: "hidden" }}>
                <div className="brandName" style={{ fontSize: 15, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>AUREXIS</div>
              </div>
            )}
            {sidebarCollapsed && (
              <div style={{ display: "flex", justifyContent: "center", fontSize: 16, fontWeight: 900, letterSpacing: "0.08em", color: T.text }}>A</div>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarCollapsed ? "center" : "flex-end",
              padding: "4px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.textFaint,
              fontSize: 12,
              marginBottom: 6,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.textSec)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.textFaint)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>

          <nav className="sideNav" style={{ flex: 1, padding: "0 6px", overflow: "hidden" }}>
            {!sidebarCollapsed && (
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textGhost, padding: "0 8px 5px", marginTop: 4 }}>Main</div>
            )}
            {NAV.main.map((n) => {
              const navMinPlan = { screener: "pro" }[n.key];
              const navLocked = navMinPlan && !canAccess(userPlan, navMinPlan);
              return (
                <motion.button
                  key={n.key}
                  className={`sideItem ${tab === n.key ? "sideItem--active" : ""}`}
                  onClick={(e) => { animate(e.currentTarget, { scale: [1, 0.85, 1.15, 1] }, { duration: 0.3, ease: "easeOut" }); setTab(n.key); }}
                  title={sidebarCollapsed ? (navLocked ? `${n.label} (${navMinPlan}+)` : n.label) : undefined}
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{
                    display: "flex", alignItems: "center",
                    gap: sidebarCollapsed ? 0 : 10,
                    justifyContent: sidebarCollapsed ? "center" : "flex-start",
                    padding: sidebarCollapsed ? "9px 0" : "9px 10px",
                    borderRadius: 8, width: "100%", whiteSpace: "nowrap",
                    opacity: navLocked ? 0.55 : 1,
                  }}
                >
                  <span style={{ fontSize: 14, opacity: 0.75, flexShrink: 0 }}>{n.icon}</span>
                  {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{n.label}</span>}
                  {!sidebarCollapsed && navLocked && <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.04em", flexShrink: 0 }}>{navMinPlan === "pro" ? "PRO" : "STARTER"}</span>}
                </motion.button>
              );
            })}

            <div style={{ height: 1, background: T.bg3, margin: "8px 0" }} />

            {!sidebarCollapsed && (
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textGhost, padding: "0 8px 5px" }}>Trading</div>
            )}
            {NAV.trading.map((n) => {
              const navMinPlan = { watchlist: "starter", tradejournal: "starter" }[n.key];
              const navLocked = navMinPlan && !canAccess(userPlan, navMinPlan);
              return (
                <motion.button
                  key={n.key}
                  className={`sideItem ${tab === n.key ? "sideItem--active" : ""}`}
                  onClick={(e) => { animate(e.currentTarget, { scale: [1, 0.85, 1.15, 1] }, { duration: 0.3, ease: "easeOut" }); setTab(n.key); }}
                  title={sidebarCollapsed ? (navLocked ? `${n.label} (${navMinPlan}+)` : n.label) : undefined}
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{
                    display: "flex", alignItems: "center",
                    gap: sidebarCollapsed ? 0 : 10,
                    justifyContent: sidebarCollapsed ? "center" : "flex-start",
                    padding: sidebarCollapsed ? "9px 0" : "9px 10px",
                    borderRadius: 8, width: "100%", whiteSpace: "nowrap",
                    opacity: navLocked ? 0.55 : 1,
                  }}
                >
                  <span style={{ fontSize: 14, opacity: 0.75, flexShrink: 0 }}>{n.icon}</span>
                  {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{n.label}</span>}
                  {!sidebarCollapsed && navLocked && <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.04em", flexShrink: 0 }}>{navMinPlan === "pro" ? "PRO" : "STARTER"}</span>}
                </motion.button>
              );
            })}

            <div style={{ height: 1, background: T.bg3, margin: "8px 0" }} />

            {!sidebarCollapsed && (
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textGhost, padding: "0 8px 5px" }}>Account</div>
            )}
            {NAV.account.map((n) => (
              <motion.button
                key={n.key}
                className={`sideItem ${tab === n.key ? "sideItem--active" : ""}`}
                onClick={(e) => { animate(e.currentTarget, { scale: [1, 0.85, 1.15, 1] }, { duration: 0.3, ease: "easeOut" }); setTab(n.key); }}
                title={sidebarCollapsed ? n.label : undefined}
                whileHover={{ scale: 1.04 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: sidebarCollapsed ? 0 : 10,
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  padding: sidebarCollapsed ? "9px 0" : "9px 10px",
                  borderRadius: 8,
                  width: "100%",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 14, opacity: 0.75, flexShrink: 0 }}>{n.icon}</span>
                {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 500 }}>{n.label}</span>}
              </motion.button>
            ))}
          </nav>

          {/* Account avatar — pinned to bottom of sidebar */}
          <div style={{
            padding: sidebarCollapsed ? "10px 0 42px" : "10px 10px 42px",
            borderTop: `1px solid ${T.border}`,
            marginTop: "auto",
          }}>
            <motion.button
              onClick={() => setTab("settings")}
              title={sidebarCollapsed ? "Account & Settings" : undefined}
              whileHover={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{
                display: "flex", alignItems: "center",
                gap: sidebarCollapsed ? 0 : 10,
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                padding: sidebarCollapsed ? "7px 0" : "7px 8px",
                borderRadius: 10, width: "100%",
                background: "none", border: "none", cursor: "pointer",
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, rgba(0,180,80,0.40) 0%, rgba(0,120,60,0.30) 100%)",
                border: "1.5px solid rgba(0,180,80,0.30)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: T.text,
              }}>{(() => {
                const fn = userProfile?.first_name || "";
                const ln = userProfile?.last_name || "";
                const em = userProfile?.email || "";
                if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
                if (fn) return fn.slice(0,2).toUpperCase();
                if (em) return em.slice(0,2).toUpperCase();
                return "AU";
              })()}</div>
              {!sidebarCollapsed && (
                <div style={{ overflow: "hidden", textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.textSec, whiteSpace: "nowrap" }}>
                    {userProfile?.first_name || userProfile?.email?.split("@")[0] || "My Account"}
                  </div>
                  <div style={{ fontSize: 10, color: T.textFaint, whiteSpace: "nowrap" }}>
                    {userProfile ? (userProfile.plan.charAt(0).toUpperCase() + userProfile.plan.slice(1)) + " Plan" : "Free Plan"}
                  </div>
                </div>
              )}
            </motion.button>
          </div>
        </aside>


        <main className="main" style={{ flex: 1, minWidth: 0 }}>
          {tab === "dashboard" && marketDataFailure ? (
            <SystemAlert type="warning" message="Market data degraded — analytics delayed." />
          ) : null}
          {tab === "dashboard" && analyzeFailure && !loadingAnalyze && Boolean(lastAnalyzeClickAt) ? (
            <SystemAlert type="warning" message="Analysis unavailable — retry." />
          ) : null}
          {debugEnabled ? (
            <div
              style={{
                position: "fixed",
                right: 12,
                bottom: 12,
                width: 360,
                maxWidth: "calc(100vw - 24px)",
                zIndex: 9999,
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${T.border2}`,
                background: "rgba(15, 16, 20, 0.92)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Diagnostics</div>
                <button className="btn btn--ghost" onClick={runDiagnostics} style={{ padding: "6px 10px" }}>
                  Run
                </button>
              </div>
              <div className="mutedSmall" style={{ lineHeight: 1.35 }}>
                <div>API: <b>{debugInfo?.apiStatus || (apiOnline ? "online" : "offline")}</b></div>
                <div>Last: {debugInfo?.lastRequest?.method ? `${debugInfo.lastRequest.method} ${debugInfo.lastRequest.url}` : "—"}</div>
                <div>Status: {debugInfo?.lastRequest?.status ?? "—"} • {debugInfo?.lastRequest?.latencyMs ?? "—"}ms</div>
                <div>Keys: {(Array.isArray(debugInfo?.lastPayloadKeys) ? debugInfo.lastPayloadKeys : []).join(", ") || "—"}</div>
                <div>
                  Shape: {debugInfo?.lastPayloadShape ? JSON.stringify(debugInfo.lastPayloadShape) : "—"}
                </div>
                {debugInfo?.lastError ? <div style={{ marginTop: 8, color: "rgba(255,120,120,0.95)" }}>{debugInfo.lastError}</div> : null}
              </div>
            </div>
          ) : null}
          <div className="headerBar">
            <form className="cmdBar" onSubmit={onCmdSubmit}>
              <span className="analyzeSectionLabel">Analyze Any Stock</span>
              <input ref={cmdInputRef} className="cmdInput" value={symbol} onChange={onCmdChange} placeholder="Ticker (e.g., NVDA)" />
              <RippleButton
                className="btn btn--primary"
                type="button"
                onClick={handleAnalyze}
                disabled={loadingAnalyze || savingPortfolio}
                style={{ zIndex: 50 }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {loadingAnalyze ? <span className="btnSpinner" /> : null}
                  <span>{loadingAnalyze ? "Analyzing…" : "Analyze"}</span>
                  {!loadingAnalyze && !canAccess(userPlan, "starter") && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                      background: analyzeRemaining(userPlan) <= 1 ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.12)",
                      color: analyzeRemaining(userPlan) <= 1 ? "#fca5a5" : "rgba(255,255,255,0.55)",
                      borderRadius: 4, padding: "1px 5px",
                    }}>{analyzeRemaining(userPlan)}/{ANALYZE_FREE_LIMIT}</span>
                  )}
                </span>
              </RippleButton>
            </form>


            <div className="headerRight">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.bg2,
                }}
              >
                <span style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: marketSession === "OPEN" ? "#22c55e" : "rgba(255,255,255,0.25)",
                  flexShrink: 0,
                }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: T.textMuted, whiteSpace: "nowrap" }}>
                    {marketSession === "OPEN" ? "Market Open" : "Market Closed"}
                  </span>
                  <span style={{ fontSize: 10, color: T.textFaint, whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
                    {marketSession === "OPEN"
                      ? `Closes 4:00 PM ET · ${etToLocal(16, 0)} local`
                      : `Opens 9:30 AM ET · ${etToLocal(9, 30)} local`}
                  </span>
                </span>
              </div>
            </div>
          </div>


          <div className="page">
            {tab === "dashboard" && cmdErr ? (
              <div className="monoBox monoBox--bad" style={{ marginBottom: 12 }}>
                {cmdErr}
              </div>
            ) : null}
            {safePage ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {safePage}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="boot">
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Loading AUREXIS…</div>
                <div className="mutedSmall">
                  {safeRenderErr ? safeRenderErr : "Initializing UI."}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn btn--ghost" onClick={() => setTab("dashboard")}>
                    Go to Dashboard
                  </button>
                  <button
                    className="btn btn--ghost"
                    onClick={() => {
                      loadHealth();
                      loadClock();
                      loadAccount();
                      loadMovers();
                      loadBestPick();
                    }}
                  >
                    Retry data
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── end main ─────────────────────────────────────────────────── */}

      </div>
      <div className="persistentRiskFooter">
        <span
          onClick={() => setShowLegalModal(true)}
          style={{ cursor: "pointer", textDecoration: "none", transition: "color 0.15s, text-decoration 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; e.currentTarget.style.color = ""; }}
        >
          For educational and paper-trading use only. Not investment advice. Verify all trades independently.
        </span>
      </div>

      {showLegalModal && (
        <div
          onClick={() => setShowLegalModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#0d1020", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 16, padding: "28px 30px", width: "100%", maxWidth: 360,
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em" }}>Legal</div>
              <button
                onClick={() => setShowLegalModal(false)}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 8, width: 28, height: 28, cursor: "pointer",
                  color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.11)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              >×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { label: "Terms of Service", href: "/terms" },
                { label: "Privacy Policy",   href: "/privacy" },
                { label: "Disclaimer",        href: "/disclaimer" },
                { label: "Refund Policy",     href: "/refund" },
                { label: "Cookie Policy",     href: "/cookies" },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "11px 14px", borderRadius: 10, textDecoration: "none",
                    color: "rgba(255,255,255,0.70)", fontSize: 13, fontWeight: 500,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.92)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "rgba(255,255,255,0.70)"; }}
                >
                  {label}
                  <span style={{ fontSize: 11, opacity: 0.35 }}>↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating AI Chat Widget ──────────────────────────────────────── */}
      {/* FAB toggle button */}
      <button
        onClick={() => { setChatOpen(o => !o); setTimeout(() => chatInputRef.current?.focus(), 80); }}
        title={chatOpen ? "Close AI chat" : "Ask AI"}
        style={{
          position: "fixed",
          bottom: 52,
          right: 20,
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: chatOpen
            ? (darkMode ? "rgba(99,102,241,0.20)" : "rgba(99,102,241,0.14)")
            : "linear-gradient(135deg, #6366f1, #7c3aed)",
          border: chatOpen ? "1px solid rgba(99,102,241,0.40)" : "none",
          boxShadow: chatOpen ? "none" : "0 4px 20px rgba(99,102,241,0.45)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1200,
          transition: "all 0.2s ease",
          flexShrink: 0,
          color: chatOpen ? "rgba(99,102,241,0.85)" : "white",
          fontSize: chatOpen ? 18 : 19,
        }}
      >
        {chatOpen ? "✕" : "✦"}
      </button>

      {/* Chat panel */}
      {chatOpen && (
        <div style={{
          position: "fixed",
          bottom: 108,
          right: 20,
          width: 340,
          maxWidth: "calc(100vw - 40px)",
          height: "min(520px, calc(100vh - 160px))",
          borderRadius: 16,
          background: darkMode ? "rgba(14,17,28,0.97)" : "rgba(248,250,252,0.98)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${T.border2}`,
          boxShadow: darkMode
            ? "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.12)"
            : "0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(99,102,241,0.10)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 1199,
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 14px 11px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
            background: darkMode ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, color: "white", fontWeight: 700,
            }}>✦</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>StackIQ AI</div>
              <div style={{ fontSize: 10, color: T.textFaint, display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 4px #22c55e" }} />
                Live market context
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={chatMessagesRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 12px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {chatHistory.map((m, i) => (
              <div key={i} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: m.role === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  padding: "8px 12px",
                  borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "4px 14px 14px 14px",
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  maxWidth: "84%",
                  wordBreak: "break-word",
                  background: m.role === "user"
                    ? "linear-gradient(135deg, #6366f1, #7c3aed)"
                    : (darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                  color: m.role === "user" ? "#f1f5f9" : T.text,
                  border: m.role === "user" ? "none" : `1px solid ${T.border}`,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "9px 13px",
                background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                border: `1px solid ${T.border}`,
                borderRadius: "4px 14px 14px 14px",
                alignSelf: "flex-start",
              }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{
                    width: 5, height: 5, borderRadius: "50%", background: "#6366f1",
                    animation: "sqBounce 1.1s infinite ease-in-out",
                    animationDelay: `${d * 0.18}s`,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Quick chips — only before first message */}
          {chatHistory.length <= 1 && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 5 }}>
              {["Top pick?", "Win rate?", "Best signal?", "Market regime?"].map(s => (
                <button
                  key={s}
                  onClick={async () => {
                    if (chatLoading) return;
                    const newHistory = [...chatHistory, { role: "user", content: s }];
                    setChatHistory(newHistory);
                    setChatLoading(true);
                    setTimeout(() => { if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight; }, 30);
                    await new Promise(r => setTimeout(r, 420 + Math.random() * 280));
                    const reply = buildChatReply(s);
                    setChatHistory(h => [...h, { role: "assistant", content: reply }]);
                    setChatLoading(false);
                    setTimeout(() => { if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight; }, 30);
                  }}
                  style={{
                    background: darkMode ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.08)",
                    color: "#818cf8",
                    border: "1px solid rgba(99,102,241,0.22)",
                    borderRadius: 20,
                    padding: "4px 10px", fontSize: 11.5, cursor: "pointer",
                    transition: "background 0.15s",
                    fontFamily: "inherit",
                  }}
                >{s}</button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div style={{
            padding: "8px 12px 12px",
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            gap: 7,
            alignItems: "flex-end",
            flexShrink: 0,
          }}>
            <textarea
              ref={chatInputRef}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              placeholder="Ask about picks, signals…"
              rows={1}
              disabled={chatLoading}
              style={{
                flex: 1, resize: "none",
                background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${T.border2}`,
                borderRadius: 10,
                color: T.text, fontSize: 12.5, padding: "8px 11px",
                fontFamily: "inherit", lineHeight: 1.45, outline: "none",
                maxHeight: 80, overflow: "auto",
                transition: "border-color 0.15s",
              }}
            />
            <button
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                width: 36, height: 36,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none", borderRadius: 10, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                opacity: (chatLoading || !chatInput.trim()) ? 0.35 : 1,
                transition: "opacity 0.15s",
                fontSize: 13, color: "white",
              }}
            >➤</button>
          </div>
        </div>
      )}
      {/* ── end floating chat ─────────────────────────────────────────────── */}

      {showAnalyzeModal ? (
        <div className="modalOverlay" onClick={() => setShowAnalyzeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const modalSym = normalizeSymbol(analyzeModalSymbol || analyzeData?.symbol || "");
              const modalAnalysis = (modalSym && analysisBySymbol?.[modalSym]) || analyzeData;
              const safeModalAnalysis = ensureAnalyzeSchema(modalAnalysis, modalSym || analyzeData?.symbol);
              const saveSymbol = normalizeSymbol(modalSym || safeModalAnalysis?.symbol || "");
              return (
                <>
            <div className="modalHead">
              <div className="modalTitle">Analyze: {fmt(saveSymbol || "—")}</div>
              <button className="btn btn--ghost" onClick={() => setShowAnalyzeModal(false)}>
                Close
              </button>
            </div>
            <div className="modalBody">
              <div style={{ marginBottom: 12 }}>
                <button
                  className="btn btn--primary"
                  onClick={() => savePickToPortfolioLive({
                    symbol: saveSymbol,
                    source: "analyze",
                    analysisSnapshot: safeModalAnalysis,
                  })}
                  disabled={!saveSymbol}
                >
                  Save to Portfolio
                </button>
              </div>

              <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>Trade Plan</div>
              <div className="mutedSmall" style={{ marginBottom: 12 }}>
                {(() => {
                  const safeA = safeModalAnalysis;
                  const tp0 = extractTradePlan(safeA);
                  const entries = tp0.entries.length ? tp0.entries : ["—"];
                  return entries.map((x, i) => (
                  <div key={`m_tp_${i}`} style={{ marginBottom: 6 }}>- {fmt(x)}</div>
                  ));
                })()}
              </div>

              <div className="mutedSmall" style={{ fontWeight: 900, marginBottom: 8 }}>Headlines</div>
              <div className="mutedSmall" style={{ maxHeight: 260, overflow: "auto", paddingRight: 4 }}>
                {(() => {
                  const items = extractHeadlines(safeModalAnalysis);
                  const status = String(
                    safeModalAnalysis?.news_status ?? safeModalAnalysis?.newsStatus ?? safeModalAnalysis?.news?.news_status ?? safeModalAnalysis?.news?.status ?? ""
                  ).toLowerCase();
                  if (!items.length && status === "none") return <div>No recent headlines found.</div>;
                  if (!items.length) return <div>—</div>;
                  return items.slice(0, 12).map((it, i) => {
                    const headline = typeof it === "string" ? it : it?.headline ?? it?.title ?? "—";
                    const source = typeof it === "string" ? "NEWS" : String(it?.source || it?.publisher || it?.type || "NEWS").toUpperCase();
                    const published = typeof it === "string" ? null : it?.published_at ?? it?.publishedAt ?? it?.time ?? it?.ts ?? it?.timestamp;
                    return (
                      <div key={`m_h_${i}`} style={{ padding: "10px 0", borderTop: i ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div className="mutedSmall" style={{ fontWeight: 900 }}>{fmt(headline)}</div>
                          <div style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <span className="pill pill--neutral" style={{ padding: "6px 10px", fontSize: 12.5, fontWeight: 800 }}>{fmt(source)}</span>
                            <span className="pill pill--neutral" style={{ padding: "6px 10px", fontSize: 12.5, fontWeight: 800 }}>{fmtTime(published)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}


      {showFeedback ? (
        <div className="modalOverlay" onClick={() => setShowFeedback(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div className="modalTitle">Feedback</div>
              <button className="btn btn--ghost" onClick={() => setShowFeedback(false)}>
                Close
              </button>
            </div>
            <div className="modalBody">
              <textarea
                className="feedbackBox"
                rows={6}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What should we improve?"
              />
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    setFeedbackText("");
                    setShowFeedback(false);
                    showToast("Thank you for your feedback!");
                  }}
                >
                  Submit
                </button>
                <button className="btn btn--ghost" onClick={() => setShowFeedback(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}


      {showPaperTradeModal && paperTradeModalData ? (() => {
        const { symbol: ptSym, entry, stop, target } = paperTradeModalData;
        const acctValue =
          (account && typeof account === "object"
            ? account?.equity ?? account?.account_value ?? account?.buying_power ?? account?.cash
            : null) ?? 100000;
        const acctNum = Number(acctValue);
        const riskDollars = Number.isFinite(acctNum) && acctNum > 0 ? acctNum * 0.02 : null;
        const riskPerShare = (Number.isFinite(entry) && Number.isFinite(stop)) ? Math.abs(entry - stop) : null;
        const positionSharesRisk = riskDollars && riskPerShare ? Math.max(1, Math.floor(riskDollars / riskPerShare)) : null;
        const positionShares = positionSharesRisk != null && Number.isFinite(entry) && entry > 0
          ? Math.min(positionSharesRisk, Math.floor((acctNum * 0.20) / entry))
          : positionSharesRisk;
        const maxLoss = riskDollars;
        const fmt2 = (n) => Number.isFinite(n) ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
        return (
          <div className="modalOverlay" onClick={() => { if (!paperTradeExecuting) setShowPaperTradeModal(false); }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modalHead">
                <div className="modalTitle">Execute Paper Trade — {ptSym}</div>
                <button className="btn btn--ghost" onClick={() => setShowPaperTradeModal(false)} disabled={paperTradeExecuting}>Cancel</button>
              </div>
              <div className="modalBody">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 20 }}>
                  <div>
                    <div className="mutedSmall" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Symbol</div>
                    <div style={{ fontWeight: 900, fontSize: 20 }}>{ptSym}</div>
                  </div>
                  <div>
                    <div className="mutedSmall" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Entry Price</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt2(entry)}</div>
                  </div>
                  <div>
                    <div className="mutedSmall" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Stop Price</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "rgba(248,113,113,0.9)" }}>{fmt2(stop)}</div>
                  </div>
                  <div>
                    <div className="mutedSmall" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Target Price</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "rgba(134,239,172,0.9)" }}>{fmt2(target)}</div>
                  </div>
                  <div>
                    <div className="mutedSmall" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Position Size (2% risk)</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{positionShares != null ? `${positionShares} shares` : "—"}</div>
                  </div>
                  <div>
                    <div className="mutedSmall" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Est. Max Loss</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "rgba(248,113,113,0.9)" }}>{maxLoss != null ? fmt2(maxLoss) : "—"}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 16 }}>
                  Based on 2% account risk of {fmt2(acctNum)} account value.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn btn--primary"
                    style={{ background: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.5)", color: "rgba(134,239,172,1)" }}
                    disabled={paperTradeExecuting}
                    onClick={async () => {
                      setPaperTradeExecuting(true);
                      try {
                        const res = await apiPost("/execute_trade", {
                          symbol: ptSym,
                          entry_price: entry,
                          stop_price: stop,
                          target_price: target,
                          qty: positionShares ?? 1,
                          side: "buy",
                        });
                        const orderId = res?.order_id ?? res?.orderId ?? res?.id ?? res?.data?.order_id ?? res?.data?.id;
                        setShowPaperTradeModal(false);
                        showToast(orderId ? `Order placed — ID: ${orderId}` : "Paper trade executed.", "success");
                      } catch (e) {
                        const reason = e?.message || e?.error || "Execution failed";
                        showToast(`Trade failed: ${reason}`, "error");
                      } finally {
                        setPaperTradeExecuting(false);
                      }
                    }}
                  >
                    {paperTradeExecuting ? <><span className="btnSpinner" style={{ marginRight: 6 }} />Executing…</> : "Confirm & Execute"}
                  </button>
                  <button className="btn btn--ghost" onClick={() => setShowPaperTradeModal(false)} disabled={paperTradeExecuting}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {toast ? <div className={`toast${toastType === "success" ? " toast--success" : toastType === "error" ? " toast--error" : ""}`}>{toast}</div> : null}

      {showOnboarding ? (
        <OnboardingModal userName={onboardingUserName} onDone={() => {
          const token = localStorage.getItem("aurexis_token");
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split(".")[1]));
              if (payload?.sub) localStorage.setItem(`aurexis_onboarding_done_${payload.sub}`, "1");
            } catch {}
          }
          setShowOnboarding(false);
        }} />
      ) : null}
    </div>
  );
}


export default function App() {
  return (
    <AurexisErrorBoundary>
      <AppInner />
    </AurexisErrorBoundary>
  );
}