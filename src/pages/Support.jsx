import React, { useState } from "react";
import { Link } from "react-router-dom";

// Public support page -- required by the App Store listing's Support URL
// field. Deliberately a standalone top-level route (registered in
// main.jsx alongside /terms, /privacy, etc.), not nested under /app, so it
// renders with no login and outside the desktop-only mobile gate that
// blocks the dashboard on phones. Apple's reviewers check this from both
// desktop and mobile browsers.
const SUPPORT_EMAIL = "aurexis.app@gmail.com";

const bg = "#0a0a0a";
const card = "#111110";
const hairline = "0.5px solid #1a1a19";
const green = "#3EE0A3";

const FAQS = [
  {
    q: "What is Aurexis?",
    a: "Aurexis is an AI-powered research tool that scans the market daily and surfaces high-conviction stock ideas, along with a dashboard for tracking picks, journaling your own trades, and monitoring watchlists.",
  },
  {
    q: "How do I cancel or manage my subscription?",
    a: (
      <>
        Log in at{" "}
        <Link to="/app" style={{ color: green, textDecoration: "none", fontWeight: 600 }}>
          useaurexis.com/app
        </Link>{" "}
        and go to Settings → Plan &amp; Billing. From there you can change plans, update payment
        details, or cancel — cancellations keep your access until the end of the current billing
        period. If you run into trouble, email us and we'll take care of it.
      </>
    ),
  },
  {
    q: "Are these picks financial advice?",
    a: "No. Aurexis provides AI-generated trade ideas for educational and informational purposes only. Nothing on the platform constitutes investment, financial, or trading advice, and Aurexis is not a registered investment advisor. Always do your own research and consult a licensed professional before making investment decisions.",
  },
  {
    q: "How do I delete my account and my data?",
    a: "You can delete your account and all associated data yourself anytime from Settings → Account → Delete account inside the app — this is permanent and cannot be undone. If you'd rather we do it for you, email us at the address below and we'll handle it within a few days.",
  },
  {
    q: "How do daily picks work?",
    a: "Every morning before market open, Aurexis scans thousands of stocks using a multi-signal model — momentum, volume anomalies, options flow, short interest, and news sentiment — and ranks them into a conviction score. Your Best Pick card refreshes automatically; check back before 9:30 AM ET on trading days.",
  },
];

function FaqItem({ q, a, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: hairline }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "18px 20px", display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 16, textAlign: "left", fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#f5f5f4" }}>{q}</span>
        <span style={{
          fontSize: 18, color: isOpen ? green : "#6a6a66", flexShrink: 0,
          transform: isOpen ? "rotate(45deg)" : "none",
          transition: "transform 0.18s ease",
          lineHeight: 1,
        }}>
          +
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: "0 20px 20px", fontSize: 13.5, color: "#a8a8a4", lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div style={{
      minHeight: "100vh", background: bg,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale",
    }}>
      {/* Top bar */}
      <div style={{
        borderBottom: hairline, padding: "18px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 720, margin: "0 auto",
      }}>
        <Link to="/" style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          color: "#6a6a66", fontSize: 13, textDecoration: "none", letterSpacing: "0.01em",
        }}>
          <span style={{ fontSize: 16 }}>←</span>
          Back to Aurexis
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: green,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 900, color: "#06120c",
          }}>A</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "#6a6a66" }}>
            AUREXIS
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 24px 100px" }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
          color: green, marginBottom: 10,
        }}>
          Support
        </div>
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 38px)", fontWeight: 900, letterSpacing: "-0.03em",
          color: "#f5f5f4", margin: "0 0 12px",
        }}>
          How can we help?
        </h1>
        <p style={{ fontSize: 14.5, color: "#8a8a86", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 520 }}>
          Questions about your account, billing, or how Aurexis works — find quick answers below,
          or reach out and a real person will get back to you.
        </p>

        {/* Contact us */}
        <div style={{
          background: card, border: hairline, borderRadius: 16,
          padding: "26px 24px", marginBottom: 40,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 20, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f5f5f4", marginBottom: 5 }}>
              Contact us
            </div>
            <div style={{ fontSize: 13, color: "#8a8a86", lineHeight: 1.6 }}>
              We typically reply within 24 hours.
            </div>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: green, color: "#06120c", textDecoration: "none",
              fontSize: 14, fontWeight: 700, borderRadius: 10, padding: "12px 20px",
              whiteSpace: "nowrap",
            }}
          >
            ✉ {SUPPORT_EMAIL}
          </a>
        </div>

        {/* FAQ */}
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
          color: "#6a6a66", marginBottom: 14,
        }}>
          Frequently asked questions
        </div>
        <div style={{ background: card, border: hairline, borderRadius: 16, overflow: "hidden" }}>
          {FAQS.map((faq, i) => (
            <FaqItem
              key={faq.q}
              q={faq.q}
              a={faq.a}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
            />
          ))}
        </div>

        <p style={{ fontSize: 11.5, color: "#4a4a47", lineHeight: 1.7, marginTop: 40 }}>
          Aurexis provides AI-generated trade ideas for educational purposes only. Not investment
          advice. All trading involves risk. See our{" "}
          <Link to="/disclaimer" style={{ color: "#6a6a66" }}>Financial Disclaimer</Link>,{" "}
          <Link to="/terms" style={{ color: "#6a6a66" }}>Terms of Service</Link>, and{" "}
          <Link to="/privacy" style={{ color: "#6a6a66" }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
