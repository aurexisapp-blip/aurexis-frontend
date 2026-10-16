import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { isNativeApp } from "./platform";

// Accounts whose visits never count in any traffic numbers (mirrors
// ANALYTICS_EXCLUDE_EMAILS on the backend).
const EXCLUDED_EMAILS = ["ishanbais13@gmail.com", "baisishan48@gmail.com", "applereview@useaurexis.com"];
const OPT_OUT_KEY = "aurexis_no_analytics";

// Visit any page with ?notrack=1 once on a device/browser to stop counting it
// (persists in localStorage); ?notrack=0 turns counting back on. Signed-in
// owner accounts are excluded automatically, this covers logged-out browsing.
(function readNotrackParam() {
  try {
    const v = new URLSearchParams(window.location.search).get("notrack");
    if (v === "1") localStorage.setItem(OPT_OUT_KEY, "1");
    if (v === "0") localStorage.removeItem(OPT_OUT_KEY);
  } catch {}
})();

export function isTrackingDisabled() {
  try {
    if (localStorage.getItem(OPT_OUT_KEY) === "1") return true;
    let email = (localStorage.getItem("aurexis_user_email") || "").toLowerCase();
    if (!email) {
      // Google sign-in doesn't store the email; read it from the JWT payload.
      const tok = localStorage.getItem("aurexis_token") || "";
      const part = tok.split(".")[1];
      if (part) email = String(JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))).email || "").toLowerCase();
    }
    return EXCLUDED_EMAILS.includes(email);
  } catch {
    return false;
  }
}

// Vercel Web Analytics: privacy-friendly page views and referrers for the
// website (no cookies). Not loaded inside the iOS app.
export function SiteAnalytics() {
  if (isNativeApp()) return null;
  return <Analytics beforeSend={(event) => (isTrackingDisabled() ? null : event)} />;
}
