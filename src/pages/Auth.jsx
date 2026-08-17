import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNativeApp } from "../lib/platform";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Custom URL scheme (registered in ios/App/App/Info.plist) that the native
// Google OAuth flow redirects back to once it completes -- lets an in-app
// browser sheet hand control back to the app instead of dead-ending in
// Safari. Must match the "aurexis://auth" entry in the backend's
// _allowed_origins (auth.py).
const NATIVE_OAUTH_ORIGIN = "aurexis://auth";

// Services ID for the web Sign in with Apple JS flow -- distinct from the
// native app's Bundle ID (com.useaurexis.app). Not a secret (same public
// role as a Google OAuth client ID), safe to embed client-side. Must be
// created in the Apple Developer portal and match the backend's
// APPLE_CLIENT_ID env var exactly -- see auth.py's _verify_apple_identity_token,
// which accepts an identity token whose aud is either this Services ID or
// the native app's Bundle ID.
const APPLE_WEB_CLIENT_ID = "com.useaurexis.web";
const APPLE_JS_SDK_URL = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

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
    <svg width="18" height="18" viewBox="0 0 17 20" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M14.09 10.63c-.02-2.12 1.73-3.14 1.81-3.19-.99-1.44-2.53-1.64-3.08-1.66-1.31-.13-2.56.77-3.23.77-.66 0-1.69-.75-2.78-.73-1.43.02-2.75.83-3.48 2.11-1.49 2.58-.38 6.4 1.06 8.5.71 1.02 1.55 2.17 2.66 2.13 1.07-.04 1.47-.69 2.76-.69 1.28 0 1.65.69 2.78.67 1.15-.02 1.87-1.04 2.57-2.07.81-1.18 1.14-2.33 1.16-2.39-.03-.01-2.21-.85-2.23-3.35z"
        fill="currentColor"
      />
      <path
        d="M11.98 4.24c.59-.71.98-1.7.87-2.69-.84.03-1.86.56-2.47 1.26-.55.62-1.02 1.63-.89 2.6.94.07 1.9-.48 2.49-1.17z"
        fill="currentColor"
      />
    </svg>
  );
}

// Counts 0 -> `to` on mount (after `startDelay`), eased out -- used for the
// native login screen's "1,200+ scanned" stat so it reads as live, not static.
function AnimatedCounter({ to, duration = 800, suffix = "", startDelay = 0 }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const timer = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(to * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, startDelay);
    return () => { clearTimeout(timer); if (raf) cancelAnimationFrame(raf); };
  }, [to, duration, startDelay]);
  return <>{value.toLocaleString()}{suffix}</>;
}

// Subtle film-grain texture (data URI so it needs no network request) --
// applied at very low opacity over the native login screen's flat black.
const _NOISE_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>";
const NOISE_BG = `url("data:image/svg+xml,${_NOISE_SVG.replace(/"/g, "'")}")`;

const NATIVE_KEYFRAMES = `
@keyframes aurexisLivePulse {
  0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0.55); opacity: 1; }
  70%  { box-shadow: 0 0 0 6px rgba(74,222,128,0); opacity: 0.7; }
  100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); opacity: 1; }
}
`;

const OAUTH_ERRORS = {
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try email instead.",
};

export default function Auth({ defaultView = "login" }) {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const isNative = isNativeApp();
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
  const [isNewUser, setIsNewUser] = useState(false);
  const [pendingFirstName, setPendingFirstName] = useState("");
  // Forgot-password flow: 0=hidden, 1=enter email, 2=enter code+new pw, 3=success
  const [forgotStep, setForgotStep] = useState(0);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPw, setForgotNewPw] = useState("");
  const [forgotConfirmPw, setForgotConfirmPw] = useState("");
  const [error, setError] = useState(() => {
    const e = new URLSearchParams(window.location.search).get("error") || "";
    return OAUTH_ERRORS[e] || "";
  });

  function switchView(v) { setView(v); setFirstName(""); setLastName(""); setEmail(""); setPassword(""); setError(""); setTermsAccepted(false); setOtpView(false); setOtpCode(""); }

  // Single place every successful auth path routes through. Two jobs:
  // (1) land on `next` (a query param) instead of the hardcoded /app when
  // one is given -- e.g. the standalone mobile checkout page bounces here
  // for a login/signup step and wants the user back there afterward; (2)
  // hand off straight to Stripe checkout for a paid plan instead of
  // landing anywhere, which previously only happened for brand-new
  // email/password signups (see the old inline block this replaced) --
  // now also happens for an existing user logging in via any method when
  // they arrived from the checkout page, since "log in then continue to
  // checkout" is exactly what that page needs.
  async function completeAuth(token, { isNewUser: isNewSignup = false } = {}) {
    const params = new URLSearchParams(window.location.search);
    const nextRaw = params.get("next") || "";
    const nextTarget = nextRaw.startsWith("/") ? nextRaw : "/app";
    const viaMobileCheckout = nextRaw.startsWith("/mobile-checkout");
    const shouldAutoCheckout = Boolean(token) && plan && plan !== "free" && (isNewSignup || viaMobileCheckout);

    if (shouldAutoCheckout) {
      const successUrl = viaMobileCheckout
        ? `${window.location.origin}/mobile-checkout?plan=${plan}&success=1`
        : `${window.location.origin}/app?payment=success`;
      const cancelUrl = viaMobileCheckout
        ? `${window.location.origin}/mobile-checkout?plan=${plan}`
        : `${window.location.origin}/`;
      try {
        const checkoutRes = await fetch(`${API}/stripe/create-checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan, success_url: successUrl, cancel_url: cancelUrl }),
        });
        const checkoutData = await checkoutRes.json();
        const url = checkoutData?.url || checkoutData?.checkout_url;
        if (url) {
          let parsed; try { parsed = new URL(String(url)); } catch { parsed = null; }
          if (parsed && ["https://checkout.stripe.com", "https://billing.stripe.com"].includes(parsed.origin)) {
            window.location.href = parsed.href;
            return;
          }
        }
        // No usable URL back (e.g. backend's 409 for an already-active
        // subscription) -- fall through to normal navigation rather than
        // stranding the user with no feedback.
      } catch {
        // Network error creating the session -- still get them logged in.
      }
    }
    navigate(nextTarget);
  }

  // Catches the redirect back from the in-app Google auth browser sheet.
  // The backend sends the native app to `aurexis://auth/...` (see
  // NATIVE_OAUTH_ORIGIN) instead of an https URL -- iOS hands that off to
  // this app via the appUrlOpen event rather than a page navigation.
  useEffect(() => {
    if (!isNative) return;
    let handle;
    CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      let parsed;
      try { parsed = new URL(url); } catch { return; }
      if (parsed.protocol !== "aurexis:") return;
      Browser.close().catch(() => {});
      const token = parsed.searchParams.get("token");
      if (token) {
        localStorage.setItem("aurexis_token", token);
        if (parsed.searchParams.get("new_user") === "1") {
          localStorage.setItem("aurexis_force_onboarding", "1");
        }
        completeAuth(token);
        return;
      }
      const err = parsed.searchParams.get("error");
      if (err) setError(OAUTH_ERRORS[err] || "Google sign-in failed. Please try email instead.");
    }).then((h) => { handle = h; });
    return () => { handle?.remove(); };
  }, [isNative, navigate]);

  function handleGoogleNativeSignIn() {
    setError("");
    Browser.open({
      url: `${API}/auth/google/redirect?plan=${plan}&origin=${encodeURIComponent(NATIVE_OAUTH_ORIGIN)}`,
    });
  }

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
      await completeAuth(token);
    } catch {
      setError("Network error — check your connection.");
    } finally { setLoading(false); }
  }

  async function handleAppleSignIn() {
    setError(""); setLoading(true);
    try {
      // clientId/redirectURI are required by the plugin's TS signature but
      // ignored by its iOS implementation -- on-device Sign in with Apple
      // uses ASAuthorizationAppleIDProvider, whose audience is the app's
      // bundle id, not a Services ID/redirect URI.
      const result = await SignInWithApple.authorize({
        clientId: "com.useaurexis.app",
        redirectURI: `${API}/auth/apple/callback`,
        scopes: "email name",
      });
      const { identityToken, givenName, familyName } = result.response;
      const res = await fetch(`${API}/auth/apple/native`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_token: identityToken,
          first_name: givenName || undefined,
          last_name: familyName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.detail || "Apple sign-in failed. Please try again."); return; }
      const token = data?.access_token;
      if (token) {
        const prevUser = localStorage.getItem("aurexis_user_email");
        if (prevUser && data?.email && prevUser !== data.email) localStorage.removeItem("aurexis_onboarding_complete");
        localStorage.setItem("aurexis_token", token);
        if (data?.email) localStorage.setItem("aurexis_user_email", data.email);
        if (data?.is_new_user) {
          localStorage.setItem("aurexis_force_onboarding", "1");
          if (data?.first_name) localStorage.setItem("aurexis_user_first_name", data.first_name);
        }
      }
      await completeAuth(token);
    } catch (err) {
      // User cancelling the native Apple sheet isn't a real error.
      const msg = String(err?.message || err || "");
      if (!/cancel/i.test(msg)) setError("Apple sign-in failed. Please try again.");
    } finally { setLoading(false); }
  }

  // Loads Apple's "Sign in with Apple JS" SDK once, web only -- the native
  // app uses the Capacitor plugin above instead and never needs this script.
  useEffect(() => {
    if (isNative) return;
    if (document.getElementById("appleid-signin-sdk")) return;
    const script = document.createElement("script");
    script.id = "appleid-signin-sdk";
    script.src = APPLE_JS_SDK_URL;
    script.async = true;
    document.head.appendChild(script);
  }, [isNative]);

  async function handleAppleSignInWeb() {
    setError(""); setLoading(true);
    try {
      if (!window.AppleID) throw new Error("Apple sign-in is still loading — try again in a moment.");
      window.AppleID.auth.init({
        clientId: APPLE_WEB_CLIENT_ID,
        scope: "name email",
        // Popup mode: Apple's authorization server form-posts the result to
        // this same-origin page inside the popup; the SDK (loaded here too,
        // since this page reloads with the popup's own JS context) detects
        // it's running inside that popup via window.opener and relays the
        // result back via postMessage, resolving signIn() below directly --
        // no server-side redirect handler needed for this flow.
        redirectURI: window.location.origin + "/login",
        usePopup: true,
      });
      const result = await window.AppleID.auth.signIn();
      const idToken = result?.authorization?.id_token;
      if (!idToken) throw new Error("Apple sign-in did not return a token.");
      const givenName = result?.user?.name?.firstName;
      const familyName = result?.user?.name?.lastName;
      const res = await fetch(`${API}/auth/apple/native`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_token: idToken,
          first_name: givenName || undefined,
          last_name: familyName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.detail || "Apple sign-in failed. Please try again."); return; }
      const token = data?.access_token;
      if (token) {
        const prevUser = localStorage.getItem("aurexis_user_email");
        if (prevUser && data?.email && prevUser !== data.email) localStorage.removeItem("aurexis_onboarding_complete");
        localStorage.setItem("aurexis_token", token);
        if (data?.email) localStorage.setItem("aurexis_user_email", data.email);
        if (data?.is_new_user) {
          localStorage.setItem("aurexis_force_onboarding", "1");
          if (data?.first_name) localStorage.setItem("aurexis_user_first_name", data.first_name);
        }
      }
      await completeAuth(token);
    } catch (err) {
      // User closing the popup isn't a real error.
      const msg = String(err?.error || err?.message || err || "");
      if (!/popup_closed_by_user|user_cancelled|cancel/i.test(msg)) setError("Apple sign-in failed. Please try again.");
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code: otpCode, is_new_user: isNewUser }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.detail || "Invalid code. Try again."); return; }
      const token = data?.access_token || data?.token;
      if (token) {
        localStorage.setItem("aurexis_token", token);
        localStorage.setItem("aurexis_user_email", otpEmail);
        if (isNewUser) {
          localStorage.setItem("aurexis_force_onboarding", "1");
          if (pendingFirstName) localStorage.setItem("aurexis_user_first_name", pendingFirstName);
        }
      }
      // completeAuth handles the new-user-on-a-paid-plan -> Stripe handoff
      // itself (isNewUser gates it same as this used to inline here).
      await completeAuth(token, { isNewUser });
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

      // Signup now always returns requires_2fa — go to OTP screen
      if (signupData?.requires_2fa) {
        setOtpEmail(signupData.email || email);
        setIsNewUser(true);
        setPendingFirstName(signupData.first_name || firstName.trim());
        setOtpView(true);
        return;
      }
      // Fallback: old-style token response
      const newToken = signupData?.access_token || signupData?.token;
      if (newToken) {
        localStorage.setItem("aurexis_force_onboarding", "1");
        localStorage.setItem("aurexis_token", newToken);
        localStorage.setItem("aurexis_user_email", email);
        if (signupData?.first_name) localStorage.setItem("aurexis_user_first_name", signupData.first_name);
      }
      await completeAuth(newToken, { isNewUser: true });
    } catch {
      setError("Network error — check your connection.");
    } finally { setLoading(false); }
  }

  const isLogin = view === "login";

  async function handleOtpResend() {
    setOtpResending(true);
    setError("");
    try {
      await fetch(`${API}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code: "" }),
      });
    } catch {}
    setOtpResending(false);
  }

  function openForgot() {
    setForgotStep(1);
    setForgotEmail(email);
    setForgotCode("");
    setForgotNewPw("");
    setForgotConfirmPw("");
    setError("");
  }

  async function handleForgotSend(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
    } catch {}
    // Always advance — no account enumeration
    setForgotStep(2);
    setLoading(false);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    if (forgotNewPw.length < 8) { setError("Password must be at least 8 characters."); setLoading(false); return; }
    if (forgotNewPw !== forgotConfirmPw) { setError("Passwords don't match."); setLoading(false); return; }
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode, new_password: forgotNewPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.detail || "Invalid or expired code. Try again."); setLoading(false); return; }
      setForgotStep(3);
    } catch {
      setError("Network error — check your connection.");
    } finally { setLoading(false); }
  }

  // Forgot-password card (all 3 steps)
  if (forgotStep > 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07090f", fontFamily: '"Inter", -apple-system, sans-serif', padding: "0 24px" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Step 1 — enter email */}
          {forgotStep === 1 && (
            <>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,rgba(0,180,80,0.20),rgba(0,180,80,0.05))", border: "1px solid rgba(0,180,80,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>🔑</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>Reset your password</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.40)", lineHeight: 1.6 }}>Enter your account email and we'll send a reset code.</div>
              </div>
              <form onSubmit={handleForgotSend} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input
                  type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  required autoFocus placeholder="Email address"
                  style={S.input}
                />
                {error ? <div style={S.errorBox}>{error}</div> : null}
                <button type="submit" style={{ ...S.submit, opacity: (loading || !forgotEmail) ? 0.5 : 1 }} disabled={loading || !forgotEmail}>
                  {loading ? "Sending…" : "Send Reset Code →"}
                </button>
              </form>
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button type="button" onClick={() => setForgotStep(0)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.28)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>← Back to login</button>
              </div>
            </>
          )}

          {/* Step 2 — enter code + new password */}
          {forgotStep === 2 && (
            <>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,rgba(0,180,80,0.20),rgba(0,180,80,0.05))", border: "1px solid rgba(0,180,80,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>📬</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>Check your email</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.40)", lineHeight: 1.6 }}>
                  If an account exists for <span style={{ color: "rgba(255,255,255,0.70)", fontWeight: 600 }}>{forgotEmail}</span>, we sent a reset code.
                </div>
              </div>
              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  value={forgotCode} onChange={e => setForgotCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code" autoFocus
                  style={{ ...S.input, textAlign: "center", fontSize: 28, fontWeight: 800, letterSpacing: "0.3em", padding: "16px" }}
                />
                <input
                  type="password" value={forgotNewPw} onChange={e => setForgotNewPw(e.target.value)}
                  placeholder="New password (min 8 characters)" autoComplete="new-password"
                  style={S.input}
                />
                <input
                  type="password" value={forgotConfirmPw} onChange={e => setForgotConfirmPw(e.target.value)}
                  placeholder="Confirm new password" autoComplete="new-password"
                  style={S.input}
                />
                {error ? <div style={S.errorBox}>{error}</div> : null}
                <button
                  type="submit"
                  style={{ ...S.submit, opacity: (loading || forgotCode.length < 6 || !forgotNewPw || !forgotConfirmPw) ? 0.5 : 1 }}
                  disabled={loading || forgotCode.length < 6 || !forgotNewPw || !forgotConfirmPw}
                >
                  {loading ? "Updating…" : "Set New Password →"}
                </button>
              </form>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                <button type="button" onClick={() => { setForgotStep(1); setError(""); }} style={{ background: "none", border: "none", color: "rgba(0,180,80,0.75)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Resend code</button>
                <button type="button" onClick={() => setForgotStep(0)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.28)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>← Back to login</button>
              </div>
            </>
          )}

          {/* Step 3 — success */}
          {forgotStep === 3 && (
            <>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,rgba(0,180,80,0.20),rgba(0,180,80,0.05))", border: "1px solid rgba(0,180,80,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>✅</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>Password updated</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.40)", lineHeight: 1.6 }}>Your password has been reset successfully. Sign in with your new password.</div>
              </div>
              <button
                type="button"
                onClick={() => { setForgotStep(0); setError(""); setPassword(""); }}
                style={S.submit}
              >
                Back to Sign In →
              </button>
            </>
          )}
        </div>
      </div>
    );
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

  /* ── Native iOS app layout ── */
  if (isMobile && isNative) {
    return (
      <div style={N.page}>
        <style>{NATIVE_KEYFRAMES}</style>
        <div style={N.noiseOverlay} aria-hidden="true" />

        <div style={N.header}>
          <div style={N.headerGlow} aria-hidden="true" />
          <div style={N.headerContent}>
            <motion.a
              href="/" style={N.logoRow}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div style={N.logoMark}>A</div>
              <span style={N.logoText}>AUREXIS</span>
            </motion.a>

            <div style={N.tagline}>
              <motion.span
                style={N.taglineLine1}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                One AI pick.
              </motion.span>
              <br />
              <motion.span
                style={N.taglineLine2}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                Every trading day.
              </motion.span>
            </div>

            <div style={N.statsRow}>
              {[
                { val: "1,200+", label: "Scanned",    counter: true,  live: false },
                { val: "1",      label: "Daily pick",  counter: false, live: true  },
                { val: "3",      label: "Signals",     counter: false, live: false },
              ].map(({ val, label, counter, live }, i) => (
                <motion.div
                  key={label}
                  style={N.statBadge}
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.26 + i * 0.06, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div style={N.statVal}>
                    {counter ? <AnimatedCounter to={1200} suffix="+" duration={800} startDelay={260} /> : val}
                  </div>
                  <div style={N.statLabel}>
                    {label}
                    {live && <span style={N.liveDot} aria-hidden="true" />}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <motion.div
          style={N.formWrap}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={N.formHeading}>{isLogin ? "Welcome back" : "Create your account"}</div>
          <div style={N.formSub}>{isLogin ? "Sign in to your account." : "Start free, upgrade anytime."}</div>

          <div style={N.socials}>
            <button type="button" style={N.appleBtn} onClick={handleAppleSignIn} disabled={loading}>
              <AppleIcon />
              <span>Sign in with Apple</span>
            </button>
            <button type="button" style={N.socialBtn} onClick={handleGoogleNativeSignIn} disabled={loading}>
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
          </div>

          <div style={N.divider}>
            <div style={N.dividerLine} />
            <span style={N.dividerLabel}>or continue with email</span>
            <div style={N.dividerLine} />
          </div>

          <form onSubmit={isLogin ? handleLogin : handleSignup} style={N.fields} noValidate>
            {!isLogin && (
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  required autoComplete="given-name" placeholder="First name"
                  style={{ ...N.input, flex: 1 }}
                />
                <input
                  type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  required autoComplete="family-name" placeholder="Last name"
                  style={{ ...N.input, flex: 1 }}
                />
              </div>
            )}
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" placeholder="Email address" style={N.input}
            />
            <div>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={isLogin ? "Password" : "Password (min 8 characters)"} style={N.input}
              />
              {isLogin && (
                <div style={{ textAlign: "right", marginTop: 10 }}>
                  <button type="button" onClick={openForgot} style={N.forgotLink}>
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {!isLogin && (
              <div style={N.planRow}>
                {PLANS.map((p) => {
                  const active = plan === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                      style={{ ...N.planPill, ...(active ? N.planPillActive : {}) }}>
                      <span style={{ ...N.planPillLabel, ...(active ? { color: "#fff" } : {}) }}>{p.label}</span>
                      <span style={{ ...N.planPillPrice, ...(active ? { color: "#4ade80" } : {}) }}>{p.price}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {!isLogin && (
              <label style={N.termsRow}>
                <input
                  type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  style={N.checkbox}
                />
                <span style={N.termsText}>
                  By creating an account you agree to our{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={N.termsLink}>Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={N.termsLink}>Privacy Policy</a>.
                </span>
              </label>
            )}

            {error ? <div style={N.errorBox}>{error}</div> : null}

            <button type="submit" style={{ ...N.submit, opacity: (!isLogin && !termsAccepted) ? 0.45 : 1 }} disabled={loading || (!isLogin && !termsAccepted)}>
              {loading
                ? (isLogin ? "Signing in…" : "Creating account…")
                : (isLogin ? "Sign In" : plan === "free" ? "Create Free Account" : "Create Account & Pay")}
            </button>
          </form>

          <div style={N.switchRow}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button type="button" style={N.switchLink} onClick={() => switchView(isLogin ? "signup" : "login")}>
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Mobile layout (web) ── */
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
            <button type="button" style={S.appleBtn} onClick={handleAppleSignInWeb} disabled={loading}>
              <AppleIcon />
              <span>Continue with Apple</span>
            </button>
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
            <div>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={isLogin ? "Password" : "Password (min 8 characters)"} style={S.input}
              />
              {isLogin && (
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <button type="button" onClick={openForgot} style={{ background: "none", border: "none", color: "rgba(0,180,80,0.70)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

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
            <button type="button" style={S.appleBtn} onClick={handleAppleSignInWeb} disabled={loading}>
              <AppleIcon />
              <span>Continue with Apple</span>
            </button>
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
            <div>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={isLogin ? "Password" : "Password (min 8 characters)"} style={S.input}
              />
              {isLogin && (
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <button type="button" onClick={openForgot} style={{ background: "none", border: "none", color: "rgba(0,180,80,0.70)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

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
  // Apple HIG for web: solid black, white glyph/wordmark -- kept visually
  // distinct from the translucent Google button, same as the native version.
  appleBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    padding: "12px 16px", borderRadius: 11,
    border: "none",
    background: "#000",
    color: "#fff",
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
    fontSize: 16, color: "rgba(255,255,255,0.90)",
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

/* ─────────────────────────────────────────────
   Native iOS app styles (Capacitor only — web
   mobile layout above is untouched)
───────────────────────────────────────────── */
const N = {
  page: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: "#07090f",
    position: "relative",
  },
  // Faint grain over the flat black -- 3% opacity, blended so it reads as
  // texture rather than visible noise.
  noiseOverlay: {
    position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
    opacity: 0.03, mixBlendMode: "overlay",
    backgroundImage: NOISE_BG,
  },

  header: {
    position: "relative", overflow: "hidden",
    background: "linear-gradient(160deg, #0a1a12 0%, #07100a 100%)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    padding: "calc(env(safe-area-inset-top, 0px) + 28px) 28px 32px",
  },
  // Soft ambient bloom behind the logo/tagline -- green (brand) blended
  // with a warm gold so the header doesn't read as plain green-on-black.
  headerGlow: {
    position: "absolute", top: -70, left: "50%", transform: "translateX(-50%)",
    width: 360, height: 260, zIndex: 0, pointerEvents: "none",
    background: "radial-gradient(ellipse at center, rgba(0,180,80,0.18) 0%, rgba(232,199,126,0.08) 45%, transparent 72%)",
    filter: "blur(6px)",
  },
  headerContent: { position: "relative", zIndex: 1 },
  logoRow: {
    display: "flex", alignItems: "center", gap: 10,
    textDecoration: "none", marginBottom: 32,
  },
  logoMark: {
    width: 34, height: 34, borderRadius: 10,
    background: "#00b450",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 17, fontWeight: 900, color: "#fff", flexShrink: 0,
  },
  logoText: {
    fontSize: 15, fontWeight: 900, letterSpacing: "0.18em",
    color: "rgba(255,255,255,0.85)",
  },
  tagline: { lineHeight: 1.18, marginBottom: 28 },
  // Lighter lead-in line, then a bolder gradient-filled line so the two
  // sentences read as a considered statement rather than one flat run.
  taglineLine1: {
    display: "inline-block", fontSize: 22, fontWeight: 600,
    letterSpacing: "-0.02em", color: "rgba(255,255,255,0.72)",
  },
  taglineLine2: {
    display: "inline-block", fontSize: 32, fontWeight: 800,
    letterSpacing: "-0.03em",
    background: "linear-gradient(90deg, #ffffff 0%, #e8c77e 100%)",
    WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  statsRow: { display: "flex", gap: 10 },
  statBadge: {
    flex: 1, display: "flex", flexDirection: "column", gap: 4,
    background: "linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 16,
    padding: "14px 12px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 16px rgba(0,0,0,0.30)",
  },
  statVal:   { fontSize: 19, fontWeight: 800, color: "#4ade80", letterSpacing: "-0.02em" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.40)", fontWeight: 600, display: "flex", alignItems: "center" },
  liveDot: {
    display: "inline-block", width: 6, height: 6, borderRadius: "50%",
    background: "#4ade80", marginLeft: 6, flexShrink: 0,
    animation: "aurexisLivePulse 2s ease-in-out infinite",
  },

  formWrap: {
    flex: 1,
    padding: "36px 28px calc(env(safe-area-inset-bottom, 0px) + 40px)",
    overflowY: "auto",
  },
  formHeading: { fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 },
  formSub:     { fontSize: 15, color: "rgba(255,255,255,0.40)", marginBottom: 32, lineHeight: 1.5 },

  socials: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 },
  socialBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
    padding: "16px 20px", borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 16, fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit", width: "100%", minHeight: 54,
    boxSizing: "border-box",
  },
  // Apple Human Interface Guidelines: solid black, white wordmark/glyph,
  // full width -- kept visually distinct from the Google button below it.
  appleBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "16px 20px", borderRadius: 16,
    border: "none",
    background: "#000",
    color: "#fff",
    fontSize: 16, fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit", width: "100%", minHeight: 54,
    boxSizing: "border-box",
  },

  divider:     { display: "flex", alignItems: "center", gap: 14, marginBottom: 28 },
  dividerLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.08)" },
  dividerLabel: { fontSize: 12, color: "rgba(255,255,255,0.28)", fontWeight: 500, whiteSpace: "nowrap" },

  fields: { display: "flex", flexDirection: "column", gap: 16 },
  input: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14, padding: "17px 18px",
    fontSize: 16, color: "rgba(255,255,255,0.95)",
    outline: "none", width: "100%", boxSizing: "border-box",
    fontFamily: "inherit", minHeight: 54,
  },

  forgotLink: {
    background: "none", border: "none", color: "rgba(0,180,80,0.80)",
    fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 600,
  },

  planRow: { display: "flex", gap: 8, marginTop: 4 },
  planPill: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    padding: "12px 4px", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer", fontFamily: "inherit", gap: 4,
  },
  planPillActive: { background: "rgba(0,180,80,0.14)", border: "1px solid rgba(0,180,80,0.40)" },
  planPillLabel:  { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.02em" },
  planPillPrice:  { fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.32)" },

  termsRow: { display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginTop: 4 },
  checkbox: { width: 18, height: 18, marginTop: 1, accentColor: "#00b450", flexShrink: 0, cursor: "pointer" },
  termsText: { fontSize: 13, color: "rgba(255,255,255,0.40)", lineHeight: 1.55 },
  termsLink: { color: "rgba(255,255,255,0.62)", textDecoration: "underline" },

  errorBox: {
    fontSize: 14, color: "#f87171",
    background: "rgba(248,113,113,0.09)",
    border: "1px solid rgba(248,113,113,0.18)",
    borderRadius: 12, padding: "13px 16px", lineHeight: 1.4,
  },

  submit: {
    padding: "17px 0", borderRadius: 16, border: "none",
    background: "linear-gradient(135deg, #16a34a, #15803d)",
    color: "#fff", fontSize: 17, fontWeight: 700,
    cursor: "pointer", letterSpacing: "0.01em",
    fontFamily: "inherit", marginTop: 6,
    boxShadow: "0 6px 28px rgba(22,163,74,0.35)", width: "100%",
    minHeight: 56, boxSizing: "border-box",
  },

  switchRow: { marginTop: 28, fontSize: 14, color: "rgba(255,255,255,0.36)", textAlign: "center" },
  switchLink: {
    background: "none", border: "none", color: "#4ade80",
    fontWeight: 700, cursor: "pointer", fontSize: 14,
    fontFamily: "inherit", padding: 0, marginLeft: 6,
  },
};
