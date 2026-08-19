import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isNativeApp } from "./lib/platform";
import App from "./App";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Disclaimer from "./pages/Disclaimer";
import Refund from "./pages/Refund";
import Cookies from "./pages/Cookies";
import Legal from "./pages/Legal";
import MobileCheckout from "./pages/MobileCheckout";
import AdminAnalytics from "./pages/AdminAnalytics";
import "./index.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Anonymous traffic/presence heartbeat for the private /admin/analytics
// dashboard -- fired here (wrapping every route) rather than inside the
// authenticated App component, since most day-one visitors hit the landing
// or login page and never reach it. One ping on load, then every 45s while
// the tab/app is open. session_id is a random UUID persisted in
// localStorage so reloads within the same browser/app install count as one
// continuous session rather than a fresh row each time; the backend upserts
// on it either way.
function useVisitPing() {
  useEffect(() => {
    let sid;
    try {
      sid = localStorage.getItem("aurexis_session_id");
      if (!sid) {
        sid = (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        localStorage.setItem("aurexis_session_id", sid);
      }
    } catch {
      sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    const ping = () => {
      const tok = (() => { try { return localStorage.getItem("aurexis_token"); } catch { return null; } })();
      fetch(`${API_BASE_URL}/track/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ session_id: sid, platform: isNativeApp() ? "ios" : "web" }),
      }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 45000);
    return () => clearInterval(id);
  }, []);
}

function MobileBlock() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#07090f", padding: "40px 24px", textAlign: "center",
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      position: "relative", overflow: "hidden",
    }}>
      {/* Subtle glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,180,80,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: "#00b450",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 24,
        boxShadow: "0 4px 24px rgba(0,180,80,0.30)",
      }}>A</div>

      {/* Wordmark */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,255,255,0.30)", marginBottom: 20, textTransform: "uppercase" }}>
        Aurexis
      </div>

      {/* Headline */}
      <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 12, maxWidth: 280 }}>
        Open this on your computer
      </div>

      {/* Subtext */}
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.40)", lineHeight: 1.65, maxWidth: 270, marginBottom: 36 }}>
        The Aurexis trading dashboard is designed for desktop. Head to your laptop or computer to get the full experience.
      </div>

      {/* URL card */}
      <div style={{
        background: "rgba(0,180,80,0.06)", border: "1px solid rgba(0,180,80,0.18)",
        borderRadius: 14, padding: "14px 22px", marginBottom: 32,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 6 }}>
          Visit on desktop
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#4ade80", letterSpacing: "-0.01em" }}>
          useaurexis.com/app
        </div>
      </div>

      {/* Mobile app coming soon pill */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 99, padding: "8px 16px",
      }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#facc15" }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
          Mobile app coming soon
        </span>
      </div>
    </div>
  );
}

// TEMPORARY QA escape hatch — lets tonight's mobile-responsive work be
// previewed on a real phone without touching the gate's default behavior.
// Remove this once real-device verification is done.
// Persisted to sessionStorage so it survives internal client-side
// navigations (login -> OTP -> /app, or /app -> /login when logged out)
// that don't carry the query string forward.
function isMobilePreview() {
  if (new URLSearchParams(window.location.search).get("mobilepreview") === "1") {
    try { sessionStorage.setItem("aurexis_mobilepreview", "1"); } catch {}
    return true;
  }
  try { return sessionStorage.getItem("aurexis_mobilepreview") === "1"; } catch { return false; }
}

function AppGate() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Capture OAuth token from URL before the mobile gate check -- this used
  // to run AFTER the `if (isMobile) return <MobileBlock />` below despite
  // the comment here saying otherwise, so any Google/Apple web login that
  // completed on a phone had its token silently dropped: MobileBlock
  // rendered instead of ever reaching this code, the token never made it
  // into localStorage, and the user was stuck logged out with no error.
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    localStorage.setItem("aurexis_token", urlToken);
    if (params.get("new_user") === "1") {
      localStorage.setItem("aurexis_force_onboarding", "1");
    }
    window.history.replaceState({}, "", window.location.pathname);
  }

  if (isMobile && !isMobilePreview() && !isNativeApp()) return <MobileBlock />;

  if (!localStorage.getItem("aurexis_token")) return <Navigate to="/login" replace />;
  return <App />;
}

function RootRoutes() {
  useVisitPing();
  return (
      <Routes>
        <Route path="/legal"      element={<Legal />} />
        <Route path="/terms"      element={<Terms />} />
        <Route path="/privacy"    element={<Privacy />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/refund"     element={<Refund />} />
        <Route path="/cookies"    element={<Cookies />} />
        <Route path="/waitlist"   element={<Navigate to="/signup" replace />} />
        {/* Login/signup are reachable on mobile web unconditionally -- they
            were previously gated behind the same desktop-only MobileBlock
            as the dashboard, which meant nobody on a phone could even see
            the login form. That block made sense before the iOS app
            existed; now the app's own paywall hands off to mobile Safari
            expecting a working login/checkout flow there. */}
        <Route path="/login"      element={<Auth defaultView="login" />} />
        <Route path="/signup"     element={<Auth defaultView="signup" />} />
        {/* Standalone destination for the iOS paywall's Safari handoff --
            no site nav, no marketing sections, just the selected plan and
            a path into Stripe checkout. Deliberately its own route rather
            than reusing /signup: that page shows all 3 tiers plus the
            two-column marketing layout, neither of which belongs on the
            other end of an in-app "Get Starter" tap. */}
        <Route path="/mobile-checkout" element={<MobileCheckout />} />
        {/* Private, secret-gated traffic/presence dashboard. Deliberately
            not linked from any nav -- reached only by typing the URL. */}
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/app/*" element={<AppGate />} />
        <Route path="/*" element={isNativeApp() ? <Navigate to="/login" replace /> : <LandingPage />} />
      </Routes>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <RootRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
