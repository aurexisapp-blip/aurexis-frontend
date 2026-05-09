import type { AnalyzeResponse } from "./contracts";

const arrStrings = (v: any, max = 12) => {
  const a = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
  return a
    .map((x) => (typeof x === "string" ? x : x === null || x === undefined ? "" : String(x)))
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
};

const toPctUnits = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  // If upstream provides fraction (e.g. -0.0124) normalize to percent units.
  if (Math.abs(n) <= 2) return n * 100;
  return n;
};

const pctFromLastPrev = (last: any, prev: any) => {
  const l = Number(last);
  const p = Number(prev);
  if (!Number.isFinite(l) || !Number.isFinite(p) || p === 0) return null;
  return ((l - p) / p) * 100;
};

export function normalizeAnalysis(raw: AnalyzeResponse | any) {
  const base = raw && typeof raw === "object" ? raw : null;
  const ok = Boolean(
    base?.ok ??
      (typeof base?.status === "string"
        ? base.status.toLowerCase() === "ok" || base.status.toLowerCase() === "partial"
        : false)
  );
  const a0 =
    (base?.analysis && typeof base.analysis === "object" ? base.analysis : null) ||
    (base?.data?.analysis && typeof base.data.analysis === "object" ? base.data.analysis : null) ||
    (base?.result?.analysis && typeof base.result.analysis === "object" ? base.result.analysis : null) ||
    (base?.payload?.analysis && typeof base.payload.analysis === "object" ? base.payload.analysis : null) ||
    (base && typeof base === "object" &&
    !Array.isArray(base) &&
    (base.trade_plan || base.execution_plan || base.news_sentiment || base.technical_analysis || base.classification || base.score)
      ? base
      : null);

  if (!a0) {
    return {
      ok: false,
      analysis: null,
      degraded: Boolean(base?.degraded),
      degradedReason: typeof base?.degraded_reason === "string" ? base.degraded_reason : "",
      payloadVersion: base?.payload_version,
    };
  }

  const analysis = {
    ...a0,
    symbol: String((a0 as any).symbol || "").trim().toUpperCase(),
    score: (a0 as any).score,
    confidence: (a0 as any).confidence,
    classification: (a0 as any).classification,
    system_expectation: (a0 as any).system_expectation,
    why: arrStrings(
      (a0 as any).why ?? (a0 as any)?.decision?.why ?? (a0 as any)?.reasoning?.why,
      10
    ),
    what_confirms: arrStrings(
      (a0 as any).what_confirms ?? (a0 as any).confirms ?? (a0 as any)?.decision?.confirms ?? (a0 as any)?.reasoning?.confirms,
      10
    ),
    what_breaks: arrStrings(
      (a0 as any).what_breaks ?? (a0 as any).breaks ?? (a0 as any)?.decision?.breaks ?? (a0 as any)?.reasoning?.breaks,
      10
    ),
    when_to_recheck: String(
      (a0 as any).when_to_recheck ??
        (a0 as any).when_to_recheck_again ??
        (a0 as any).when_to_check_again ??
        (a0 as any).when_check_again ??
        (a0 as any).check_again ??
        (a0 as any).recheck ??
        (a0 as any)?.decision?.recheck ??
        (a0 as any)?.reasoning?.recheck ??
        ""
    ).trim(),
    execution_plan: (a0 as any).execution_plan && typeof (a0 as any).execution_plan === "object" ? (a0 as any).execution_plan : {},
    trade_plan: (a0 as any).trade_plan && typeof (a0 as any).trade_plan === "object" ? (a0 as any).trade_plan : {},
    news_sentiment:
      (a0 as any).news_sentiment && typeof (a0 as any).news_sentiment === "object"
        ? (a0 as any).news_sentiment
        : (a0 as any).newsSentiment && typeof (a0 as any).newsSentiment === "object"
          ? (a0 as any).newsSentiment
          : (a0 as any).news && typeof (a0 as any).news === "object"
            ? (a0 as any).news
            : {},
    technical_analysis: (a0 as any).technical_analysis && typeof (a0 as any).technical_analysis === "object" ? (a0 as any).technical_analysis : {},
    last_price:
      (a0 as any).last_price ??
      (a0 as any).lastPrice ??
      (a0 as any).snapshot?.latestTrade?.p ??
      (a0 as any).snapshot?.last,
    prev_close:
      (a0 as any).prev_close ??
      (a0 as any).prevClose ??
      (a0 as any).snapshot?.prevDailyBar?.c,
    percent_change: (() => {
      const raw =
        (a0 as any).percent_change ??
        (a0 as any).percentChange ??
        (a0 as any).pct_change ??
        (a0 as any).pctChange ??
        (a0 as any).change_pct ??
        (a0 as any).changePct ??
        (a0 as any).snapshot?.todaysChangePerc;
      const pct0 = toPctUnits(raw);
      if (pct0 !== null) return pct0;
      const fb = pctFromLastPrev((a0 as any).last_price ?? (a0 as any).snapshot?.latestTrade?.p, (a0 as any).prev_close ?? (a0 as any).snapshot?.prevDailyBar?.c);
      return fb !== null ? fb : 0;
    })(),
  };

  return {
    ok,
    analysis,
    degraded: Boolean(base?.degraded),
    degradedReason: typeof base?.degraded_reason === "string" ? base.degraded_reason : "",
    payloadVersion: base?.payload_version,
  };
}
