import React, { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// "Get notified when the iPhone app launches" email capture
// (POST /auth/launch-notify). Used on the phone "open on your computer"
// screen and in the landing page hero on phones. `source` records where the
// signup came from. Swap for an App Store link once the app is approved.
export default function LaunchNotifyForm({ source = "phone_gate", compact = false }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done | error
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending"); setErr("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/launch-notify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Something went wrong. Try again.");
      }
      setState("done");
    } catch (e2) { setErr(e2.message || "Something went wrong. Try again."); setState("error"); }
  };
  const box = {
    width: "100%", maxWidth: 320, boxSizing: "border-box", textAlign: "center",
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, padding: compact ? "14px 14px 12px" : "18px 18px 16px",
  };
  if (state === "done") {
    return (
      <div style={box}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", marginBottom: 4 }}>You're on the list ✓</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>We'll email you when the Aurexis iPhone app is live.</div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} style={box}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: compact ? 4 : 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#facc15" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>iPhone app coming soon</span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: compact ? 10 : 14 }}>
        Get notified when the app launches.
      </div>
      <div style={compact ? { display: "flex", gap: 8 } : undefined}>
        <input
          type="email" required autoComplete="email" inputMode="email" placeholder="you@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address"
          style={{
            width: "100%", minWidth: 0, boxSizing: "border-box", padding: compact ? "11px 12px" : "13px 14px", borderRadius: 10,
            marginBottom: compact ? 0 : 10, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff", fontSize: 16, outline: "none", fontFamily: "inherit",
          }}
        />
        <button type="submit" disabled={state === "sending"} style={{
          width: compact ? "auto" : "100%", flexShrink: 0, padding: compact ? "11px 16px" : "13px 0", borderRadius: 10,
          border: "none", cursor: "pointer", background: "#00b450", color: "#fff", fontSize: 15, fontWeight: 700,
          fontFamily: "inherit", opacity: state === "sending" ? 0.6 : 1, whiteSpace: "nowrap",
        }}>
          {state === "sending" ? "Adding…" : "Notify me"}
        </button>
      </div>
      {err ? <div style={{ fontSize: 12, color: "#f87171", marginTop: 8 }}>{err}</div> : null}
      {compact ? null : <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 10 }}>Just the launch email. No spam.</div>}
    </form>
  );
}
