import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Disclaimer from "./pages/Disclaimer";
import Refund from "./pages/Refund";
import Cookies from "./pages/Cookies";
import Waitlist from "./pages/Waitlist";
import "./index.css";

function ComingSoon() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ fontSize: 72, fontWeight: 800, color: "#00b450", lineHeight: 1 }}>A</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", letterSpacing: "0.3em", marginTop: 12 }}>AUREXIS</div>
      <div style={{ fontSize: 32, fontWeight: 600, color: "#fff", marginTop: 24 }}>Coming June 6</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 12 }}>AI-powered stock signals. Built different.</div>
    </div>
  );
}

function AppGate() {
  if (localStorage.getItem("aurexis_preview") === "preview2026") return <App />;
  return <ComingSoon />;
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
        <Route path="/waitlist"   element={<Waitlist />} />
        <Route path="/login"      element={<Auth defaultView="login" />} />
        <Route path="/signup"     element={<Auth defaultView="signup" />} />
        <Route path="/app/*" element={<AppGate />} />
        <Route path="/*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
