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
import "./index.css";

function MobileBlock() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#07090f", padding: "32px 24px", textAlign: "center",
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: "#00b450",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 28,
      }}>A</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 12 }}>
        Aurexis is built for desktop
      </div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 300, marginBottom: 32 }}>
        The trading dashboard requires a larger screen to use properly. Open it on your laptop or desktop computer for the full experience.
      </div>
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: "16px 20px", fontSize: 13,
        color: "rgba(255,255,255,0.35)", lineHeight: 1.5, maxWidth: 280,
      }}>
        <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>On your computer,</span>
        {" "}visit{" "}
        <span style={{ color: "#4ade80", fontWeight: 600 }}>useaurexis.com/app</span>
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
        <Route path="/terms"      element={<Terms />} />
        <Route path="/privacy"    element={<Privacy />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/refund"     element={<Refund />} />
        <Route path="/cookies"    element={<Cookies />} />
        <Route path="/waitlist"   element={<Navigate to="/signup" replace />} />
        <Route path="/login"      element={<Auth defaultView="login" />} />
        <Route path="/signup"     element={<Auth defaultView="signup" />} />
        <Route path="/app/*" element={<AppGate />} />
        <Route path="/*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
