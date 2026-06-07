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


const OAUTH_ERRORS = {
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try email instead.",
};

export default function Auth({ defaultView = "login" }) {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [view, setView] = useState(defaultView);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState(getInitialPlan);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otpView, setOtpView] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpResending, setOtpResending] = useState(false);
  const [error, setError] = useState(() => {
    const e = new URLSearchParams(window.location.search).get("error") || "";
    return OAUTH_ERRORS[e] || "";
  });

  function switchView(v) { setView(v); setFirstName(""); setLastName(""); setEmail(""); setPassword(""); setError(""); setTermsAccepted(false); setOtpView(false); setOtpCode(""); }

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

      if (data?.requires_2fa) {
        setOtpEmail(data.email);
        setOtpView(true);
        return;
      }

      const token = data?.access_token || data?.token;
      if (token) {
        const prevUser = localStorage.getItem("aurexis_user_email");
        if (prevUser && prevUser !== email) localStorage.removeItem("aurexis_onboarding_complete");
        localStorage.setItem("aurexis_token", token);
        localStorage.setItem("aurexis_user_email", email);
      }
      navigate("/app");
    } catch {
      setError("Network error — check your connection.");
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.detail || "Invalid code. Try again."); return; }
      const token = data?.access_token || data?.token;
      if (token) {
        localStorage.setItem("aurexis_token", token);
        localStorage.setItem("aurexis_user_email", otpEmail);
      }
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
        body: JSON.stringify({ email, password, plan, first_name: firstName.trim(), last_name: lastName.trim() }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) { setError(signupData?.detail || signupData?.message || "Signup failed."); return; }

      const newToken = signupData?.access_token || signupData?.token;
      if (newToken) {
        localStorage.setItem("aurexis_force_onboarding", "1");
        localStorage.setItem("aurexis_token", newToken);
        localStorage.setItem("aurexis_user_email", email);
        if (signupData?.first_name) localStorage.setItem("aurexis_user_first_name", signupData.first_name);
      }

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

  async function handleOtpResend() {
    setOtpResending(true);
    setError("");
    try {
      await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, password: "" }),
      });
    } catch {}
    setOtpResending(false);
  }

  // 2FA OTP screen
  if (otpView) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07090f", fontFamily: '"Inter", -apple-system, sans-serif' }}>
        <div style={{ width: "100%", maxWidth: 380, padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(0,180,80,0.20), rgba(0,180,80,0.05))", border: "1px solid rgba(0,180,80,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>🔐</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>Check your email</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.40)", lineHeight: 1.6 }}>
              We sent a 6-digit code to<br />
              <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{otpEmail}</span>
            </div>
          </div>
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit code" autoFocus
              style={{
                ...S.input, textAlign: "center", fontSize: 28,
                fontWeight: 800, letterSpacing: "0.3em", padding: "16px",
              }}
            />
            {error ? <div style={S.errorBox}>{error}</div> : null}
            <button
              type="submit"
              style={{ ...S.submit, opacity: (loading || otpCode.length < 6) ? 0.5 : 1, fontSize: 15, padding: "14px" }}
              disabled={loading || otpCode.length < 6}
            >
              {loading ? "Verifying…" : otpCode.length < 6 ? `Enter ${6 - otpCode.length} more digit${6 - otpCode.length !== 1 ? "s" : ""}` : "Verify & Sign In →"}
            </button>
          </form>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <button type="button" onClick={handleOtpResend} disabled={otpResending}
              style={{ background: "none", border: "none", color: "rgba(0,180,80,0.75)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
              {otpResending ? "Sending…" : "Resend code"}
            </button>
            <button type="button" onClick={() => { setOtpView(false); setOtpCode(""); setError(""); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.28)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              { val: "1,200+", label: "Scanned" },
              { val: "1",      label: "Daily pick" },
              { val: "3",      label: "Signals" },
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
            <button type="button" style={S.socialBtn} onClick={() => { window.location.href = `${API}/auth/google/redirect?plan=${plan}&origin=${encodeURIComponent(window.location.origin)}`; }}>
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
          </div>

          <div style={S.divider}>
            <div style={S.dividerLine} />
            <span style={S.dividerLabel}>or continue with email</span>
            <div style={S.dividerLine} />
          </div>

          <form onSubmit={isLogin ? handleLogin : handleSignup} style={S.fields} noValidate>
            {!isLogin && (
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  required autoComplete="given-name" placeholder="First name"
                  style={{ ...S.input, flex: 1 }}
                />
                <input
                  type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  required autoComplete="family-name" placeholder="Last name"
                  style={{ ...S.input, flex: 1 }}
                />
              </div>
            )}
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" placeholder="Email address" style={S.input}
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={isLogin ? "Password" : "Password (min 8 characters)"} style={S.input}
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

            {!isLogin && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginTop: 2 }}>
                <input
                  type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ width: 15, height: 15, marginTop: 2, accentColor: "#00b450", flexShrink: 0, cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                  By creating an account you agree to our{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline" }}>Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline" }}>Privacy Policy</a>.
                </span>
              </label>
            )}

            {error ? <div style={S.errorBox}>{error}</div> : null}

            <button type="submit" style={{ ...S.submit, opacity: (!isLogin && !termsAccepted) ? 0.45 : 1 }} disabled={loading || (!isLogin && !termsAccepted)}>
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
              { val: "1,200+", label: "Stocks scanned nightly" },
              { val: "1",      label: "Pick per trading day"   },
              { val: "3",      label: "Signals per pick"       },
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
            <button type="button" style={S.socialBtn} onClick={() => { window.location.href = `${API}/auth/google/redirect?plan=${plan}&origin=${encodeURIComponent(window.location.origin)}`; }}>
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
          </div>

          <div style={S.divider}>
            <div style={S.dividerLine} />
            <span style={S.dividerLabel}>or continue with email</span>
            <div style={S.dividerLine} />
          </div>

          <form onSubmit={isLogin ? handleLogin : handleSignup} style={S.fields} noValidate>
            {!isLogin && (
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  required autoComplete="given-name" placeholder="First name"
                  style={{ ...S.input, flex: 1 }}
                />
                <input
                  type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  required autoComplete="family-name" placeholder="Last name"
                  style={{ ...S.input, flex: 1 }}
                />
              </div>
            )}
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" placeholder="Email address" style={S.input}
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={isLogin ? "Password" : "Password (min 8 characters)"} style={S.input}
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

            {!isLogin && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginTop: 2 }}>
                <input
                  type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ width: 15, height: 15, marginTop: 2, accentColor: "#00b450", flexShrink: 0, cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                  By creating an account you agree to our{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline" }}>Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline" }}>Privacy Policy</a>.
                </span>
              </label>
            )}

            {error ? <div style={S.errorBox}>{error}</div> : null}

            <button type="submit" style={{ ...S.submit, opacity: (!isLogin && !termsAccepted) ? 0.45 : 1 }} disabled={loading || (!isLogin && !termsAccepted)}>
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
