import React, { useState, useRef } from "react";
import emailjs from "@emailjs/browser";

// ── EmailJS config — fill these in ───────────────────────────────────────────
const EMAILJS_SERVICE_ID  = "service_eu25jjf";
const EMAILJS_TEMPLATE_ID = "template_rh2z2ya";
const EMAILJS_PUBLIC_KEY  = "sqJqw5fZ52fgPM038";

const GREEN = "#00ff94";

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1.25rem",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  logo: {
    fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
    fontWeight: 800,
    letterSpacing: "0.18em",
    color: GREEN,
    marginBottom: "3.5rem",
    textTransform: "uppercase",
    textShadow: `0 0 32px ${GREEN}55`,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0,
  },
  headline: {
    fontSize: "clamp(2rem, 6vw, 3rem)",
    fontWeight: 800,
    color: "#fff",
    textAlign: "center",
    lineHeight: 1.15,
    margin: 0,
    marginBottom: "1rem",
    letterSpacing: "-0.02em",
  },
  subheadline: {
    fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)",
    color: "#888",
    textAlign: "center",
    lineHeight: 1.65,
    margin: 0,
    marginBottom: "2.5rem",
    maxWidth: 400,
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  input: {
    width: "100%",
    padding: "0.875rem 1.125rem",
    borderRadius: "0.625rem",
    border: "1px solid #222",
    backgroundColor: "#0a0a0a",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  button: {
    width: "100%",
    padding: "0.9rem 1.25rem",
    borderRadius: "0.625rem",
    border: "none",
    backgroundColor: GREEN,
    color: "#000",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.03em",
    transition: "opacity 0.2s, transform 0.15s",
    marginTop: "0.25rem",
  },
  error: {
    color: "#ff5f5f",
    fontSize: "0.85rem",
    textAlign: "center",
    marginTop: "0.25rem",
  },
  success: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    textAlign: "center",
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    border: `2px solid ${GREEN}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "0.5rem",
  },
  successHeadline: {
    fontSize: "clamp(1.5rem, 4vw, 2rem)",
    fontWeight: 700,
    color: "#fff",
    margin: 0,
  },
  successSub: {
    color: "#888",
    fontSize: "1rem",
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 340,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: GREEN,
    borderRadius: 2,
    margin: "0 auto 2rem",
    opacity: 0.6,
  },
};

export default function Waitlist() {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState("");
  const inputRef = useRef(null);

  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      inputRef.current?.focus();
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        { user_email: email, to_email: "aurexis.app@gmail.com" },
        EMAILJS_PUBLIC_KEY
      );
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.logo}>AUREXIS</div>

      <div style={styles.card}>
        {submitted ? (
          <div style={styles.success}>
            <div style={styles.checkCircle}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={styles.successHeadline}>You're on the list.</h2>
            <p style={styles.successSub}>
              We'll reach out when early access opens. Keep an eye on your inbox.
            </p>
          </div>
        ) : (
          <>
            <h1 style={styles.headline}>Get Early Access</h1>
            <div style={styles.divider} />
            <p style={styles.subheadline}>
              AI-powered stock signals that surface high-conviction trades
              before the crowd catches on. Be first in line.
            </p>
            <form style={styles.form} onSubmit={handleSubmit} noValidate>
              <input
                ref={inputRef}
                style={styles.input}
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onFocus={(e) => { e.target.style.borderColor = GREEN; }}
                onBlur={(e)  => { e.target.style.borderColor = "#222"; }}
                disabled={loading}
                autoComplete="email"
              />
              {error && <p style={styles.error}>{error}</p>}
              <button
                style={styles.button}
                type="submit"
                disabled={loading}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseDown={(e)  => { e.currentTarget.style.transform = "scale(0.98)"; }}
                onMouseUp={(e)    => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                {loading ? "Submitting…" : "Join the Waitlist"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
