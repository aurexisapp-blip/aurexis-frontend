import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";

// ── Global CSS ────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes starterGlow {
    0%, 100% {
      box-shadow: 0 0 24px rgba(34,197,94,0.07), 0 0 0 1px rgba(34,197,94,0.22);
    }
    50% {
      box-shadow: 0 0 80px rgba(34,197,94,0.26), 0 0 160px rgba(34,197,94,0.08), 0 0 0 1px rgba(34,197,94,0.68);
    }
  }
  @keyframes eliteGlow {
    0%, 100% {
      box-shadow: 0 0 24px rgba(245,158,11,0.07), 0 0 0 1px rgba(245,158,11,0.22);
    }
    50% {
      box-shadow: 0 0 80px rgba(245,158,11,0.24), 0 0 160px rgba(245,158,11,0.07), 0 0 0 1px rgba(245,158,11,0.65);
    }
  }
  @keyframes demoSpin {
    to { transform: rotate(360deg); }
  }
`;
function GlobalStyle() { return <style>{GLOBAL_CSS}</style>; }

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target, { duration = 1800, decimals = 0, enabled = false } = {}) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [enabled, target, duration, decimals]);
  return value;
}

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(text, { speed = 42, startDelay = 320 } = {}) {
  const [displayed, setDisplayed] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let timeout;
    const start = () => {
      let i = 0;
      const type = () => {
        i++;
        setDisplayed(i);
        if (i < text.length) timeout = setTimeout(type, speed);
        else setDone(true);
      };
      timeout = setTimeout(type, speed);
    };
    const delay = setTimeout(start, startDelay);
    return () => { clearTimeout(delay); clearTimeout(timeout); };
  }, [text, speed, startDelay]);
  return { displayed, done };
}

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 28, x = 0, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, x }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], delay: delay / 1000 }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ── Ticker tape ───────────────────────────────────────────────────────────────
const TICKERS = [
  { sym: "MRVL", chg: "+36.4%" },
  { sym: "PYPL", chg: "+12.1%" },
  { sym: "EWZ",  chg: "+8.3%"  },
  { sym: "EBAY", chg: "+6.2%"  },
  { sym: "KRE",  chg: "+4.8%"  },
];

function TickerTape() {
  const items = [...TICKERS, ...TICKERS, ...TICKERS, ...TICKERS];
  return (
    <div style={{
      overflow: "hidden",
      borderTop: "1px solid rgba(34,197,94,0.07)",
      borderBottom: "1px solid rgba(34,197,94,0.07)",
      background: "rgba(0,0,0,0.85)",
      padding: "9px 0",
    }}>
      <motion.div
        style={{ display: "flex", gap: 0, width: "max-content" }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
      >
        {items.map(({ sym, chg }, i) => (
          <div key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "0 40px", borderRight: "1px solid rgba(255,255,255,0.04)",
            whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>{sym}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.04em" }}>{chg}</span>
            <span style={{ fontSize: 9, color: "rgba(34,197,94,0.5)", fontWeight: 700 }}>✓</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Proof trades — Bloomberg terminal cards ───────────────────────────────────
const PROOF_TRADES = [
  { sym: "MRVL",  entry: "$98",    exit: "$139",   date: "APR 2026" },
  { sym: "PYPL",  entry: "$62",    exit: "$69.50", date: "MAR 2026" },
  { sym: "EWZ",   entry: "$29.40", exit: "$31.85", date: "MAR 2026" },
  { sym: "EBAY",  entry: "$90.80", exit: "$97.70", date: "APR 2026" },
  { sym: "NOK",   entry: "$8.06",  exit: "$10.40", date: "APR 2026" },
  { sym: "KRE",   entry: "$63.50", exit: "$69.85", date: "APR 2026" },
  { sym: "CSCO",  entry: "$84.50", exit: null,     date: "APR 2026", pending: true },
];

function ProofStrip() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <div ref={ref} style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", paddingBottom: 4 }}>
      <div style={{ display: "flex", gap: 10, padding: "0 24px", width: "max-content" }}>
        {PROOF_TRADES.map(({ sym, entry, exit, date, pending }, i) => (
          <motion.div
            key={sym}
            style={{
              padding: "16px 18px",
              background: pending ? "rgba(6,6,4,0.97)" : "rgba(3,7,3,0.97)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              borderLeft: pending ? "3px solid rgba(245,158,11,0.7)" : "3px solid #22c55e",
              borderRadius: "0 8px 8px 0",
              minWidth: 175,
              fontFamily: '"SF Mono", "Fira Code", "Courier New", monospace',
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
          >
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              marginBottom: 9, textTransform: "uppercase",
              color: pending ? "rgba(245,158,11,0.6)" : "rgba(34,197,94,0.6)",
            }}>
              {date} · {pending ? "OPEN TRADE" : "ALPACA VERIFIED"}
            </div>
            <div style={{
              fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.01em", marginBottom: 10,
              fontFamily: '"Inter", -apple-system, sans-serif',
            }}>
              {sym}
            </div>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span>BUY <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 600 }}>{entry}</span></span>
              {exit ? (
                <>
                  <span style={{ color: "rgba(255,255,255,0.16)", fontSize: 8 }}>▶</span>
                  <span>EXIT <span style={{ color: "#22c55e", fontWeight: 600 }}>{exit}</span></span>
                </>
              ) : (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: "rgba(245,158,11,0.75)",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 4, padding: "2px 6px", letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  PENDING
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: "#000",
    color: "rgba(255,255,255,0.92)",
    minHeight: "100vh",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    overflowX: "hidden",
    position: "relative",
  },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "22px 32px", maxWidth: 1160, margin: "0 auto",
  },
  navLogo: {
    fontSize: 16, fontWeight: 900, letterSpacing: "0.18em",
    color: "rgba(255,255,255,0.95)",
  },
  navCta: {
    padding: "9px 22px", borderRadius: 7,
    border: "1px solid rgba(34,197,94,0.35)",
    background: "transparent",
    color: "rgba(134,239,172,0.9)", fontSize: 13, fontWeight: 600,
    cursor: "pointer", letterSpacing: "0.02em",
  },
  // Hero
  heroWrap: {
    position: "relative", minHeight: "100vh",
    display: "flex", flexDirection: "column",
    justifyContent: "center", alignItems: "center",
    textAlign: "center", padding: "120px 24px 100px",
    overflow: "hidden",
  },
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px",
    borderRadius: 999, border: "1px solid rgba(34,197,94,0.22)",
    background: "rgba(34,197,94,0.06)",
    fontSize: 11, fontWeight: 700, color: "rgba(134,239,172,0.8)",
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 36,
  },
  heroDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
    display: "inline-block", boxShadow: "0 0 8px rgba(34,197,94,0.8)",
  },
  heroLine1: {
    fontSize: "clamp(36px, 5.5vw, 64px)", fontWeight: 900, lineHeight: 1.1,
    letterSpacing: "-0.03em", color: "rgba(255,255,255,0.93)",
    margin: 0, display: "block",
  },
  heroLine2: {
    fontSize: "clamp(36px, 5.5vw, 64px)", fontWeight: 900, lineHeight: 1.1,
    letterSpacing: "-0.03em", margin: "0 0 32px",
    background: "linear-gradient(135deg, #4ade80 0%, #22d3ee 60%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    backgroundClip: "text", display: "block",
  },
  heroSub: {
    fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.42)",
    lineHeight: 1.6, margin: "0 auto 44px", maxWidth: 460,
  },
  heroCta: {
    display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 38px",
    borderRadius: 9, border: "none",
    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
    letterSpacing: "0.01em",
    boxShadow: "0 0 40px rgba(22,163,74,0.4), 0 4px 20px rgba(0,0,0,0.4)",
  },
  heroCtaSub: {
    marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.25)",
    letterSpacing: "0.02em",
  },
  // Section
  section: { padding: "80px 24px", maxWidth: 1100, margin: "0 auto" },
  sectionLabel: {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.16em",
    textTransform: "uppercase", color: "rgba(34,197,94,0.65)", marginBottom: 14,
  },
  sectionTitle: {
    fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, letterSpacing: "-0.025em",
    color: "rgba(255,255,255,0.92)", marginBottom: 10,
  },
  sectionSub: {
    fontSize: 14, color: "rgba(255,255,255,0.38)", lineHeight: 1.65,
    marginBottom: 52, maxWidth: 440,
  },
  // Divider
  divider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
    margin: "0 32px",
  },
  // Stats bar
  statsBar: {
    background: "#080808",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    display: "flex", alignItems: "stretch",
  },
  statsBarSep: {
    width: 1, background: "rgba(255,255,255,0.06)", flexShrink: 0,
  },
  // How it works
  timelineWrap: {
    position: "relative", display: "flex",
    gap: 0, marginTop: 16,
  },
  timelineTrack: {
    position: "absolute",
    top: 20, left: "16.67%", right: "16.67%",
    height: 1, background: "rgba(34,197,94,0.18)",
    zIndex: 0,
  },
  timelineItem: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", textAlign: "center", padding: "0 20px",
    position: "relative", zIndex: 1,
  },
  timelineNum: {
    width: 40, height: 40, borderRadius: "50%",
    border: "1px solid rgba(34,197,94,0.35)",
    background: "#000",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 800, color: "rgba(34,197,94,0.85)",
    marginBottom: 24, flexShrink: 0,
  },
  timelineTitle: {
    fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.88)",
    marginBottom: 10, letterSpacing: "-0.01em", lineHeight: 1.35,
  },
  timelineDesc: {
    fontSize: 12, color: "rgba(255,255,255,0.36)", lineHeight: 1.65,
  },
  // Proof section header
  proofSectionLabel: {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.16em",
    textTransform: "uppercase", color: "rgba(34,197,94,0.65)",
    marginBottom: 10,
  },
  proofSectionTitle: {
    fontSize: "clamp(20px, 3vw, 30px)", fontWeight: 800, letterSpacing: "-0.02em",
    color: "rgba(255,255,255,0.88)", marginBottom: 8,
  },
  proofSectionSub: {
    fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 36,
  },
  // Pricing
  pricingRow: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14, alignItems: "start",
  },
  pricingCard: {
    padding: "32px 28px", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.07)",
    background: "#0a0a0a",
  },
  pricingCardFeatured: {
    padding: "32px 28px", borderRadius: 14,
    background: "#060d06",
    animation: "starterGlow 3.5s ease-in-out infinite",
  },
  pricingCardElite: {
    padding: "32px 28px", borderRadius: 14,
    background: "#0d0a04",
    animation: "eliteGlow 3.5s ease-in-out infinite",
  },
  pricingBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.28)",
    fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
    color: "rgba(134,239,172,0.9)", textTransform: "uppercase", marginBottom: 18,
  },
  pricingTier: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
    textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 12,
  },
  pricingPrice: {
    fontSize: 44, fontWeight: 900, letterSpacing: "-0.04em",
    color: "rgba(255,255,255,0.93)", lineHeight: 1, marginBottom: 4,
  },
  pricingPeriod: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 26 },
  pricingFeatures: { listStyle: "none", padding: 0, margin: "0 0 28px", display: "grid", gap: 11 },
  pricingFeature: {
    fontSize: 13, color: "rgba(255,255,255,0.52)",
    display: "flex", alignItems: "flex-start", gap: 9, lineHeight: 1.45,
  },
  pricingCheck: { color: "#22c55e", fontWeight: 700, flexShrink: 0, marginTop: 1, fontSize: 12 },
  pricingCheckMuted: { color: "rgba(255,255,255,0.18)", fontWeight: 700, flexShrink: 0, marginTop: 1, fontSize: 12 },
  pricingBtn: {
    width: "100%", padding: "12px 0", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.62)", fontSize: 13, fontWeight: 600,
    cursor: "pointer", letterSpacing: "0.02em",
  },
  pricingBtnFeatured: {
    width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
    letterSpacing: "0.02em",
    boxShadow: "0 4px 20px rgba(22,163,74,0.3)",
  },
  pricingBtnElite: {
    width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg, #92400e 0%, #78350f 100%)",
    color: "rgba(253,230,138,0.95)", fontSize: 13, fontWeight: 700,
    cursor: "pointer", letterSpacing: "0.02em",
    boxShadow: "0 4px 20px rgba(245,158,11,0.2)",
  },
  pricingBadgeElite: {
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.28)",
    fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
    color: "rgba(253,230,138,0.85)", textTransform: "uppercase", marginBottom: 18,
  },
  cancelAnytime: {
    textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)",
    marginTop: 12, letterSpacing: "0.02em",
  },
  // Footer
  footer: {
    borderTop: "1px solid rgba(255,255,255,0.04)",
    padding: "40px 24px", textAlign: "center",
  },
  footerLogo: {
    fontSize: 13, fontWeight: 900, letterSpacing: "0.2em",
    color: "rgba(255,255,255,0.3)", marginBottom: 16,
  },
  footerDisclaimer: {
    fontSize: 11, color: "rgba(255,255,255,0.18)", lineHeight: 1.7,
    maxWidth: 540, margin: "0 auto",
  },
  footerCopy: {
    marginTop: 20, fontSize: 11, color: "rgba(255,255,255,0.15)",
  },
};

// ── Stats bar item ────────────────────────────────────────────────────────────
function StatBarItem({ raw, label, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const parsed = (() => {
    const s = String(raw);
    const prefix = s.startsWith("+") ? "+" : "";
    const suffix = s.includes("%") ? "%" : s.includes(",") || s.match(/\d{4,}/) ? "" : "";
    const num = parseFloat(s.replace(/[^0-9.]/g, ""));
    const decimals = (s.split(".")[1] || "").replace(/[^0-9]/g, "").length;
    return { prefix, suffix, target: isNaN(num) ? 0 : num, decimals, original: s };
  })();
  const count = useCountUp(parsed.target, { duration: 1800, decimals: parsed.decimals, enabled: inView });

  // For values like "1,200" (large integers), format with commas
  const formatted = (() => {
    const v = count.toFixed(parsed.decimals);
    const n = parseFloat(v);
    if (parsed.target >= 1000) {
      return n.toLocaleString("en-US", { maximumFractionDigits: parsed.decimals });
    }
    return v;
  })();

  // Reconstruct suffix from original
  const origSuffix = (() => {
    const s = String(raw);
    if (s.endsWith("%")) return "%";
    if (s.endsWith("+")) return "+";
    return "";
  })();

  return (
    <motion.div
      ref={ref}
      style={{ flex: 1, textAlign: "center", padding: "60px 32px" }}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: delay / 1000 }}
    >
      <div style={{
        fontSize: "clamp(38px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-0.04em",
        background: "linear-gradient(135deg, #4ade80, #22d3ee)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text", lineHeight: 1, marginBottom: 12,
      }}>
        {parsed.prefix}{formatted}{origSuffix}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)",
        letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        {label}
      </div>
    </motion.div>
  );
}

// ── Method card (extracted to avoid hooks-in-map violation) ──────────────────
function MethodCard({ num, title, body, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      style={{
        flex: "1 1 260px", minWidth: 240,
        background: "rgba(255,255,255,0.025)", borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "28px 24px",
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: index * 0.12 }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: "50%",
        border: "1px solid rgba(34,197,94,0.35)", background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, color: "rgba(34,197,94,0.85)",
        marginBottom: 20,
      }}>
        {num}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.88)", marginBottom: 10, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", lineHeight: 1.7 }}>
        {body}
      </div>
    </motion.div>
  );
}

// ── Pricing card (extracted to avoid hooks-in-map violation) ──────────────────
function PricingCard({ plan, index, onGetStarted }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const [tipVisible, setTipVisible] = useState(false);
  const { cardStyle, badge, badgeStyle, tier, price, period, features, btnStyle, btnHover, btnLabel, featuredColor, checkColor } = plan;
  return (
    <motion.div
      ref={ref}
      style={cardStyle}
      initial={{ opacity: 0, scale: 0.88, y: 28 }}
      animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ type: "spring", stiffness: 220, damping: 22, delay: index * 0.1 }}
    >
      {badge ? <div style={badgeStyle || S.pricingBadge}>{badge}</div> : null}
      <div style={S.pricingTier}>{tier}</div>
      <div style={S.pricingPrice}>{price}</div>
      <div style={S.pricingPeriod}>{period}</div>
      <ul style={S.pricingFeatures}>
        {features.map(([check, feat]) => (
          <li key={feat} style={{ ...S.pricingFeature, ...(featuredColor ? { color: featuredColor } : {}) }}>
            <span style={check === "✓" ? (checkColor ? { ...S.pricingCheck, color: checkColor } : S.pricingCheck) : S.pricingCheckMuted}>{check}</span>
            <span>{feat}</span>
          </li>
        ))}
      </ul>
      <motion.button
        style={btnStyle}
        whileHover={btnHover}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => window.location.href = "/waitlist"}
      >
        {btnLabel}
      </motion.button>
      <div style={{ ...S.cancelAnytime, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        Cancel anytime
        <span
          style={{ position: "relative", display: "inline-flex", width: 14, height: 14, borderRadius: "50%",
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)",
            fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)",
            alignItems: "center", justifyContent: "center", cursor: "default", flexShrink: 0,
          }}
          onMouseEnter={() => setTipVisible(true)}
          onMouseLeave={() => setTipVisible(false)}
        >
          ?
          {tipVisible && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
              transform: "translateX(-50%)",
              background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, padding: "9px 13px",
              fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.55,
              width: 210, textAlign: "center", whiteSpace: "normal",
              boxShadow: "0 6px 24px rgba(0,0,0,0.55)", zIndex: 100,
              pointerEvents: "none",
            }}>
              Cancel with one click in your account. No questions asked. No fees.
            </div>
          )}
        </span>
      </div>
    </motion.div>
  );
}

// ── Product demo ─────────────────────────────────────────────────────────────
function ProductDemo() {
  const [phase, setPhase] = useState("idle");
  const [typedLen, setTypedLen] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const SYMBOL = "MRVL";

  useEffect(() => {
    if (!inView) return;
    const timers = [];
    const T = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); };

    const cycle = () => {
      setPhase("idle");
      setTypedLen(0);

      // Phase 2: type MRVL starting at 2s, one char every 480ms
      for (let i = 1; i <= SYMBOL.length; i++) {
        const len = i;
        T(() => { setPhase("typing"); setTypedLen(len); }, 2000 + (i - 1) * 480);
      }
      // Phase 3: cursor moves to button, click at 4.2s
      T(() => setPhase("clicking"), 4200);
      T(() => setPhase("loading"), 4420);
      // Phase 4: results appear at 5.2s
      T(() => setPhase("results"), 5200);
      // Phase 6: fade at 11s, restart at 12s
      T(() => setPhase("fade"), 11000);
      T(cycle, 12000);
    };

    cycle();
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  const typed = SYMBOL.slice(0, typedLen);
  const showInputCursor = phase === "idle" || phase === "typing";
  const isLoading = phase === "loading";
  const showResults = phase === "results" || phase === "fade";
  const fading = phase === "fade";

  // Fake mouse cursor: smoothly interpolates between positions
  const cursorPos = (() => {
    if (phase === "idle")     return { top: 71, left: 214 };
    if (phase === "typing")   return { top: 71, left: 214 + typedLen * 11 };
    if (phase === "clicking") return { top: 71, left: 756 };
    if (phase === "loading")  return { top: 71, left: 756 };
    if (phase === "results")  return { top: 228, left: 460 };
    if (phase === "fade")     return { top: 228, left: 460 };
    return { top: 71, left: 214 };
  })();

  const NAV_ITEMS = [
    { icon: "◈", label: "Dashboard",    active: true  },
    { icon: "▲", label: "Movers",       active: false },
    { icon: "⊞", label: "Screener",     active: false },
    { icon: "◉", label: "Watchlist",    active: false },
    { icon: "☰", label: "Trade Journal",active: false },
  ];

  return (
    <div ref={ref} style={{
      borderRadius: 13, overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.09)",
      boxShadow: "0 0 0 1px rgba(34,197,94,0.05), 0 40px 100px rgba(0,0,0,0.7), 0 0 120px rgba(34,197,94,0.06)",
      maxWidth: 900, margin: "0 auto",
    }}>
      {/* Browser chrome */}
      <div style={{
        background: "#161616", padding: "11px 16px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
        </div>
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 5,
          padding: "5px 12px", fontSize: 11, color: "rgba(255,255,255,0.28)",
          fontFamily: '"SF Mono","Fira Code","Courier New",monospace',
          textAlign: "center", border: "1px solid rgba(255,255,255,0.06)", letterSpacing: "0.02em",
        }}>
          aurexis.app/analyze
        </div>
        <div style={{ width: 60, flexShrink: 0 }} />
      </div>

      {/* App shell */}
      <div style={{
        display: "flex", background: "#07090e", position: "relative",
        minHeight: 390,
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.85s ease" : "none",
      }}>

        {/* Fake mouse cursor */}
        <div style={{
          position: "absolute",
          top: cursorPos.top,
          left: cursorPos.left,
          width: 13, height: 13, borderRadius: "50%",
          background: "rgba(255,255,255,0.88)",
          boxShadow: "0 0 0 1.5px rgba(0,0,0,0.35), 0 2px 10px rgba(0,0,0,0.55)",
          pointerEvents: "none",
          zIndex: 50,
          transform: phase === "clicking" ? "scale(0.78)" : "scale(1)",
          opacity: phase === "results" || phase === "fade" ? 0.35 : 1,
          transition: "top 0.45s cubic-bezier(0.22,1,0.36,1), left 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.1s ease, opacity 0.4s ease",
        }} />

        {/* Sidebar */}
        <div style={{
          width: 168, background: "#050709",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          padding: "18px 0", flexShrink: 0,
        }}>
          <div style={{
            padding: "0 16px 22px",
            fontSize: 10, fontWeight: 900, letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.32)",
          }}>
            AUREXIS
          </div>
          {NAV_ITEMS.map(({ icon, label, active }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "9px 13px", margin: "1px 7px", borderRadius: 7,
              background: active ? "rgba(34,197,94,0.09)" : "transparent",
              color: active ? "rgba(134,239,172,0.88)" : "rgba(255,255,255,0.25)",
              fontSize: 12, fontWeight: active ? 600 : 400,
            }}>
              <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
              <span style={{ letterSpacing: "-0.01em" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Label */}
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "rgba(34,197,94,0.5)",
          }}>
            Analyze any stock
          </div>

          {/* Input + button */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.04)", height: 44,
              border: isLoading
                ? "1px solid rgba(34,197,94,0.45)"
                : "1px solid rgba(255,255,255,0.09)",
              borderRadius: 9, padding: "0 14px", gap: 8,
              transition: "border-color 0.3s ease",
            }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", flexShrink: 0 }}>⊞</span>
              <span style={{
                fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", flex: 1,
                color: "rgba(255,255,255,0.90)",
                fontFamily: '"SF Mono","Fira Code","Courier New",monospace',
              }}>
                {typed}
                {showInputCursor && (
                  <span style={{
                    display: "inline-block", width: 2, height: 14,
                    background: "#22c55e", marginLeft: 1, verticalAlign: "text-bottom",
                    animation: "blink 1s step-end infinite",
                  }} />
                )}
              </span>
              {isLoading && (
                <div style={{
                  width: 15, height: 15, borderRadius: "50%", flexShrink: 0,
                  border: "2px solid rgba(34,197,94,0.15)",
                  borderTop: "2px solid #22c55e",
                  animation: "demoSpin 0.7s linear infinite",
                }} />
              )}
            </div>
            <div style={{
              padding: "0 18px", height: 44, borderRadius: 9, flexShrink: 0,
              background: phase === "clicking"
                ? "linear-gradient(135deg, #15803d 0%, #14532d 100%)"
                : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
              display: "flex", alignItems: "center",
              fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.02em",
              transform: phase === "clicking" ? "scale(0.95)" : "scale(1)",
              boxShadow: phase === "clicking" ? "none" : "0 2px 14px rgba(22,163,74,0.32)",
              transition: "transform 0.1s ease, background 0.1s ease, box-shadow 0.1s ease",
              userSelect: "none",
            }}>
              Analyze →
            </div>
          </div>

          {/* Results — fade in */}
          <div style={{
            opacity: showResults ? 1 : 0,
            transform: showResults ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.65s ease, transform 0.65s ease",
          }}>
            {/* Pick card */}
            <div style={{
              background: "rgba(255,255,255,0.025)", borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: "3px solid #22c55e",
              padding: "15px 17px", marginBottom: 10,
            }}>
              {/* Today's AI Pick label */}
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "rgba(34,197,94,0.6)", marginBottom: 10,
              }}>
                Today's AI Pick
              </div>

              {/* Symbol row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{
                    fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em",
                    color: "rgba(255,255,255,0.95)", lineHeight: 1, marginBottom: 4,
                  }}>
                    {SYMBOL}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>Near $153.01</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div style={{
                    display: "flex", alignItems: "baseline", gap: 4,
                    padding: "4px 11px", borderRadius: 7,
                    background: "rgba(34,197,94,0.11)", border: "1px solid rgba(34,197,94,0.26)",
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(134,239,172,0.5)", letterSpacing: "0.08em" }}>AI SCORE</span>
                    <span style={{ fontSize: 17, fontWeight: 900, color: "#22c55e", letterSpacing: "-0.02em" }}>87</span>
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 800, padding: "3px 9px", borderRadius: 999,
                    background: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.28)",
                    color: "rgba(134,239,172,0.88)", letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    High Conviction
                  </div>
                </div>
              </div>

              {/* Level boxes */}
              <div style={{ display: "flex", gap: 8, marginBottom: 11 }}>
                {[
                  { label: "ENTRY",  val: "$148.50", color: "rgba(255,255,255,0.82)" },
                  { label: "STOP",   val: "$139.20", color: "#f87171" },
                  { label: "TARGET", val: "$162.00", color: "#4ade80" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 7,
                    padding: "8px 10px", border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.26)",
                      letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4,
                    }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Edge signals */}
              <div style={{ display: "flex", gap: 5 }}>
                {["MOMENTUM_EXPANSION", "BREAKOUT_STRUCTURE"].map(sig => (
                  <div key={sig} style={{
                    fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 5,
                    background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.16)",
                    color: "rgba(134,239,172,0.62)", letterSpacing: "0.06em",
                    fontFamily: '"SF Mono","Fira Code","Courier New",monospace',
                  }}>
                    {sig}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats strip */}
            <div style={{
              display: "flex", background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)", borderRadius: 9, overflow: "hidden",
            }}>
              {[
                { label: "WIN RATE",   val: "75%"    },
                { label: "PICKS",      val: "14"     },
                { label: "AVG RETURN", val: "+6.94%" },
              ].map(({ label, val }, i) => (
                <div key={label} style={{
                  flex: 1, textAlign: "center", padding: "10px 8px",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: "#4ade80",
                    letterSpacing: "-0.02em", marginBottom: 3,
                  }}>{val}</div>
                  <div style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "rgba(255,255,255,0.26)",
                  }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── FAQ accordion item ────────────────────────────────────────────────────────
function FaqItem({ question, answer, index }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", padding: "22px 0", cursor: "pointer",
          textAlign: "left", gap: 16,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.82)", letterSpacing: "-0.01em", lineHeight: 1.4 }}>
          {question}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.22 }}
          style={{ fontSize: 22, color: "rgba(34,197,94,0.65)", flexShrink: 0, lineHeight: 1, fontWeight: 200 }}
        >
          +
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        style={{ overflow: "hidden" }}
      >
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.44)", lineHeight: 1.75, paddingBottom: 22 }}>
          {answer}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────
export default function Landing({ onGetStarted }) {
  const PRICING_PLANS = [
    {
      cardStyle: S.pricingCard, badge: null, tier: "Free", price: "$0", period: "forever",
      features: [["✓","Yesterday's AI pick"],["✓","Top movers dashboard"],["✓","1 stock analysis per day"],["–","Today's pick (delayed 24h)"],["–","Entry / stop / target levels"]],
      btnStyle: S.pricingBtn, btnHover: { background: "rgba(255,255,255,0.08)" }, btnLabel: "Get started free", featuredColor: null,
    },
    {
      cardStyle: S.pricingCardFeatured, badge: "Most Popular", tier: "Starter", price: "$9", period: "per month",
      features: [["✓","Today's AI pick, live"],["✓","Full entry, stop & target"],["✓","AI analysis & reasoning"],["✓","Trade journal"]],
      btnStyle: S.pricingBtnFeatured, btnHover: { scale: 1.02, boxShadow: "0 8px 28px rgba(22,163,74,0.45)" }, btnLabel: "Start for $9 / month", featuredColor: "rgba(255,255,255,0.72)",
    },
    {
      cardStyle: S.pricingCard, badge: null, tier: "Pro", price: "$29", period: "per month",
      features: [["✓","Everything in Starter"],["✓","Priority pick alerts"],["✓","Sector momentum alerts"],["✓","Portfolio-aware analysis"],["✓","Priority support"]],
      btnStyle: S.pricingBtn, btnHover: { background: "rgba(255,255,255,0.08)" }, btnLabel: "Go Pro", featuredColor: null,
    },
    {
      cardStyle: S.pricingCardElite, badge: "For serious traders", badgeStyle: S.pricingBadgeElite,
      tier: "Elite", price: "$99", period: "per month",
      features: [
        ["✓","Everything in Pro"],
        ["✓","Advanced sector scans"],
        ["✓","Direct founder access"],
        ["✓","Early feature access"],
        ["✓","Custom sector scans"],
        ["✓","Portfolio risk analysis"],
      ],
      btnStyle: S.pricingBtnElite,
      btnHover: { scale: 1.02, boxShadow: "0 8px 28px rgba(245,158,11,0.32)" },
      btnLabel: "Go Elite",
      featuredColor: "rgba(253,230,138,0.75)",
      checkColor: "#f59e0b",
    },
  ];

  return (
    <div style={S.page}>
      <GlobalStyle />

      {/* Subtle ambient gradient */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 40% at 50% -10%, rgba(34,197,94,0.055) 0%, transparent 70%)",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Nav ── */}
        <nav>
          <motion.div
            style={S.nav}
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={S.navLogo}>AUREXIS</div>
            <motion.button
              style={S.navCta}
              whileHover={{ background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.6)", scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => window.location.href = "/waitlist"}
            >
              Get Today's Pick →
            </motion.button>
          </motion.div>
        </nav>

        {/* ── Ticker tape ── */}
        <TickerTape />

        {/* ── Hero — full viewport ── */}
        <section style={S.heroWrap}>
          {/* Dot grid background */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "radial-gradient(circle, rgba(34,197,94,0.09) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 90% 80% at 50% 50%, black 20%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 50%, black 20%, transparent 80%)",
          }} />

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            <div style={S.heroBadge}>
              <span style={S.heroDot} />
              Live picks powered by AI
            </div>
          </motion.div>

          {/* Headline — two lines */}
          <motion.div
            style={{ marginBottom: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.22 }}
          >
            <motion.span
              style={S.heroLine1}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.28 }}
            >
              The market gives one signal a day.
            </motion.span>
            <motion.span
              style={S.heroLine2}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.52 }}
            >
              We find it.
            </motion.span>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            style={S.heroSub}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.88 }}
          >
            Verified on Alpaca. 75% win rate. $9/month.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 1.08 }}
          >
            <motion.button
              style={S.heroCta}
              animate={{
                y: [0, -5, 0],
                boxShadow: [
                  "0 0 40px rgba(22,163,74,0.4), 0 4px 20px rgba(0,0,0,0.4)",
                  "0 0 100px rgba(22,163,74,0.75), 0 0 180px rgba(22,163,74,0.14), 0 4px 24px rgba(0,0,0,0.45)",
                  "0 0 40px rgba(22,163,74,0.4), 0 4px 20px rgba(0,0,0,0.4)",
                ],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => window.location.href = "/waitlist"}
            >
              <span>Get Today's Pick</span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
            </motion.button>
            <div style={S.heroCtaSub}>No credit card required for free plan</div>
          </motion.div>
        </section>


        <div style={S.divider} />

        {/* ── Stats bar — full width with vertical separators ── */}
        <div style={S.statsBar}>
          <StatBarItem raw="75%" label="Win Rate" delay={0} />
          <div style={S.statsBarSep} />
          <StatBarItem raw="+4.87%" label="Avg Return Per Trade" delay={110} />
          <div style={S.statsBarSep} />
          <StatBarItem raw="1200" label="Stocks Scanned Daily" delay={220} />
        </div>

        <div style={S.divider} />

        {/* ── How it works — horizontal timeline ── */}
        <section style={S.section}>
          <Reveal delay={0}>
            <div style={S.sectionLabel}>How It Works</div>
            <h2 style={S.sectionTitle}>Three steps, zero noise.</h2>
            <p style={S.sectionSub}>Aurexis does the analysis. You make the call.</p>
          </Reveal>

          <div style={S.timelineWrap}>
            {/* Connecting line */}
            <div style={S.timelineTrack} />

            {[
              { num: "01", title: "AI scans 1,200+ stocks after close", desc: "Every evening the engine screens momentum, volume, and technical setups across the full market." },
              { num: "02", title: "Get today's pick with entry, stop & target", desc: "One high-conviction setup with precise levels — entry price, stop loss, and profit target." },
              { num: "03", title: "Execute in your own brokerage", desc: "You own the trade. Place it in Alpaca, Robinhood, TD Ameritrade, or any broker you use." },
            ].map(({ num, title, desc }, i) => (
              <Reveal key={num} delay={i * 130} y={20} style={{ flex: 1 }}>
                <div style={S.timelineItem}>
                  <div style={S.timelineNum}>{num}</div>
                  <div style={S.timelineTitle}>{title}</div>
                  <div style={S.timelineDesc}>{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <div style={S.divider} />

        {/* ── App Preview ── */}
        <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
          <Reveal delay={0}>
            <div style={S.sectionLabel}>Dashboard</div>
            <h2 style={S.sectionTitle}>See what the signal looks like.</h2>
            <p style={S.sectionSub}>One pick, every morning. Everything you need to act on it.</p>
          </Reveal>
          <Reveal delay={120}>
            {/* Browser frame */}
            <div style={{
              borderRadius: 13,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), 0 0 80px rgba(34,197,94,0.04)",
            }}>
              {/* Browser chrome */}
              <div style={{
                background: "#161616",
                padding: "11px 16px",
                display: "flex", alignItems: "center", gap: 12,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
                  <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e" }} />
                  <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
                </div>
                <div style={{
                  flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 5,
                  padding: "5px 12px", fontSize: 11, color: "rgba(255,255,255,0.28)",
                  fontFamily: '"SF Mono","Fira Code","Courier New",monospace',
                  textAlign: "center", border: "1px solid rgba(255,255,255,0.06)", letterSpacing: "0.02em",
                }}>
                  aurexis.app/dashboard
                </div>
                <div style={{ width: 60, flexShrink: 0 }} />
              </div>

              {/* Dashboard layout */}
              <div style={{ display: "flex", background: "#07090e" }}>
                {/* Sidebar */}
                <div style={{
                  width: 186, background: "#050709", borderRight: "1px solid rgba(255,255,255,0.05)",
                  padding: "18px 0", flexShrink: 0,
                }}>
                  <div style={{ padding: "0 16px 22px", fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", color: "rgba(255,255,255,0.38)" }}>AUREXIS</div>
                  {[
                    { icon: "◈", label: "Today's Pick", active: true },
                    { icon: "⊞", label: "Screener", active: false },
                    { icon: "◉", label: "Watchlist", active: false },
                    { icon: "∑", label: "Portfolio", active: false },
                    { icon: "☰", label: "Journal", active: false },
                  ].map(({ icon, label, active }) => (
                    <div key={label} style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "9px 14px", margin: "1px 8px", borderRadius: 7,
                      background: active ? "rgba(34,197,94,0.09)" : "transparent",
                      color: active ? "rgba(134,239,172,0.88)" : "rgba(255,255,255,0.28)",
                      fontSize: 12, fontWeight: active ? 600 : 400, cursor: "default",
                    }}>
                      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div style={{ flex: 1, padding: "20px 24px" }}>
                  {/* Top bar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Today's Pick · APR 2026
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(34,197,94,0.65)", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.9)" }} />
                      MARKET OPEN
                    </div>
                  </div>

                  {/* Pick card */}
                  <div style={{
                    background: "rgba(255,255,255,0.025)", borderRadius: 11,
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderLeft: "3px solid #22c55e",
                    padding: "18px 20px", marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.95)", lineHeight: 1, marginBottom: 5 }}>MRVL</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>Marvell Technology</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <div style={{
                          fontSize: 9, fontWeight: 800, padding: "3px 9px", borderRadius: 999,
                          background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.28)",
                          color: "#4ade80", letterSpacing: "0.07em",
                        }}>BULLISH</div>
                        <div style={{
                          fontSize: 14, fontWeight: 900, padding: "4px 11px", borderRadius: 6,
                          background: "rgba(34,197,94,0.13)", border: "1px solid rgba(34,197,94,0.22)",
                          color: "#22c55e", letterSpacing: "-0.01em",
                        }}>+36%</div>
                      </div>
                    </div>

                    {/* Levels */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                      {[
                        { label: "ENTRY", val: "$98.00", color: "rgba(255,255,255,0.80)" },
                        { label: "STOP",  val: "$91.50", color: "#f87171" },
                        { label: "TARGET",val: "$133.50",color: "#4ade80" },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{
                          flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 7,
                          padding: "9px 11px", border: "1px solid rgba(255,255,255,0.05)",
                        }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: "-0.01em" }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Edge signals + AI score */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {["Momentum surge", "Sector rotation", "Volume breakout"].map(sig => (
                        <div key={sig} style={{
                          fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 5,
                          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.16)",
                          color: "rgba(134,239,172,0.65)", letterSpacing: "0.01em",
                        }}>
                          {sig}
                        </div>
                      ))}
                      <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.42)", display: "flex", alignItems: "baseline", gap: 3 }}>
                        AI Score <span style={{ color: "#4ade80", fontSize: 15, fontWeight: 900, marginLeft: 4 }}>8.7</span><span style={{ color: "rgba(255,255,255,0.22)", fontSize: 10 }}>/10</span>
                      </div>
                    </div>
                  </div>

                  {/* Sparkline row */}
                  <div style={{
                    height: 46, background: "rgba(255,255,255,0.02)", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.05)", display: "flex",
                    alignItems: "center", padding: "0 14px", gap: 10,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      30-day performance
                    </span>
                    <svg width="140" height="26" viewBox="0 0 140 26" style={{ marginLeft: "auto" }}>
                      <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polyline
                        points="0,22 12,20 22,19 34,17 46,20 56,15 68,12 80,10 92,13 104,8 118,5 140,3"
                        fill="none" stroke="#22c55e" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" opacity="0.7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <div style={S.divider} />

        {/* ── Founder Story ── */}
        <section style={{ padding: "88px 24px" }}>
          <div style={{ maxWidth: 660, margin: "0 auto", textAlign: "center" }}>
            <Reveal delay={0}>
              <div style={S.sectionLabel}>The Story</div>
              <h2 style={{
                fontSize: "clamp(28px, 4.5vw, 46px)", fontWeight: 900,
                letterSpacing: "-0.035em", color: "rgba(255,255,255,0.93)",
                marginBottom: 28, lineHeight: 1.16,
              }}>
                Built differently.
              </h2>
              <p style={{
                fontSize: "clamp(15px, 2vw, 17px)", color: "rgba(255,255,255,0.50)",
                lineHeight: 1.8, marginBottom: 24,
              }}>
                Aurexis was built during the 2026 tariff crash — one of the most volatile markets in a decade. While others panicked, the system kept finding high-conviction setups. Every pick is timestamped and verified on Alpaca.
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic", letterSpacing: "0.02em",
              }}>
                <span style={{ fontSize: 13, color: "rgba(34,197,94,0.5)" }}>✓</span>
                Every pick is timestamped and verified on Alpaca.
              </div>
            </Reveal>
          </div>
        </section>

        <div style={S.divider} />

        {/* ── Product Demo ── */}
        <section style={{ padding: "120px 24px", maxWidth: 1100, margin: "0 auto" }}>
          <Reveal delay={0}>
            <div style={{ ...S.sectionLabel, textAlign: "center" }}>Demo</div>
            <h2 style={{ ...S.sectionTitle, textAlign: "center" }}>See it in action.</h2>
            <p style={{ ...S.sectionSub, textAlign: "center", maxWidth: 460, margin: "0 auto 48px" }}>
              Watch the AI find a high-conviction setup in real time.
            </p>
          </Reveal>
          <ProductDemo />
        </section>

        <div style={S.divider} />

        {/* ── FAQ ── */}
        <section style={{ padding: "80px 24px", maxWidth: 760, margin: "0 auto" }}>
          <Reveal delay={0}>
            <div style={S.sectionLabel}>FAQ</div>
            <h2 style={{ ...S.sectionTitle, marginBottom: 8 }}>Frequently asked questions.</h2>
            <p style={{ ...S.sectionSub, marginBottom: 44 }}>Quick answers to common questions.</p>
          </Reveal>
          {[
            {
              question: "What is Aurexis?",
              answer: "Aurexis is an AI-powered stock signal service that scans 1,200+ stocks daily to find high-conviction trade setups. We provide entry, stop loss, and target levels — you execute the trades in your own brokerage.",
            },
            {
              question: "What broker do I need?",
              answer: "Any US brokerage works — Robinhood, TD Ameritrade, Fidelity, Schwab, Alpaca, Webull. You execute trades yourself; Aurexis never touches your money.",
            },
            {
              question: "How often do you find picks?",
              answer: "The system scans every evening after market close. It only alerts when it finds a genuinely high-conviction setup — quality over quantity. Some weeks have multiple picks; some have none. We don't force trades.",
            },
            {
              question: "Is this financial advice?",
              answer: "No. Aurexis provides AI-generated trade ideas for educational purposes. We are not a registered investment advisor. Always do your own research and consider consulting a financial professional.",
            },
            {
              question: "Can I cancel anytime?",
              answer: "Yes. Cancel with one click in your account settings. No contracts, no commitments, no cancellation fees. Cancellation takes effect at the end of your current billing period.",
            },
            {
              question: "How is this different from Motley Fool or Alpha Picks?",
              answer: "Three things: (1) much cheaper at $9/month vs $200–500/year, (2) we publish daily timestamped picks verified on Alpaca, (3) we openly say NO_TRADE when conditions aren't right rather than forcing weak picks.",
            },
            {
              question: "What's your win rate?",
              answer: "Across our live testing period, the system has shown approximately 60% win rate with a 1.7:1 win/loss ratio. Past performance does not guarantee future results — markets change and results vary.",
            },
            {
              question: "What happens if a pick doesn't work?",
              answer: "We use stop losses on every pick to limit downside. Some picks lose — that's normal in any trading system. The goal is profitable expectancy over many trades, not winning every single one.",
            },
          ].map(({ question, answer }, i) => (
            <FaqItem key={question} question={question} answer={answer} index={i} />
          ))}
        </section>

        <div style={S.divider} />

        {/* ── Methodology ── */}
        <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
          <Reveal delay={0}>
            <div style={S.sectionLabel}>Methodology</div>
            <h2 style={S.sectionTitle}>How it works.</h2>
            <p style={S.sectionSub}>Built on real quantitative methods.</p>
          </Reveal>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[
              {
                num: "01",
                title: "5-Pillar Analysis",
                body: "Every candidate is scored across technical momentum, catalysts, sentiment, risk structure, and upside potential. Only setups passing all 5 gates make it through.",
              },
              {
                num: "02",
                title: "4 Proprietary Signals",
                body: "MOMENTUM_EXPANSION, BREAKOUT_STRUCTURE, RS_LEADER, and VOLATILITY_EXPANSION — proprietary indicators built to detect institutional buying pressure before major moves.",
              },
              {
                num: "03",
                title: "Adapts to Market",
                body: "The system identifies BULL, BEAR, or CHOPPY market regimes and adjusts thresholds dynamically. In choppy markets, it gets stricter and waits. It would rather find nothing than recommend weak setups.",
              },
            ].map(({ num, title, body }, i) => (
              <MethodCard key={num} num={num} title={title} body={body} index={i} />
            ))}
          </div>
        </section>

        <div style={S.divider} />

        {/* ── Pricing ── */}
        <section id="pricing" style={S.section}>
          <Reveal delay={0}>
            <div style={S.sectionLabel}>Pricing</div>
            <h2 style={S.sectionTitle}>Simple, transparent pricing.</h2>
            <p style={S.sectionSub}>One winning trade covers months of the subscription.</p>
          </Reveal>
          <div style={S.pricingRow}>
            {PRICING_PLANS.map((plan, i) => (
              <PricingCard key={plan.tier} plan={plan} index={i} onGetStarted={onGetStarted} />
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "64px 24px 0",
          background: "rgba(0,0,0,0.5)",
          marginTop: 40,
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>

            {/* 4-column grid */}
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginBottom: 56 }}>

              {/* Brand */}
              <div style={{ flex: "2 1 200px", minWidth: 180 }}>
                <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.18em", color: "rgba(255,255,255,0.85)", marginBottom: 12 }}>
                  AUREXIS
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.65, marginBottom: 16, maxWidth: 220 }}>
                  AI-powered stock signals for everyone.
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>
                  © {new Date().getFullYear()} Aurexis. All rights reserved.
                </div>
              </div>

              {/* Product */}
              <div style={{ flex: "1 1 130px", minWidth: 120 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 16 }}>
                  Product
                </div>
                {[
                  { label: "Features",    href: "#" },
                  { label: "Pricing",     href: "#pricing" },
                  { label: "Performance", href: "#" },
                  { label: "FAQ",         href: "#" },
                ].map(({ label, href }) => (
                  <a key={label} href={href} style={{
                    display: "block", fontSize: 13, color: "rgba(255,255,255,0.35)",
                    textDecoration: "none", padding: "5px 0", letterSpacing: "0.01em",
                  }}>
                    {label}
                  </a>
                ))}
              </div>

              {/* Legal */}
              <div style={{ flex: "1 1 130px", minWidth: 120 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 16 }}>
                  Legal
                </div>
                {[
                  { label: "Terms of Service", to: "/terms" },
                  { label: "Privacy Policy",   to: "/privacy" },
                  { label: "Disclaimer",       to: "/disclaimer" },
                  { label: "Refund Policy",    to: "/refund" },
                  { label: "Cookie Policy",    to: "/cookies" },
                ].map(({ label, to }) => (
                  <Link key={label} to={to} style={{
                    display: "block", fontSize: 13, color: "rgba(255,255,255,0.35)",
                    textDecoration: "none", padding: "5px 0", letterSpacing: "0.01em",
                  }}>
                    {label}
                  </Link>
                ))}
              </div>

              {/* Support */}
              <div style={{ flex: "1 1 130px", minWidth: 120 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 16 }}>
                  Support
                </div>
                {[
                  { label: "support@aurexis.com", href: "mailto:support@aurexis.com" },
                  { label: "Documentation",        href: "#" },
                  { label: "Status",               href: "#" },
                ].map(({ label, href }) => (
                  <a key={label} href={href} style={{
                    display: "block", fontSize: 13, color: "rgba(255,255,255,0.35)",
                    textDecoration: "none", padding: "5px 0", letterSpacing: "0.01em",
                  }}>
                    {label}
                  </a>
                ))}
              </div>

            </div>

            {/* Bottom disclaimer bar */}
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "24px 0 36px",
            }}>
              <p style={{
                fontSize: 11, color: "rgba(255,255,255,0.18)", lineHeight: 1.75,
                fontStyle: "italic", margin: 0,
              }}>
                Aurexis provides AI-generated trade ideas for educational purposes only. Not investment advice.
                All trading involves risk. Past performance does not guarantee future results.
                Verify all trades independently. Built by an independent developer.
              </p>
            </div>

          </div>
        </footer>

      </div>
    </div>
  );
}
