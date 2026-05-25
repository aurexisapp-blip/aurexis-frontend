import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:8000";

const PLANS = [
  {
    id: "starter",
    label: "Starter",
    price: "$9",
    period: "/mo",
    desc: "Daily AI pick, basic signals",
  },
  {
    id: "pro",
    label: "Pro",
    price: "$29",
    period: "/mo",
    desc: "Full analysis, screener, watchlist",
  },
  {
    id: "elite",
    label: "Elite",
    price: "$99",
    period: "/mo",
    desc: "Everything + priority data feeds",
  },
];

export default function Auth({ defaultView = "login" }) {
  const navigate = useNavigate();
  const [view, setView] = useState(defaultView);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setEmail("");
    setPassword("");
    setPlan("pro");
    setError("");
  }

  function switchView(v) {
    setView(v);
    resetForm();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("aurexis_token")}` },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || data?.message || "Login failed. Check your credentials.");
        return;
      }
      const token = data?.access_token || data?.token;
      if (token) localStorage.setItem("aurexis_token", token);
      navigate("/app");
    } catch {
      setError("Network error — make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const signupRes = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("aurexis_token")}` },
        body: JSON.stringify({ email, password, plan }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        setError(signupData?.detail || signupData?.message || "Signup failed.");
        return;
      }

      const checkoutRes = await fetch(`${API}/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("aurexis_token")}` },
        body: JSON.stringify({
          plan,
          success_url: window.location.origin + "/app",
          cancel_url: window.location.origin + "/pricing",
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        setError(checkoutData?.detail || checkoutData?.message || "Could not create checkout session.");
        return;
      }
      const url = checkoutData?.url || checkoutData?.checkout_url;
      if (url) {
        window.location.href = url;
      } else {
        setError("No checkout URL returned from server.");
      }
    } catch {
      setError("Network error — make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <span style={styles.logoMark}>A</span>
          <span style={styles.logoText}>AUREXIS</span>
        </div>

        {/* Tab switcher */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(view === "login" ? styles.tabActive : {}) }}
            onClick={() => switchView("login")}
            type="button"
          >
            Log In
          </button>
          <button
            style={{ ...styles.tab, ...(view === "signup" ? styles.tabActive : {}) }}
            onClick={() => switchView("signup")}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {view === "login" ? (
          <form onSubmit={handleLogin} style={styles.form} noValidate>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={styles.input}
              />
            </div>

            {error ? <div style={styles.error}>{error}</div> : null}

            <button type="submit" style={styles.submit} disabled={loading}>
              {loading ? "Logging in…" : "Log In"}
            </button>

            <div style={styles.switchRow}>
              Don't have an account?{" "}
              <button type="button" style={styles.switchLink} onClick={() => switchView("signup")}>
                Sign up
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} style={styles.form} noValidate>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Choose a plan</label>
              <div style={styles.planGrid}>
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    style={{
                      ...styles.planCard,
                      ...(plan === p.id ? styles.planCardActive : {}),
                    }}
                  >
                    <div style={styles.planLabel}>{p.label}</div>
                    <div style={styles.planPrice}>
                      <span style={styles.planPriceNum}>{p.price}</span>
                      <span style={styles.planPeriod}>{p.period}</span>
                    </div>
                    <div style={styles.planDesc}>{p.desc}</div>
                    {plan === p.id ? <div style={styles.planCheck}>✓</div> : null}
                  </button>
                ))}
              </div>
            </div>

            {error ? <div style={styles.error}>{error}</div> : null}

            <button type="submit" style={styles.submit} disabled={loading}>
              {loading ? "Creating account…" : "Create Account & Continue"}
            </button>

            <div style={styles.switchRow}>
              Already have an account?{" "}
              <button type="button" style={styles.switchLink} onClick={() => switchView("login")}>
                Log in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#070b12",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(10,12,16,0.72)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "36px 32px 32px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
    justifyContent: "center",
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "rgba(0,180,80,1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 900,
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: "32px",
    textAlign: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.92)",
  },
  tabs: {
    display: "flex",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: 3,
    marginBottom: 28,
    gap: 3,
  },
  tab: {
    flex: 1,
    padding: "8px 0",
    border: "none",
    borderRadius: 7,
    background: "transparent",
    color: "rgba(255,255,255,0.50)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    letterSpacing: 0.2,
  },
  tabActive: {
    background: "rgba(0,180,80,0.14)",
    color: "rgba(0,200,90,1)",
    border: "1px solid rgba(0,180,80,0.22)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 9,
    padding: "11px 14px",
    fontSize: 14,
    color: "rgba(255,255,255,0.90)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease",
    fontFamily: "inherit",
  },
  planGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginTop: 2,
  },
  planCard: {
    position: "relative",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10,
    padding: "14px 10px 12px",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.15s ease",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontFamily: "inherit",
  },
  planCardActive: {
    background: "rgba(0,180,80,0.10)",
    border: "1px solid rgba(0,180,80,0.35)",
    boxShadow: "0 0 0 1px rgba(0,180,80,0.20)",
  },
  planLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "rgba(255,255,255,0.80)",
    letterSpacing: 0.3,
  },
  planPrice: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 1,
    marginTop: 2,
  },
  planPriceNum: {
    fontSize: 20,
    fontWeight: 900,
    color: "rgba(255,255,255,0.92)",
    lineHeight: 1,
  },
  planPeriod: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    fontWeight: 500,
  },
  planDesc: {
    fontSize: 10,
    color: "rgba(255,255,255,0.38)",
    lineHeight: 1.35,
    marginTop: 2,
  },
  planCheck: {
    position: "absolute",
    top: 6,
    right: 8,
    fontSize: 10,
    color: "rgba(0,200,90,1)",
    fontWeight: 900,
  },
  error: {
    background: "rgba(255,90,90,0.08)",
    border: "1px solid rgba(255,90,90,0.20)",
    borderRadius: 8,
    padding: "10px 13px",
    fontSize: 13,
    color: "rgba(255,120,120,0.90)",
    lineHeight: 1.45,
  },
  submit: {
    background: "rgba(0,180,80,1)",
    border: "none",
    borderRadius: 10,
    padding: "13px 0",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
    letterSpacing: 0.3,
    marginTop: 2,
    transition: "opacity 0.15s ease",
    fontFamily: "inherit",
    width: "100%",
  },
  switchRow: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.42)",
  },
  switchLink: {
    background: "none",
    border: "none",
    color: "rgba(0,200,90,0.90)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
    textDecoration: "underline",
    textUnderlineOffset: 2,
  },
};
