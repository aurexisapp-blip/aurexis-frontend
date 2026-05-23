import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const S = {
  page: {
    minHeight: "100vh",
    background: "#000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: "24px 16px",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#0a0a0a",
    border: "1px solid rgba(0,255,148,0.15)",
    borderRadius: 16,
    padding: "40px 36px",
    boxShadow: "0 0 60px rgba(0,255,148,0.04), 0 24px 64px rgba(0,0,0,0.6)",
  },
  logo: {
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: "0.2em",
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
    marginBottom: 6,
  },
  tagline: {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(0,255,148,0.6)",
    letterSpacing: "0.08em",
    textAlign: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.1em",
    marginBottom: 7,
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 9,
    padding: "12px 14px",
    fontSize: 14,
    color: "#fff",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  },
  inputFocus: {
    borderColor: "rgba(0,255,148,0.45)",
    background: "rgba(0,255,148,0.02)",
  },
  fieldWrap: {
    marginBottom: 18,
  },
  btn: {
    width: "100%",
    padding: "13px 0",
    borderRadius: 9,
    border: "none",
    background: "#00FF94",
    color: "#000",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "0.04em",
    cursor: "pointer",
    marginTop: 6,
    transition: "opacity 0.15s, transform 0.1s",
  },
  btnLoading: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  error: {
    background: "rgba(255,60,60,0.08)",
    border: "1px solid rgba(255,60,60,0.2)",
    borderRadius: 8,
    padding: "10px 13px",
    fontSize: 12,
    color: "rgba(255,100,100,0.9)",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  toggle: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
  },
  toggleLink: {
    color: "#00FF94",
    fontWeight: 700,
    cursor: "pointer",
    background: "none",
    border: "none",
    fontSize: 13,
    padding: 0,
    marginLeft: 4,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "28px 0",
  },
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname === "/signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/app", { replace: true });
  }, []);

  useEffect(() => {
    setMode(location.pathname === "/signup" ? "signup" : "login");
    setError("");
  }, [location.pathname]);

  function switchMode(next) {
    setError("");
    navigate(next === "signup" ? "/signup" : "/login", { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.message ||
          (typeof data === "string" ? data : null) ||
          (mode === "signup" ? "Signup failed. Please try again." : "Invalid email or password.");
        setError(msg);
        return;
      }

      const token = data?.access_token || data?.token;
      if (!token) {
        setError("Authentication succeeded but no token was returned.");
        return;
      }

      localStorage.setItem("token", token);
      navigate("/app", { replace: true });
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>AUREXIS</div>
        <div style={S.tagline}>AI-POWERED TRADE SIGNALS</div>

        <div style={S.title}>{isSignup ? "Create your account" : "Welcome back"}</div>
        <div style={S.subtitle}>
          {isSignup
            ? "Start receiving high-conviction trade setups."
            : "Sign in to access your signals and portfolio."}
        </div>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={S.fieldWrap}>
            <label style={S.label} htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              style={{
                ...S.input,
                ...(focusedField === "email" ? S.inputFocus : {}),
              }}
            />
          </div>

          <div style={S.fieldWrap}>
            <label style={S.label} htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              placeholder={isSignup ? "Create a password" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              style={{
                ...S.input,
                ...(focusedField === "password" ? S.inputFocus : {}),
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            style={{
              ...S.btn,
              ...(loading || !email.trim() || !password ? S.btnLoading : {}),
            }}
          >
            {loading ? (isSignup ? "Creating account…" : "Signing in…") : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <div style={S.divider} />

        <div style={S.toggle}>
          {isSignup ? "Already have an account?" : "Don't have an account?"}
          <button
            style={S.toggleLink}
            onClick={() => switchMode(isSignup ? "login" : "signup")}
          >
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
