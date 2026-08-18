import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PLAN_PRICING, PLAN_LABEL, PLAN_HIGHLIGHTS, planPriceLabel } from "../lib/pricing";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Standalone, single-purpose destination for the iOS app's paywall CTAs.
// Deliberately not the full logged-in web app or the marketing homepage --
// App Store policy requires purchases to leave the app entirely for a
// non-IAP subscription, and a full site nav / marketing page on the other
// end of that handoff reads as a bait-and-switch. This page does exactly
// one thing: show the plan the user tapped, get them authenticated if
// they aren't already, and hand off to Stripe Checkout.
function getPlanFromUrl() {
  const p = (new URLSearchParams(window.location.search).get("plan") || "").toLowerCase();
  return p === "starter" || p === "pro" || p === "elite" ? p : "starter";
}

// This page opens in the system browser (Safari), a separate storage context
// from the native app's own WebView -- localStorage.aurexis_token never
// crosses that boundary on its own. The app passes the token through the URL
// when it hands off here (see handleUpgrade in App.jsx); capture it into this
// browser's localStorage before anything checks for it, same pattern AppGate
// already uses for the OAuth redirect. Without this, every native purchase
// hit a redundant "log in again" screen before ever reaching Stripe.
function captureTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    localStorage.setItem("aurexis_token", urlToken);
    const clean = new URL(window.location.href);
    clean.searchParams.delete("token");
    window.history.replaceState({}, "", clean.pathname + clean.search);
  }
}

export default function MobileCheckout() {
  const navigate = useNavigate();
  captureTokenFromUrl();
  const [plan, setPlan] = useState(getPlanFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get("success") === "1";

  async function handleContinue() {
    const token = localStorage.getItem("aurexis_token");
    if (!token) {
      navigate(`/login?plan=${plan}&next=${encodeURIComponent(`/mobile-checkout?plan=${plan}`)}`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plan,
          success_url: `${window.location.origin}/mobile-checkout?plan=${plan}&success=1`,
          cancel_url: `${window.location.origin}/mobile-checkout?plan=${plan}`,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        // Stale/expired token sitting in this browser -- clear it and
        // send them through login instead of showing a confusing error.
        localStorage.removeItem("aurexis_token");
        navigate(`/login?plan=${plan}&next=${encodeURIComponent(`/mobile-checkout?plan=${plan}`)}`);
        return;
      }
      if (!res.ok) { setError(data?.detail || data?.message || "Could not start checkout."); return; }
      const url = data?.url || data?.checkout_url;
      if (!url) { setError("No checkout URL returned."); return; }
      let parsed; try { parsed = new URL(String(url)); } catch { parsed = null; }
      if (!parsed || !["https://checkout.stripe.com", "https://billing.stripe.com"].includes(parsed.origin)) {
        setError("Invalid checkout URL."); return;
      }
      window.location.href = parsed.href;
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const bg = "#0a0a0a";
  const card = "#111110";
  const hairline = "0.5px solid #1a1a19";

  if (isSuccess) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif', textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#3EE0A3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#06120c", marginBottom: 24 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#f5f5f4", letterSpacing: "-0.02em", marginBottom: 12, maxWidth: 300 }}>Payment successful</div>
        <div style={{ fontSize: 14, color: "#8a8a86", lineHeight: 1.6, maxWidth: 280, marginBottom: 28 }}>
          Reopen the Aurexis app to see your new plan. If it doesn't show up right away, use the "Refresh subscription status" button on the Pricing tab.
        </div>
        <div style={{ background: card, border: hairline, borderRadius: 12, padding: "12px 20px", fontSize: 13, color: "#6a6a66" }}>
          You can close this tab now.
        </div>
      </div>
    );
  }

  const highlights = PLAN_HIGHLIGHTS[plan] || [];

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "40px 20px", fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, justifyContent: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#3EE0A3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#06120c" }}>A</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#8a8a86", textTransform: "uppercase" }}>AUREXIS</div>
        </div>

        <div style={{ background: card, borderRadius: 20, padding: "28px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "#6a6a66", textTransform: "uppercase", marginBottom: 6 }}>{PLAN_LABEL[plan]} plan</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: "#f5f5f4", letterSpacing: "-0.03em", lineHeight: 1 }}>{planPriceLabel(plan)}</span>
            <span style={{ fontSize: 13, color: "#6a6a66", paddingBottom: 6 }}>/month</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {highlights.map((f, i) => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0", borderTop: i > 0 ? hairline : "none" }}>
                <span style={{ color: "#3EE0A3", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
                <span style={{ fontSize: 13.5, color: "#c8c8c5", lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: 16, fontSize: 12.5, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.16)", borderRadius: 8, padding: "10px 12px" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={loading}
            style={{
              width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 12,
              background: "#3EE0A3", color: "#06120c", border: "none",
              fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1, fontFamily: "inherit",
            }}
          >
            {loading ? "Loading…" : "Continue to checkout"}
          </button>
          <div style={{ fontSize: 11, color: "#6a6a66", textAlign: "center", marginTop: 10 }}>
            Cancel anytime. You'll be taken to Stripe's secure checkout.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
          {Object.keys(PLAN_PRICING).filter(p => p !== "free" && p !== plan).map(p => (
            <button
              key={p}
              onClick={() => {
                setPlan(p);
                setError("");
                const u = new URL(window.location.href);
                u.searchParams.set("plan", p);
                window.history.replaceState({}, "", u.toString());
              }}
              style={{ background: "none", border: "none", color: "#6a6a66", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              {PLAN_LABEL[p]} instead — {planPriceLabel(p)}/mo
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
