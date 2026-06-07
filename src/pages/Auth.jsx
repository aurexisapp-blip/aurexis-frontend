import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const PLANS = [
  { id: "free",    label: "Free",    price: "$0"  },
  { id: "starter", label: "Starter", price: "$9"  },
  { id: "pro",     label: "Pro",     price: "$29" },
  { id: "elite",   label: "Elite",   price: "$99" },
];

function getInitialPlan() {
  const param = new URLSearchParams(window.location.search).get("plan") || "";
  const valid = ["free", "starter", "pro", "elite"];
  return valid.includes(param.toLowerCase()) ? param.toLowerCase() : "starter";
}

function useMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.108 17.64 11.8 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="15" height="17" viewBox="0 0 814 1000" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 612 0 510.7 0 414.8c0-167.2 109.2-255.8 216.2-255.8 57.4 0 105.5 38.2 141.9 38.2 35 0 90.1-40.8 155.5-40.8 24.6 0 108.2 2.6 168.9 87.5zm-68.7-179.5c31.4-37.5 53.4-89.9 53.4-142.3 0-7.7-.6-15.4-1.9-21.7C724.2 6.4 667.9 36.9 631.3 80c-29.5 34.4-56.9 86.8-56.9 140.5 0 8.3 1.3 16.6 1.9 19.1 3.2.6 8.3 1.3 13.4 1.3 51.1 0 103.7-27.4 136.7-79.5z"/>
    </svg>
  );
}

const OAUTH_ERRORS = {
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try email instead.",
  apple_denied:  "Apple sign-in was cancelled.",
  apple_failed:  "Apple sign-in failed. Please try email instead.",
};

export default function Auth({ defaultView = "login" }) {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [view, setView] = useState(defaultView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState(getInitialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const e = new URLSearchParams(window.location.search).get("error") || "";
    return OAUTH_ERRORS[e] || "";
  });

  function switchView(v) { setView(v); setEmail(""); setPassword(""); setError(""); }

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.detail || data?.message || "Login failed. Check your credentials."); return; }
      const token = data?.access_token || data?.token;
      if (token) localStorage.setItem("aurexis_token", token);
      navigate("/app");
    } catch {
      setError("Network error — check your connection.");
    } finally { setLoading(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const signupRes = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, plan }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) { setError(signupData?.detail || signupData?.message || "Signup failed."); return; }

      const newToken = signupData?.access_token || signupData?.token;
      if (newToken) localStorage.setItem("aurexis_token", newToken);

      if (plan === "free") { navigate("/app"); return; }

      const checkoutRes = await fetch(`${API}/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}) },
        body: JSON.stringify({ plan, success_url: `${window.location.origin}/app`, cancel_url: `${window.location.origin}/` }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) { setError(checkoutData?.detail || checkoutData?.message || "Could not start checkout."); return; }

      const url = checkoutData?.url || checkoutData?.checkout_url;
      if (url) {
        let parsed; try { parsed = new URL(String(url)); } catch { parsed = null; }
        if (!parsed || !["https://checkout.stripe.com", "https://billing.stripe.com"].includes(parsed.origin)) {
          setError("Invalid checkout URL."); return;
        }
        window.location.href = parsed.href;
      } else {
        setError("No checkout URL returned.");
      }
    } catch {
      setError("Network error — check your connection.");
    } finally { setLoading(false); }
  }

  const isLogin = view === "login";

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <div style={M.page}>
        {/* Compact top strip */}
        <div style={M.topStrip}>
          <a href="/" style={M.logoRow}>
            <div style={S.logoMark}>A</div>
            <span style={S.logoText}>AUREXIS</span>
          </a>
          <div style={M.tagline}>One AI pick. Every trading day.</div>
          <div style={M.statsRow}>
            {[
              { val: "73%", label: "Win rate" },
              { val: "2.4×", label: "Avg R/R" },
              { val: "1,200+", label: "Scanned" },
            ].map(({ val, label }) => (
              <div key={label} style={M.stat}>
                <div style={M.statVal}>{val}</div>
                <div style={M.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={M.formWrap}>
          <div style={M.formHeading}>{isLogin ? "Welcome back" : "Create your account"}</div>
          <div style={M.formSub}>{isLogin ? "Sign in to your account." : "Start free, upgrade anytime."}</div>

          <div style={S.socials}>
            <button type="button" style={S.socialBtn} onClick={() => { window.location.href = `${API}/auth/google/redirect`; }}>
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
            <button type="button" disabled style={{ ...S.socialBtn, ...S.appleBtn, opacity: 0.45, cursor: "not-allowed", position: "relative" }}>
              <AppleIcon />
              <span>Continue with Apple</span>
              <span style={S.comingSoon}>Soon</span>
            </button>
          </div>

          <div style={S.divider}>
            <div style={S.dividerLine} />
            <span style={S.dividerLabel}>or continue with email</span>
            <div style={S.dividerLine} />
          </div>

          <form onSubmit={isLogin ? handleLogin : handleSignup} style={S.fields} noValidate>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" placeholder="Email address" style={S.input}
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="Password" style={S.input}
            />

            {!isLogin && (
              <div style={S.planRow}>
                {PLANS.map((p) => {
                  const active = plan === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                      style={{ ...S.planPill, ...(active ? S.planPillActive : {}) }}>
                      <span style={{ ...S.planPillLabel, ...(active ? { color: "#fff" } : {}) }}>{p.label}</span>
                      <span style={{ ...S.planPillPrice, ...(active ? { color: "#4ade80" } : {}) }}>{p.price}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {error ? <div style={S.errorBox}>{error}</div> : null}

            <button type="submit" style={S.submit} disabled={loading}>
              {loading
                ? (isLogin ? "Signing in…" : "Creating account…")
                : (isLogin ? "Sign In →" : plan === "free" ? "Create Free Account →" : "Create Account & Pay →")}
            </button>
          </form>

          <div style={S.switchRow}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button type="button" style={S.switchLink} onClick={() => switchView(isLogin ? "signup" : "login")}>
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </div>

          <div style={S.legal}>
            By continuing you agree to our{" "}
            <a href="/terms" style={S.legalLink}>Terms</a> and{" "}
            <a href="/privacy" style={S.legalLink}>Privacy Policy</a>.
          </div>
        </div>
      </div>
    );
  }

  /* ── Desktop layout ── */
  return (
    <div style={S.page}>
      {/* Left panel — branding */}
      <div style={S.left}>
        <div style={S.leftInner}>
          <a href="/" style={S.leftLogo}>
            <div style={S.logoMark}>A</div>
            <span style={S.logoText}>AUREXIS</span>
          </a>

          <div style={S.leftHeadline}>
            One AI pick.<br />Every trading day.
          </div>
          <div style={S.leftSub}>
            The scanner analyzes 1,200+ stocks overnight and surfaces the single highest-conviction setup — with entry, stop, and targets ready at open.
          </div>

          <div style={S.stats}>
            {[
              { val: "73%",    label: "Win rate"       },
              { val: "2.4×",   label: "Avg R/R"        },
              { val: "1,200+", label: "Stocks scanned" },
            ].map(({ val, label }) => (
              <div key={label} style={S.stat}>
                <div style={S.statVal}>{val}</div>
                <div style={S.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={S.right}>
        <div style={S.form}>
          <div style={S.formHeading}>{isLogin ? "Welcome back" : "Create your account"}</div>
          <div style={S.formSub}>{isLogin ? "Sign in to access your AI picks." : "Start free, upgrade anytime."}</div>

          <div style={S.socials}>
            <button type="button" style={S.socialBtn} onClick={() => { window.location.href = `${API}/auth/google/redirect`; }}>
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
            <button type="button" disabled style={{ ...S.socialBtn, ...S.appleBtn, opacity: 0.45, cursor: "not-allowed", position: "relative" }}>
              <AppleIcon />
              <span>Continue with Apple</span>
              <span style={S.comingSoon}>Soon</span>
            </button>
          </div>

          <div style={S.divider}>
            <div style={S.dividerLine} />
            <span style={S.dividerLabel}>or continue with email</span>
            <div style={S.dividerLine} />
          </div>

          <form onSubmit={isLogin ? handleLogin : handleSignup} style={S.fields} noValidate>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" placeholder="Email address" style={S.input}
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="Password" style={S.input}
            />

            {!isLogin && (
              <div style={S.planRow}>
                {PLANS.map((p) => {
                  const active = plan === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                      style={{ ...S.planPill, ...(active ? S.planPillActive : {}) }}>
                      <span style={{ ...S.planPillLabel, ...(active ? { color: "#fff" } : {}) }}>{p.label}</span>
                      <span style={{ ...S.planPillPrice, ...(active ? { color: "#4ade80" } : {}) }}>{p.price}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {error ? <div style={S.errorBox}>{error}</div> : null}

            <button type="submit" style={S.submit} disabled={loading}>
              {loading
                ? (isLogin ? "Signing in…" : "Creating account…")
                : (isLogin ? "Sign In →" : plan === "free" ? "Create Free Account →" : "Create Account & Pay →")}
            </button>
          </form>

          <div style={S.switchRow}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button type="button" style={S.switchLink} onClick={() => switchView(isLogin ? "signup" : "login")}>
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </div>

          <div style={S.legal}>
            By continuing you agree to our{" "}
            <a href="/terms" style={S.legalLink}>Terms</a> and{" "}
            <a href="/privacy" style={S.legalLink}>Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Desktop styles
───────────────────────────────────────────── */
const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: "#07090f",
  },

  /* Left branding panel */
  left: {
    flex: "0 0 45%",
    background: "linear-gradient(160deg, #0a1a12 0%, #070d0a 50%, #060910 100%)",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 56px",
    position: "relative",
    overflow: "hidden",
  },
  leftInner: {
    position: "relative",
    zIndex: 1,
    maxWidth: 380,
  },
  leftLogo: {
    display: "flex", alignItems: "center", gap: 10,
    textDecoration: "none", marginBottom: 56,
  },
  logoMark: {
    width: 36, height: 36, borderRadius: 10,
    background: "#00b450",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0,
  },
  logoText: {
    fontSize: 17, fontWeight: 900, letterSpacing: "0.18em",
    color: "rgba(255,255,255,0.90)",
  },
  leftHeadline: {
    fontSize: 38, fontWeight: 800, color: "#fff",
    lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 20,
  },
  leftSub: {
    fontSize: 15, color: "rgba(255,255,255,0.42)",
    lineHeight: 1.65, marginBottom: 52,
  },
  stats: { display: "flex", gap: 36 },
  stat:  { display: "flex", flexDirection: "column", gap: 4 },
  statVal:   { fontSize: 26, fontWeight: 800, color: "#4ade80", letterSpacing: "-0.02em" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 },

  /* Right form panel */
  right: {
    flex: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "60px 48px", overflowY: "auto",
  },
  form:       { width: "100%", maxWidth: 380 },
  formHeading: { fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 },
  formSub:    { fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 28, lineHeight: 1.5 },

  socials: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 },
  socialBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    padding: "12px 16px", borderRadius: 11,
    border: "1px solid rgba(255,255,255,0.11)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.75)",
    fontSize: 14, fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit", width: "100%",
  },
  appleBtn: {
    background: "rgba(255,255,255,0.92)",
    borderColor: "rgba(255,255,255,0.92)",
    color: "#111",
  },
  comingSoon: {
    position: "absolute", right: 14,
    fontSize: 10, fontWeight: 700,
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.45)",
    padding: "2px 7px", borderRadius: 20, letterSpacing: "0.04em",
  },
  divider:     { display: "flex", alignItems: "center", gap: 12, marginBottom: 22 },
  dividerLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.07)" },
  dividerLabel: { fontSize: 11, color: "rgba(255,255,255,0.22)", fontWeight: 500, whiteSpace: "nowrap" },

  fields: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10, padding: "13px 14px",
    fontSize: 14, color: "rgba(255,255,255,0.90)",
    outline: "none", width: "100%", boxSizing: "border-box",
    fontFamily: "inherit",
  },
  planRow: { display: "flex", gap: 7, marginTop: 2 },
  planPill: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    padding: "10px 4px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    cursor: "pointer", fontFamily: "inherit", gap: 3, transition: "all 0.15s",
  },
  planPillActive: { background: "rgba(0,180,80,0.12)", border: "1px solid rgba(0,180,80,0.35)" },
  planPillLabel:  { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" },
  planPillPrice:  { fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.30)" },

  errorBox: {
    fontSize: 13, color: "#f87171",
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.16)",
    borderRadius: 8, padding: "10px 13px", lineHeight: 1.4,
  },
  submit: {
    padding: "14px 0", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg, #16a34a, #15803d)",
    color: "#fff", fontSize: 15, fontWeight: 700,
    cursor: "pointer", letterSpacing: "0.01em",
    fontFamily: "inherit", marginTop: 4,
    boxShadow: "0 4px 24px rgba(22,163,74,0.30)", width: "100%",
  },
  switchRow: { marginTop: 22, fontSize: 13, color: "rgba(255,255,255,0.32)" },
  switchLink: {
    background: "none", border: "none", color: "#4ade80",
    fontWeight: 600, cursor: "pointer", fontSize: 13,
    fontFamily: "inherit", padding: 0, marginLeft: 5,
  },
  legal:     { marginTop: 18, fontSize: 11, color: "rgba(255,255,255,0.18)", lineHeight: 1.5 },
  legalLink: { color: "rgba(255,255,255,0.30)", textDecoration: "underline" },
};

/* ─────────────────────────────────────────────
   Mobile styles
───────────────────────────────────────────── */
const M = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: "#07090f",
  },

  /* Compact top strip */
  topStrip: {
    background: "linear-gradient(160deg, #0a1a12 0%, #07100a 100%)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    padding: "28px 24px 24px",
  },
  logoRow: {
    display: "flex", alignItems: "center", gap: 9,
    textDecoration: "none", marginBottom: 18,
  },
  tagline: {
    fontSize: 22, fontWeight: 800, color: "#fff",
    letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 20,
  },
  statsRow: {
    display: "flex", gap: 0,
  },
  stat: {
    flex: 1, display: "flex", flexDirection: "column", gap: 3,
    borderLeft: "1px solid rgba(255,255,255,0.07)",
    paddingLeft: 14,
  },
  statVal:   { fontSize: 20, fontWeight: 800, color: "#4ade80", letterSpacing: "-0.02em" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 },

  /* Form area */
  formWrap: {
    flex: 1,
    padding: "32px 24px 40px",
    overflowY: "auto",
  },
  formHeading: { fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 5 },
  formSub:     { fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24, lineHeight: 1.5 },
};
