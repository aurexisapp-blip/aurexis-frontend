import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const REFRESH_MS = 8000;

const T = {
  bg: "#07090f",
  card: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.09)",
  text: "rgba(255,255,255,0.92)",
  textSec: "rgba(255,255,255,0.55)",
  textFaint: "rgba(255,255,255,0.32)",
  green: "#4ade80",
  greenSoft: "rgba(74,222,128,0.12)",
  blue: "#60a5fa",
};

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14,
      padding: "18px 20px", flex: 1, minWidth: 150,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.textFaint, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent || T.text, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      {sub ? <div style={{ fontSize: 12, color: T.textSec, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

function DayBars({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ fontSize: 13, color: T.textFaint, padding: "24px 0" }}>No visits recorded yet.</div>;
  }
  const max = Math.max(1, ...data.map(d => (d.web || 0) + (d.ios || 0)));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "8px 2px 0" }}>
      {data.map((d) => {
        const total = (d.web || 0) + (d.ios || 0);
        const webH = ((d.web || 0) / max) * 120;
        const iosH = ((d.ios || 0) / max) * 120;
        return (
          <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 8 }} title={`${d.day}: ${total} visit${total === 1 ? "" : "s"}`}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 120, width: "100%", gap: 1 }}>
              <div style={{ background: T.blue, height: iosH, borderRadius: "2px 2px 0 0", opacity: 0.85 }} />
              <div style={{ background: T.green, height: webH, borderRadius: iosH > 0 ? 0 : "2px 2px 0 0", opacity: 0.85 }} />
            </div>
            <div style={{ fontSize: 9, color: T.textFaint, whiteSpace: "nowrap" }}>{d.day.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalytics() {
  const [secret, setSecret] = useState(() => {
    try { return sessionStorage.getItem("aurexis_admin_secret") || ""; } catch { return ""; }
  });
  const [secretInput, setSecretInput] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, forceTick] = useState(0);
  const timerRef = useRef(null);

  const fetchData = useCallback(async (secretToUse) => {
    if (!secretToUse) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secretToUse }),
      });
      if (res.status === 403 || res.status === 401) {
        setError("Incorrect secret.");
        setData(null);
        try { sessionStorage.removeItem("aurexis_admin_secret"); } catch {}
        setSecret("");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError("");
    } catch (e) {
      setError("Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!secret) return;
    fetchData(secret);
    timerRef.current = setInterval(() => fetchData(secret), REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [secret, fetchData]);

  // Re-render every second so the "Xs ago" labels stay live between polls.
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const unlock = (e) => {
    e.preventDefault();
    if (!secretInput.trim()) return;
    try { sessionStorage.setItem("aurexis_admin_secret", secretInput.trim()); } catch {}
    setSecret(secretInput.trim());
  };

  if (!secret) {
    return (
      <div style={{
        minHeight: "100vh", background: T.bg, color: T.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      }}>
        <form onSubmit={unlock} style={{ width: 320, padding: 28, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.green, marginBottom: 8 }}>Aurexis</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Analytics access</div>
          <input
            type="password" autoFocus value={secretInput} onChange={e => setSecretInput(e.target.value)}
            placeholder="Admin secret"
            style={{
              width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.06)", border: `1px solid ${T.cardBorder}`,
              color: T.text, fontSize: 14, outline: "none", marginBottom: 14, fontFamily: "inherit",
            }}
          />
          {error ? <div style={{ fontSize: 13, color: "#f87171", marginBottom: 14 }}>{error}</div> : null}
          <button type="submit" style={{
            width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      padding: "32px 28px 80px",
    }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.green, marginBottom: 4 }}>Aurexis · Private</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em" }}>Traffic & presence</div>
          </div>
          <div style={{ fontSize: 12, color: T.textFaint, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? "#fbbf24" : T.green, display: "inline-block" }} />
            {loading ? "Refreshing…" : `Live · updates every ${REFRESH_MS / 1000}s`}
          </div>
        </div>

        {error ? (
          <div style={{ fontSize: 13, color: "#f87171", marginBottom: 20 }}>{error}</div>
        ) : null}

        {!data ? (
          <div style={{ fontSize: 13, color: T.textFaint }}>Loading…</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard label="Currently active" value={data.active_now} accent={T.green} sub="last 3 min" />
              <StatCard label="Active (24h)" value={data.active_last_24h} />
              <StatCard label="Active (7d)" value={data.active_last_7d} />
              <StatCard label="Total visits (all-time)" value={data.total_visits} sub={`${data.total_by_platform?.web || 0} web · ${data.total_by_platform?.ios || 0} iOS`} />
            </div>

            <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Visits — last 30 days</div>
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: T.textSec }}>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: T.green, marginRight: 5 }} />Web</span>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: T.blue, marginRight: 5 }} />iOS</span>
                </div>
              </div>
              <DayBars data={data.visits_by_day} />
            </div>

            <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "16px 22px", borderBottom: `1px solid ${T.cardBorder}`, fontSize: 13, fontWeight: 700 }}>
                Currently active ({data.currently_active?.length || 0})
              </div>
              {(!data.currently_active || data.currently_active.length === 0) ? (
                <div style={{ padding: "24px 22px", fontSize: 13, color: T.textFaint }}>Nobody active right now.</div>
              ) : (
                <div>
                  {data.currently_active.map((s) => (
                    <div key={s.session_id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 22px", borderTop: `1px solid ${T.cardBorder}`, fontSize: 13,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                          padding: "3px 7px", borderRadius: 5,
                          background: s.platform === "ios" ? "rgba(96,165,250,0.12)" : T.greenSoft,
                          color: s.platform === "ios" ? T.blue : T.green,
                          flexShrink: 0,
                        }}>
                          {s.platform}
                        </span>
                        <span style={{ color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.email || "Anonymous"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 16, color: T.textFaint, fontSize: 12, flexShrink: 0 }}>
                        <span>since {timeAgo(s.first_seen_at)}</span>
                        <span>ping {timeAgo(s.last_seen_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
