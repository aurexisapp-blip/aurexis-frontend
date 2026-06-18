import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Disclaimer from "./pages/Disclaimer";
import Refund from "./pages/Refund";
import Cookies from "./pages/Cookies";
import Legal from "./pages/Legal";
import Performance from "./pages/Performance";
import "./index.css";

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

function AppGate() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isMobile) return <MobileBlock />;

  // Capture OAuth token from URL before the gate check so it isn't lost
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    localStorage.setItem("aurexis_token", urlToken);
    if (params.get("new_user") === "1") {
      localStorage.setItem("aurexis_force_onboarding", "1");
    }
    window.history.replaceState({}, "", window.location.pathname);
  }
  if (!localStorage.getItem("aurexis_token")) return <Navigate to="/login" replace />;
  return <App />;
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/legal"      element={<Legal />} />
        <Route path="/terms"      element={<Terms />} />
        <Route path="/privacy"    element={<Privacy />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/refund"     element={<Refund />} />
        <Route path="/cookies"    element={<Cookies />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/waitlist"   element={<Navigate to="/signup" replace />} />
        <Route path="/login"      element={window.innerWidth < 768 ? <MobileBlock /> : <Auth defaultView="login" />} />
        <Route path="/signup"     element={window.innerWidth < 768 ? <MobileBlock /> : <Auth defaultView="signup" />} />
        <Route path="/app/*" element={<AppGate />} />
        <Route path="/*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
