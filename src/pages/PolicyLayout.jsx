import React from "react";
import { useNavigate } from "react-router-dom";

const styles = {
  page: {
    fontFamily: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    background: "#000",
    color: "rgba(255,255,255,0.85)",
    minHeight: "100vh",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
  topBar: {
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    padding: "18px 24px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    maxWidth: 760, margin: "0 auto",
  },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 7,
    background: "none", border: "none", cursor: "pointer",
    color: "rgba(255,255,255,0.42)", fontSize: 13,
    padding: "6px 0", letterSpacing: "0.01em", fontFamily: "inherit",
  },
  logo: {
    fontSize: 12, fontWeight: 900, letterSpacing: "0.18em",
    color: "rgba(255,255,255,0.28)",
  },
  container: {
    maxWidth: 700, margin: "0 auto", padding: "52px 24px 100px",
  },
  greenLabel: {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
    textTransform: "uppercase", color: "rgba(34,197,94,0.65)", marginBottom: 10,
  },
  title: {
    fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900,
    letterSpacing: "-0.03em", color: "rgba(255,255,255,0.95)",
    margin: "0 0 10px",
  },
  updated: {
    fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 48,
    letterSpacing: "0.02em",
  },
  rule: {
    height: 1,
    background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)",
    marginBottom: 40,
  },
};

export function Section({ num, title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.80)",
        margin: "0 0 10px", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 9,
      }}>
        {num && (
          <span style={{
            fontSize: 10, fontWeight: 800, color: "rgba(34,197,94,0.65)",
            letterSpacing: "0.08em", minWidth: 24,
          }}>
            {num}.
          </span>
        )}
        {title}
      </h2>
      {children}
    </div>
  );
}

export function P({ children }) {
  return (
    <p style={{
      fontSize: 14, color: "rgba(255,255,255,0.50)", lineHeight: 1.78,
      margin: "0 0 14px", paddingLeft: 24,
    }}>
      {children}
    </p>
  );
}

export function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 36, margin: "0 0 14px" }}>
      {items.map((item, i) => (
        <li key={i} style={{
          fontSize: 14, color: "rgba(255,255,255,0.50)", lineHeight: 1.78, marginBottom: 4,
        }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Callout({ variant = "warning", children }) {
  const colors = variant === "warning"
    ? { bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)", text: "rgba(253,230,138,0.85)" }
    : { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.22)", text: "rgba(134,239,172,0.85)" };
  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 8, padding: "14px 16px", marginBottom: 20,
      fontSize: 13, color: colors.text, lineHeight: 1.7,
    }}>
      {children}
    </div>
  );
}

export default function PolicyLayout({ title, children }) {
  const navigate = useNavigate();
  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={() => navigate("/")}>
          <span style={{ fontSize: 16 }}>←</span>
          Back to Aurexis
        </button>
        <div style={styles.logo}>AUREXIS</div>
      </div>

      <div style={styles.container}>
        <div style={styles.greenLabel}>Legal</div>
        <h1 style={styles.title}>{title}</h1>
        <div style={styles.updated}>Last updated: April 29, 2026</div>
        <div style={styles.rule} />
        {children}
      </div>
    </div>
  );
}
