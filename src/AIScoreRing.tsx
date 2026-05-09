import React, { useEffect, useId, useMemo, useRef, useState } from "react";

function clamp100(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function bandForScore(score100) {
  if (score100 <= 40) return "red";
  if (score100 <= 70) return "yellow";
  return "green";
}

function colorsForBand(band) {
  if (band === "red") return { a: "#ef4444", b: "#fb7185" };
  if (band === "yellow") return { a: "#f59e0b", b: "#fde047" };
  return { a: "#22c55e", b: "#00ff87" };
}

function fmtPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const v0 = v <= 1 ? v * 100 : v;
  return `${Math.round(Math.max(0, Math.min(100, v0)))}%`;
}

export default function AIScoreRing({
  score,
  confidence,
  label = "AI SCORE",
  size = 160,
  strokeWidth = 14,
  loading = false,
  showConfidence = true,
}) {
  const id = useId();

  const score100 = clamp100(score);
  const hasScore = score100 !== null;

  const r = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    return Math.max(8, radius);
  }, [size, strokeWidth]);

  const c = useMemo(() => 2 * Math.PI * r, [r]);

  const band = useMemo(() => {
    if (!hasScore) return "na";
    return bandForScore(score100);
  }, [hasScore, score100]);

  const colors = useMemo(() => {
    if (band === "na") return { a: "rgba(255,255,255,0.30)", b: "rgba(255,255,255,0.30)" };
    return colorsForBand(band);
  }, [band]);

  const targetOffset = useMemo(() => {
    if (!hasScore) return c;
    return c * (1 - score100 / 100);
  }, [c, hasScore, score100]);

  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (loading) {
      setDisplay(0);
      return;
    }
    if (!hasScore) {
      setDisplay(0);
      return;
    }

    const to = Math.round(score100);
    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const next = Math.round(0 + (to - 0) * easeOut);
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loading, hasScore, score100]);

  const glowStyle = useMemo(() => {
    if (!hasScore || loading) return undefined;
    const glowA = colors.a;
    const glowB = colors.b;
    return {
      boxShadow: `0 0 18px ${glowA}99, 0 0 36px ${glowB}59`,
    };
  }, [colors, hasScore, loading]);

  const ringWrapStyle = useMemo(() => {
    return {
      width: size,
      height: size,
      borderRadius: 999,
      display: "grid",
      placeItems: "center",
      position: "relative",
      background: "radial-gradient(closest-side, rgba(0,0,0,0.46), rgba(0,0,0,0.12))",
      border: "1px solid rgba(255,255,255,0.08)",
      ...glowStyle,
    };
  }, [glowStyle, size]);

  const centerText = loading ? "SCANNING…" : hasScore ? String(display) : "—";

  return (
    <div className={loading ? "aiRing aiRing--loading" : "aiRing"} style={ringWrapStyle as any}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id={`ai_grad_${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.a} />
            <stop offset="100%" stopColor={colors.b} />
          </linearGradient>
        </defs>

        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />

          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={hasScore && !loading ? `url(#ai_grad_${id})` : "rgba(255,255,255,0.20)"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={loading ? c * 0.35 : targetOffset}
            style={{
              transition: loading ? "none" : "stroke-dashoffset 1.2s ease-out",
              filter: !hasScore || loading ? "none" : "drop-shadow(0 0 10px rgba(0,0,0,0.25))",
            }}
          />
        </g>
      </svg>

      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
        <div style={{ display: "grid", placeItems: "center", gap: 6, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 0.18, textTransform: "uppercase", color: "rgba(255,255,255,0.62)" }}>
            {label}
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: "rgba(255,255,255,0.92)" }}>
            {centerText}
          </div>
          {!loading && !hasScore ? (
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.12, color: "rgba(255,255,255,0.55)" }}>
              Unavailable
            </div>
          ) : null}
          {showConfidence ? (
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.12, color: "rgba(255,255,255,0.70)" }}>
              {loading ? "" : `Confidence ${fmtPct(confidence)}`}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
