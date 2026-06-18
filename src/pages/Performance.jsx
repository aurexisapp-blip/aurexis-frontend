import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const T = {
  bg:       "#07090f",
  card:     "rgba(255,255,255,0.035)",
  border:   "rgba(255,255,255,0.07)",
  green:    "#00b450",
  greenDim: "rgba(0,180,80,0.15)",
  greenText:"#4ade80",
  red:      "#ef4444",
  redDim:   "rgba(239,68,68,0.12)",
  text:     "rgba(255,255,255,0.88)",
  muted:    "rgba(255,255,255,0.38)",
  faint:    "rgba(255,255,255,0.12)",
};

const HALL_OF_FAME = [
  {
    symbol: "ACHR",
    label: "Archer Aviation",
    entry: "$6.51",
    result: "+37%",
    note: "Flagged pre-breakout. Hit $8.91 within the window.",
    signals: ["MOMENTUM_EXPANSION", "VOLATILITY_EXPANSION"],
    color: T.green,
  },
  {
    symbol: "CLSK",
    label: "CleanSpark",
    entry: "Pre-move",
    result: "+$3,300",
    note: "Flagged before a major Bitcoin mining sector surge.",
    signals: ["MOMENTUM_EXPANSION", "VOLATILITY_EXPANSION"],
    color: T.greenText,
  },
  {
    symbol: "SN",
    label: "SharkNinja",
    entry: "$131.54",
    result: "52-wk High",
    note: "Flagged at entry. Hit 52-week high the same session.",
    signals: ["BREAKOUT_STRUCTURE", "RS_LEADER"],
    color: "#facc15",
  },
];

const SIGNAL_LABELS = {
  MOMENTUM_EXPANSION:  "Momentum Expansion",
  VOLATILITY_EXPANSION:"Volatility Expansion",
  BREAKOUT_STRUCTURE:  "Breakout Structure",
  RS_LEADER:           "RS Leader",
  quiet_accumulation:  "Quiet Accumulation",
  squeeze_potential:   "Squeeze",
  float_rotation:      "Float Rotation",
};

function fmt(sig) {
  return SIGNAL_LABELS[sig] || sig.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      flex: "1 1 180px", background: T.card,
      border: `1px solid ${T.border}`, borderRadius: 16,
      padding: "28px 24px", minWidth: 160,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.03em", color: color || T.text, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function OutcomeBadge({ outcome }) {
  if (outcome === "won") return (
    <span style={{ background: T.greenDim, color: T.greenText, border: `1px solid rgba(74,222,128,0.25)`, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>WON</span>
  );
  if (outcome === "lost") return (
    <span style={{ background: T.redDim, color: T.red, border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>LOST</span>
  );
  return (
    <span style={{ background: "rgba(250,204,21,0.08)", color: "#facc15", border: "1px solid rgba(250,204,21,0.18)", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>TRACKING…</span>
  );
}

export default function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/public/performance`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const summary = data?.summary || {};
  const picks   = data?.picks   || [];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif', color: T.text }}>

      {/* Nav bar */}
      <nav style={{ borderBottom: `1px solid ${T.border}`, padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(7,9,15,0.95)", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff" }}>A</div>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>Aurexis</span>
        </a>
        <Link to="/signup" style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", letterSpacing: "-0.01em" }}>
          Get Started →
        </Link>
      </nav>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "72px 0 56px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.greenDim, border: `1px solid rgba(0,180,80,0.25)`, borderRadius: 99, padding: "6px 16px", marginBottom: 24 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.greenText }}>Live Track Record</span>
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, margin: "0 0 16px", color: "#fff" }}>
            Documented<br />
            <span style={{ color: T.greenText }}>Track Record</span>
          </h1>
          <p style={{ fontSize: 16, color: T.muted, margin: "0 0 10px", maxWidth: 480, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Every pick logged with a timestamp before the move. No cherry-picking. No hindsight.
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", margin: 0, fontStyle: "italic" }}>
            All picks logged with timestamp before the move
          </p>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 64 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ flex: "1 1 180px", height: 110, background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 64 }}>
            <StatCard label="Win Rate"    value={`${summary.win_rate_pct ?? "—"}%`}  color={T.greenText} sub={`${summary.win_count ?? 0}W / ${summary.loss_count ?? 0}L`} />
            <StatCard label="Avg Winner"  value={summary.avg_winner_pct ? `+${summary.avg_winner_pct}%` : "—"} color={T.greenText} sub="per winning pick" />
            <StatCard label="Avg Loser"   value={summary.avg_loser_pct  ? `${summary.avg_loser_pct}%`  : "—"} color={T.red}       sub="per losing pick" />
            <StatCard label="Total Picks" value={summary.total_picks ?? "—"} sub={`${summary.total_resolved ?? 0} resolved`} />
          </div>
        )}

        {/* Hall of Fame */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, marginBottom: 20 }}>
            Hall of Fame
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {HALL_OF_FAME.map(pick => (
              <div key={pick.symbol} style={{
                flex: "1 1 280px", background: T.card,
                border: `1px solid ${T.border}`, borderRadius: 18,
                padding: "28px 24px", position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${pick.color}, transparent)` }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>{pick.symbol}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{pick.label}</div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: pick.color, letterSpacing: "-0.02em" }}>{pick.result}</div>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 16 }}>{pick.note}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {pick.signals.map(s => (
                    <span key={s} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, borderRadius: 5, padding: "3px 8px", color: T.muted, textTransform: "uppercase" }}>
                      {fmt(s)}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.22)" }}>Entry: {pick.entry}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pick history table */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, marginBottom: 20 }}>
            Full Pick History
          </div>

          {loading ? (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 14 }}>
              Loading picks…
            </div>
          ) : picks.length === 0 ? (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 14 }}>
              No picks recorded yet.
            </div>
          ) : (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "130px 90px 90px 90px 110px 1fr", gap: 0, padding: "12px 24px", borderBottom: `1px solid ${T.border}`, background: "rgba(255,255,255,0.02)" }}>
                {["Date", "Symbol", "Entry", "Result", "Outcome", "Signals"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {picks.map((p, i) => {
                const isWon  = p.outcome === "won";
                const isLost = p.outcome === "lost";
                return (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "130px 90px 90px 90px 110px 1fr",
                    gap: 0, padding: "14px 24px", alignItems: "center",
                    borderBottom: i < picks.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                    background: isWon ? "rgba(0,180,80,0.03)" : isLost ? "rgba(239,68,68,0.03)" : "transparent",
                  }}>
                    <div style={{ fontSize: 12, color: T.muted }}>{fmtDate(p.picked_at)}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>{p.symbol}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{p.entry_price ? `$${p.entry_price.toFixed(2)}` : "—"}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isWon ? T.greenText : isLost ? T.red : T.muted }}>
                      {p.change_pct != null ? `${p.change_pct > 0 ? "+" : ""}${p.change_pct}%` : "—"}
                    </div>
                    <div><OutcomeBadge outcome={p.outcome} /></div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {(p.signals || []).slice(0, 3).map(s => (
                        <span key={s} style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 7px", color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>
                          {fmt(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 56, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", margin: 0, lineHeight: 1.8, fontStyle: "italic" }}>
            Past performance does not guarantee future results. For educational purposes only.
            Not investment advice. All trading involves risk. Verify all trades independently.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", marginBottom: 12 }}>
            See today's pick
          </div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 28 }}>
            Get access to the same AI signals — live, every trading day.
          </div>
          <Link to="/signup" style={{
            display: "inline-block", background: T.green, color: "#fff",
            borderRadius: 12, padding: "16px 40px", fontSize: 15, fontWeight: 800,
            textDecoration: "none", letterSpacing: "-0.01em",
            boxShadow: "0 4px 24px rgba(0,180,80,0.30)",
          }}>
            See today's pick →
          </Link>
        </div>

      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "24px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", margin: 0 }}>
          © {new Date().getFullYear()} Aurexis. All rights reserved. &nbsp;·&nbsp;{" "}
          <Link to="/terms" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Terms</Link>
          &nbsp;·&nbsp;
          <Link to="/privacy" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Privacy</Link>
        </p>
      </div>

    </div>
  );
}
