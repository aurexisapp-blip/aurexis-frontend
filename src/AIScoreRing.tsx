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
  size = 150,
  strokeWidth = 18,
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
    if (band === "na") return { a: "rgba(255,255,255,0.22)", b: "rgba(255,255,255,0.22)" };
    return colorsForBand(band);
  }, [band]);

  const targetOffset = useMemo(() => {
    if (!hasScore) return c;
    return c * (1 - score100 / 100);
  }, [c, hasScore, score100]);

  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (loading) { setDisplay(0); return; }
    if (!hasScore) { setDisplay(0); return; }

    const to = Math.round(score100);
    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const easeOut = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round((to) * easeOut));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loading, hasScore, score100]);

  // Scale typography with ring size
  const labelFs  = Math.max(9,  Math.round(size * 0.068));
  const scoreFs  = Math.max(28, Math.round(size * 0.253));
  const subFs    = Math.max(9,  Math.round(size * 0.076));

  const arcColor = hasScore && !loading ? `url(#grad_${id})` : "rgba(255,255,255,0.16)";
  const numColor = hasScore && !loading ? colors.a : "rgba(255,255,255,0.82)";

  const wrapStyle = useMemo(() => ({
    width: size,
    height: size,
    borderRadius: 9999,
    display: "grid",
    placeItems: "center",
    position: "relative" as const,
    background: "radial-gradient(closest-side, rgba(0,0,0,0.58) 40%, rgba(0,0,0,0.22) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    ...(hasScore && !loading ? {
      boxShadow: `0 0 0 1px ${colors.a}1a, 0 0 22px ${colors.a}38, 0 0 48px ${colors.a}18`,
    } : {}),
  }), [size, hasScore, loading, colors]);

  return (
    <div className={loading ? "aiRing aiRing--loading" : "aiRing"} style={wrapStyle}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block", position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id={`grad_${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.a} />
            <stop offset="100%" stopColor={colors.b} />
          </linearGradient>
          <filter id={`glow_${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={loading ? c * 0.35 : targetOffset}
            filter={hasScore && !loading ? `url(#glow_${id})` : undefined}
            style={{ transition: loading ? "none" : "stroke-dashoffset 1.2s ease-out" }}
          />
        </g>
      </svg>

      {/* Center content */}
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        textAlign: "center",
        userSelect: "none",
        zIndex: 1,
      }}>
        <div style={{
          fontSize: labelFs,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.38)",
          lineHeight: 1,
        }}>
          {label}
        </div>

        <div style={{
          fontSize: scoreFs,
          fontWeight: 800,
          lineHeight: 1,
          color: numColor,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.025em",
          marginTop: 2,
        }}>
          {loading ? "—" : hasScore ? String(display) : "—"}
        </div>

        {!loading && !hasScore ? (
          <div style={{
            fontSize: subFs, fontWeight: 600, letterSpacing: "0.05em",
            color: "rgba(255,255,255,0.30)", textTransform: "uppercase",
          }}>
            N/A
          </div>
        ) : showConfidence && !loading && hasScore ? (
          <div style={{
            fontSize: subFs, fontWeight: 600, letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.38)", textTransform: "uppercase",
            marginTop: 1,
          }}>
            CONF {fmtPct(confidence)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
