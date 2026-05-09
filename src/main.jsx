import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Disclaimer from "./pages/Disclaimer";
import Refund from "./pages/Refund";
import Cookies from "./pages/Cookies";
import "./index.css";

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
        <Route path="/*"          element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
