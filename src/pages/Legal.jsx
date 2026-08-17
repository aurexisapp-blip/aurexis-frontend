import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const T = {
  bg: "#000",
  bg2: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  text: "rgba(255,255,255,0.90)",
  textSec: "rgba(255,255,255,0.65)",
  textMuted: "rgba(255,255,255,0.42)",
  textGhost: "rgba(255,255,255,0.22)",
  green: "rgba(34,197,94,0.80)",
  greenBg: "rgba(34,197,94,0.07)",
  greenBorder: "rgba(34,197,94,0.22)",
  amber: "rgba(253,230,138,0.85)",
  amberBg: "rgba(245,158,11,0.07)",
  amberBorder: "rgba(245,158,11,0.25)",
};

const SECTIONS = [
  {
    group: "Support",
    items: [
      { id: "getting-started",   label: "Getting Started" },
      { id: "ai-pick",           label: "Understanding the AI Pick" },
      { id: "plans-billing",     label: "Plans & Billing" },
      { id: "troubleshooting",   label: "Troubleshooting" },
    ],
  },
  {
    group: "Legal",
    items: [
      { id: "terms",      label: "Terms of Service" },
      { id: "privacy",    label: "Privacy Policy" },
      { id: "disclaimer", label: "Financial Disclaimer" },
      { id: "refund",     label: "Refund Policy" },
      { id: "cookies",    label: "Cookie Policy" },
    ],
  },
];

function H2({ children }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 10px", letterSpacing: "-0.01em" }}>
      {children}
    </h2>
  );
}
function P({ children }) {
  return (
    <p style={{ fontSize: 14, color: T.textSec, lineHeight: 1.80, margin: "0 0 14px" }}>
      {children}
    </p>
  );
}
function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 20, margin: "0 0 14px" }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 14, color: T.textSec, lineHeight: 1.75, marginBottom: 5 }}>{item}</li>
      ))}
    </ul>
  );
}
function Callout({ variant = "info", children }) {
  const c = variant === "warning"
    ? { bg: T.amberBg, border: T.amberBorder, color: T.amber }
    : { bg: T.greenBg, border: T.greenBorder, color: "rgba(134,239,172,0.85)" };
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 9,
      padding: "13px 16px", marginBottom: 20, fontSize: 13, color: c.color, lineHeight: 1.70,
    }}>
      {children}
    </div>
  );
}
function Divider() {
  return <div style={{ height: 1, background: "linear-gradient(90deg,rgba(255,255,255,0.07),transparent)", margin: "32px 0" }} />;
}
function SectionBlock({ id, title, label, children }) {
  return (
    <div id={id} style={{ scrollMarginTop: 80, marginBottom: 52 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.green, marginBottom: 8 }}>
        {label}
      </div>
      <h1 style={{ fontSize: "clamp(22px,3.5vw,32px)", fontWeight: 900, letterSpacing: "-0.02em", color: T.text, margin: "0 0 8px" }}>
        {title}
      </h1>
      <div style={{ height: 1, background: "linear-gradient(90deg,rgba(255,255,255,0.08),transparent)", marginBottom: 28 }} />
      {children}
    </div>
  );
}

export default function Legal() {
  const navigate = useNavigate();
  const [active, setActive] = useState("getting-started");
  const observerRef = useRef(null);

  // Highlight nav item as user scrolls
  useEffect(() => {
    const ids = SECTIONS.flatMap(g => g.items.map(i => i.id));
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          setActive(top.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  // Hash on load -- retries until the target element actually exists in the
  // DOM, since a fixed short delay was landing short (e.g. #privacy opening
  // to Terms of Service instead) when web fonts/layout were still settling.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        setActive(hash);
      } else if (attempts < 20) {
        attempts += 1;
        setTimeout(tryScroll, 100);
      }
    };
    setTimeout(tryScroll, 50);
  }, []);

  return (
    <div style={{ fontFamily: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', background: T.bg, color: T.text, minHeight: "100vh", WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        @media (max-width: 720px) {
          .legalLayout { flex-direction: column !important; }
          .legalSidebar {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            padding: 20px 0 24px !important;
            border-bottom: 1px solid ${T.border};
          }
          .legalContent {
            padding: 28px 4px 80px !important;
            border-left: none !important;
          }
        }
      `}</style>

      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}>
        <button
          onClick={() => navigate("/")}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 13, padding: "6px 0", fontFamily: "inherit" }}
        >
          <span style={{ fontSize: 16 }}>←</span> Back to Aurexis
        </button>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em", color: T.textGhost }}>AUREXIS</div>
      </div>

      <div className="legalLayout" style={{ display: "flex", maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        {/* Sidebar */}
        <aside className="legalSidebar" style={{
          width: 210, flexShrink: 0, position: "sticky", top: 55, height: "calc(100vh - 55px)",
          overflowY: "auto", padding: "36px 0 60px", display: "flex", flexDirection: "column", gap: 28,
          scrollbarWidth: "none",
        }}>
          {SECTIONS.map(group => (
            <div key={group.group}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.textGhost, padding: "0 14px 8px" }}>
                {group.group}
              </div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 13, fontWeight: active === item.id ? 600 : 400,
                    background: active === item.id ? "rgba(34,197,94,0.09)" : "transparent",
                    color: active === item.id ? "rgba(134,239,172,0.90)" : T.textMuted,
                    borderLeft: active === item.id ? "2px solid rgba(34,197,94,0.55)" : "2px solid transparent",
                    transition: "all 0.14s",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="legalContent" style={{ flex: 1, minWidth: 0, padding: "44px 0 100px 48px", borderLeft: `1px solid ${T.border}` }}>

          {/* ── GETTING STARTED ─────────────────────────────────────── */}
          <SectionBlock id="getting-started" title="Getting Started" label="Support">
            <H2>What is Aurexis?</H2>
            <P>
              Aurexis is an AI-powered stock signal service. Every night, the engine scans 1,200+ stocks using
              momentum, volume anomalies, options flow, short interest, and news sentiment. It surfaces the
              single highest-conviction setup with a full trade plan — entry, stop loss, and price targets.
            </P>
            <H2>Who is it for?</H2>
            <P>
              Aurexis is built for active traders who want a data-driven edge — a second opinion before they pull
              the trigger, not a robot to trade for them. You still execute your own trades through your own broker.
            </P>
            <H2>How do I get my first pick?</H2>
            <UL items={[
              "Sign up and verify your email",
              "Navigate to the Dashboard tab",
              "The Best Pick card loads automatically — it refreshes each morning before market open",
              "Free users see the ticker and conviction level. Upgrade to Starter to unlock entry, stop, and target levels",
            ]} />
            <H2>When does the pick update?</H2>
            <P>
              The scanner runs every evening after market close and the pick is ready before 9:30 AM ET on
              trading days. On weekends and market holidays, the card shows the last session's result or a
              NO_TRADE status if no qualifying setup was found.
            </P>
            <Callout variant="info">
              If the pick card shows "Loading…" for more than 30 seconds, try a hard refresh (Cmd+Shift+R on
              Mac / Ctrl+Shift+R on Windows). If it persists, email us at aurexis.app@gmail.com.
            </Callout>
          </SectionBlock>

          <Divider />

          {/* ── AI PICK ─────────────────────────────────────────────── */}
          <SectionBlock id="ai-pick" title="Understanding the AI Pick" label="Support">
            <H2>What is the conviction score?</H2>
            <P>
              The conviction score (0–100) is a composite of all signal weights the AI assigned to the pick.
              A score above 80 means multiple high-weight signals converged on the same setup. Scores 60–79
              are lower-confidence — tradeable, but with tighter sizing. Below 60 typically produces a NO_TRADE.
            </P>
            <H2>What are entry, stop, and target levels?</H2>
            <UL items={[
              "Entry — the price level the AI calculated as the optimal entry based on chart structure",
              "Stop Loss — the price where the trade thesis is invalidated; your max loss if hit",
              "Target 1 — the first Fibonacci extension — a conservative take-profit level",
              "Target 2 / 3 — further extensions for runners if the move continues",
            ]} />
            <H2>What is the trade decision field?</H2>
            <P>
              HIGH_CONVICTION means the AI's composite score crossed the threshold and all key signals aligned.
              LOW_CONVICTION means a setup exists but with weaker confirmation — treat it as a watch, not a
              full-size entry. NO_TRADE means no qualifying setup was found for the day.
            </P>
            <H2>What are edge signals?</H2>
            <P>
              Edge signals are the specific catalysts the AI identified: unusual options volume, short squeeze
              pressure, earnings momentum, sector rotation, news sentiment spikes, or technical breakout patterns.
              They explain WHY the pick was selected.
            </P>
            <H2>Is this real-money advice?</H2>
            <Callout variant="warning">
              No. Aurexis is a research and analysis tool, not a brokerage or investment advisor. All picks are
              for educational and informational purposes only. You are solely responsible for your trading decisions.
            </Callout>
          </SectionBlock>

          <Divider />

          {/* ── PLANS & BILLING ─────────────────────────────────────── */}
          <SectionBlock id="plans-billing" title="Plans & Billing" label="Support">
            <H2>What's included in each plan?</H2>
            <UL items={[
              "Free — daily ticker + conviction level, 3 AI analyses per day, limited top movers",
              "Starter ($9/mo) — full pick (entry, stop, targets, R/R ratio, edge signals), unlimited analysis, trade journal, watchlist, performance tracking",
              "Pro ($29/mo) — everything in Starter, plus multi-ticker screener and portfolio tracker",
              "Elite ($49/mo) — everything in Pro, plus options flow, insider activity, backtesting, and priority support",
            ]} />
            <H2>How do I upgrade?</H2>
            <P>
              Go to Settings → Plan & Billing → Upgrade, or click any locked feature and hit the upgrade
              prompt. You'll be taken to a Stripe checkout page — all payments are handled securely by Stripe.
            </P>
            <H2>Can I cancel anytime?</H2>
            <P>
              Yes. Go to Settings → Plan & Billing → Cancel Plan. Cancellation takes effect at the end of
              your current billing period — you keep full access until then and are never charged again.
            </P>
            <H2>Do you offer a refund?</H2>
            <Callout variant="info">
              Yes — new subscribers get a 7-day money-back guarantee, no questions asked. Email
              aurexis.app@gmail.com with your account email within 7 days of your first payment.
              After 7 days, all sales are final.
            </Callout>
            <H2>My plan didn't update after paying</H2>
            <P>
              After a Stripe checkout, the app automatically refreshes your plan within a few seconds. If it
              hasn't updated after 30 seconds, do a hard refresh (Cmd+Shift+R). If the plan still shows Free,
              email us at aurexis.app@gmail.com with your account email and we'll fix it immediately.
            </P>
          </SectionBlock>

          <Divider />

          {/* ── TROUBLESHOOTING ─────────────────────────────────────── */}
          <SectionBlock id="troubleshooting" title="Troubleshooting" label="Support">
            <H2>The AI pick card is stuck loading</H2>
            <P>
              The scanner sometimes takes a moment to respond. Wait up to 60 seconds, then try a hard refresh
              (Cmd+Shift+R / Ctrl+Shift+R). If it still fails, the scanner may be running — check back in 5 minutes.
            </P>
            <H2>The screener shows "unavailable" for all tickers</H2>
            <P>
              This typically means your session expired. Sign out from Settings → Account Actions → Sign out,
              then log back in. If the issue persists, email aurexis.app@gmail.com.
            </P>
            <H2>My AI analysis limit didn't reset</H2>
            <P>
              The daily limit resets at midnight in your local time. If you hit the limit late at night, it
              resets in the morning. Free users get 3 analyses per day; Starter and above get unlimited.
            </P>
            <H2>The pick log isn't showing entry/stop/target</H2>
            <P>
              Entry, stop, and target data is only available on Starter plan and above. If you're on Starter
              and still don't see it, try refreshing the page after the pick loads fully (wait for the
              conviction score to appear).
            </P>
            <H2>I can't log in — it says "detail not found"</H2>
            <P>
              This usually means the email wasn't verified or the account doesn't exist yet. Try the
              "Forgot password" flow, or sign up with the same email. If you used Google sign-in, use the
              "Continue with Google" button instead of the password form.
            </P>
            <H2>On mobile it says "open on your computer"</H2>
            <P>
              Aurexis is a desktop trading dashboard — the full experience requires a laptop or desktop.
              The mobile app is coming soon. Visit useaurexis.com on your desktop to get started.
            </P>
            <H2>Something else is broken</H2>
            <P>
              Email <a href="mailto:aurexis.app@gmail.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>aurexis.app@gmail.com</a> with
              the ticker, date, what you expected to see, and a screenshot. We typically respond within 24 hours.
            </P>
          </SectionBlock>

          <Divider />

          {/* ── TERMS ───────────────────────────────────────────────── */}
          <SectionBlock id="terms" title="Terms of Service" label="Legal">
            <div style={{ fontSize: 12, color: T.textGhost, marginBottom: 24 }}>Last updated: April 29, 2026</div>
            <Callout variant="warning">
              By using Aurexis you agree to these terms. If you do not agree, do not use the Service.
            </Callout>
            <H2>1. Acceptance of Terms</H2>
            <P>By accessing or using Aurexis ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</P>
            <H2>2. Description of Service</H2>
            <P>Aurexis provides AI-generated stock trade ideas for educational and informational purposes. The Service scans publicly available market data to identify potential trading setups. Aurexis is <strong style={{ color: T.textSec }}>NOT</strong> a registered investment advisor, broker-dealer, or financial planner.</P>
            <H2>3. No Investment Advice</H2>
            <P>The Service does <strong style={{ color: T.textSec }}>NOT</strong> provide investment advice, financial advice, tax advice, or legal advice. All content is for educational purposes only. You are solely responsible for your own investment decisions.</P>
            <H2>4. Account Registration</H2>
            <P>You must be at least 18 years old or have legal capacity to use paid features. You agree to provide accurate information and keep your account credentials secure.</P>
            <H2>5. Subscription and Payment</H2>
            <UL items={[
              "Subscriptions are billed monthly via Stripe",
              "You may cancel anytime; cancellation takes effect at the end of the current billing period",
              "Refunds are governed by our Refund Policy below",
            ]} />
            <H2>6. Acceptable Use</H2>
            <P>You may not: redistribute Aurexis content, scrape the Service, reverse engineer the system, or use the Service to harm others.</P>
            <H2>7. Disclaimer of Warranties</H2>
            <Callout variant="warning">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. PAST PERFORMANCE DOES NOT GUARANTEE FUTURE RESULTS. ALL TRADING INVOLVES RISK OF LOSS.
            </Callout>
            <H2>8. Limitation of Liability</H2>
            <P>Aurexis is not liable for any losses incurred from following or not following its trade ideas. Maximum liability is limited to the amount paid by you in the prior 30 days.</P>
            <H2>9. Termination</H2>
            <P>We may terminate accounts that violate these terms. You may terminate by canceling your subscription.</P>
            <H2>10. Changes to Terms</H2>
            <P>We may update these terms at any time. Continued use of the Service constitutes acceptance of the updated terms.</P>
            <H2>11. Governing Law & Contact</H2>
            <P>For legal notices, support requests, or other inquiries, contact us at <a href="mailto:aurexis.app@gmail.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>aurexis.app@gmail.com</a>. These Terms are governed by the laws of the Commonwealth of Massachusetts.</P>
          </SectionBlock>

          <Divider />

          {/* ── PRIVACY ─────────────────────────────────────────────── */}
          <SectionBlock id="privacy" title="Privacy Policy" label="Legal">
            <div style={{ fontSize: 12, color: T.textGhost, marginBottom: 24 }}>Last updated: April 29, 2026</div>
            <H2>1. Information We Collect</H2>
            <UL items={[
              "Account info: email, name, password (hashed)",
              "Payment info: handled entirely by Stripe — we never see your card numbers",
              "Usage data: which features you use, when you log in",
              "Optional: phone number for SMS alerts",
            ]} />
            <H2>2. How We Use Information</H2>
            <UL items={["Provide the Service", "Process payments", "Send pick alerts (if opted in)", "Improve the system", "Respond to support requests"]} />
            <H2>3. We Do NOT Sell Your Data</H2>
            <Callout variant="info">We do not sell your personal information to third parties. Period.</Callout>
            <H2>4. Third-Party Services</H2>
            <UL items={["Stripe — payments", "SendGrid — email delivery", "Twilio — SMS alerts (optional)", "Cloudflare — security and DDoS protection", "Vercel — frontend hosting", "Railway — backend hosting"]} />
            <H2>5. Data Security</H2>
            <P>We use industry-standard encryption for data in transit and at rest. We will notify you promptly in the event of a data breach that affects your information.</P>
            <H2>6. Your Rights</H2>
            <UL items={["Request a copy of your data", "Delete your account and all associated data (Settings → Delete account)", "Opt out of marketing emails at any time", "Update your information in account settings"]} />
            <H2>7. Children's Privacy</H2>
            <P>The Service is not intended for users under 18. We do not knowingly collect information from minors.</P>
            <H2>8. Contact</H2>
            <P>For privacy questions or to exercise your data rights, contact <a href="mailto:aurexis.app@gmail.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>aurexis.app@gmail.com</a>.</P>
          </SectionBlock>

          <Divider />

          {/* ── DISCLAIMER ──────────────────────────────────────────── */}
          <SectionBlock id="disclaimer" title="Financial Disclaimer" label="Legal">
            <div style={{ fontSize: 12, color: T.textGhost, marginBottom: 24 }}>Last updated: April 29, 2026</div>
            <Callout variant="warning">IMPORTANT: PLEASE READ CAREFULLY BEFORE USING AUREXIS</Callout>
            <H2>Not Investment Advice</H2>
            <P>Aurexis provides AI-generated trade ideas for educational purposes <strong style={{ color: T.textSec }}>ONLY</strong>. Nothing on this Service constitutes investment advice, financial advice, trading advice, or any other sort of advice. We are not registered as an investment advisor with the SEC or any state regulator.</P>
            <H2>Do Your Own Research</H2>
            <P>You should independently verify any information before making investment decisions. Past performance is not indicative of future results.</P>
            <H2>Risk of Loss</H2>
            <Callout variant="warning">All trading and investing involves substantial risk of loss. You can lose more money than you invest, especially with options or margin trading. Only trade with money you can afford to lose.</Callout>
            <H2>No Guaranteed Returns</H2>
            <P>Aurexis makes no representations about future returns. The system's historical performance does not guarantee future performance. Markets are unpredictable.</P>
            <H2>You Are Responsible</H2>
            <P>You are solely responsible for:</P>
            <UL items={["Your investment decisions", "Verifying trade ideas independently", "Managing your own risk", "Setting your own position sizes", "Determining tax implications"]} />
            <H2>Not a Fiduciary</H2>
            <P>Aurexis has no fiduciary duty to you. We are a publisher of trade ideas, not a financial advisor. Consult a licensed financial advisor before making any investment decision.</P>
            <Callout variant="info">By using Aurexis, you acknowledge that you have read, understood, and agreed to this disclaimer.</Callout>
          </SectionBlock>

          <Divider />

          {/* ── REFUND ──────────────────────────────────────────────── */}
          <SectionBlock id="refund" title="Refund Policy" label="Legal">
            <div style={{ fontSize: 12, color: T.textGhost, marginBottom: 24 }}>Last updated: April 29, 2026</div>
            <Callout variant="info">New subscribers are covered by a 7-day money-back guarantee — no questions asked.</Callout>
            <H2>7-Day Money-Back Guarantee</H2>
            <P>New subscribers may request a full refund within 7 days of their first payment for any reason.</P>
            <H2>How to Request a Refund</H2>
            <P>Email <a href="mailto:aurexis.app@gmail.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>aurexis.app@gmail.com</a> with your account email and date of purchase. A reason is optional but helpful.</P>
            <H2>Processing Time</H2>
            <P>Refunds are processed within 5–10 business days back to the original payment method.</P>
            <H2>After 7 Days</H2>
            <P>After the 7-day window, all sales are final. However, you can cancel anytime to prevent future charges. Cancellation takes effect at the end of your current billing period — you retain access until then.</P>
            <H2>Exceptions</H2>
            <UL items={["Refunds are not available for accounts terminated for terms of service violations", "Refunds are not available for the same user requesting multiple refunds across multiple accounts"]} />
          </SectionBlock>

          <Divider />

          {/* ── COOKIES ─────────────────────────────────────────────── */}
          <SectionBlock id="cookies" title="Cookie Policy" label="Legal">
            <div style={{ fontSize: 12, color: T.textGhost, marginBottom: 24 }}>Last updated: April 29, 2026</div>
            <H2>What Are Cookies</H2>
            <P>Cookies are small text files stored on your device that help websites remember information about your visit. We keep our cookie usage minimal.</P>
            <H2>Cookies We Use</H2>
            <P><strong style={{ color: T.textSec }}>Essential (required):</strong></P>
            <UL items={["Authentication — keeps you logged in securely", "Session — maintains your active session"]} />
            <P><strong style={{ color: T.textSec }}>Functional:</strong></P>
            <UL items={["Preferences — remembers your settings (theme, tab state)", "Tab state — keeps you on the right page between visits"]} />
            <P><strong style={{ color: T.textSec }}>Analytics:</strong></P>
            <UL items={["Minimal privacy-respecting analytics (no personal information tracked, no cross-site tracking)"]} />
            <H2>Cookies We Do NOT Use</H2>
            <Callout variant="info">We do not use advertising cookies. We do not sell your data to advertisers. We do not track you across other websites.</Callout>
            <H2>Managing Cookies</H2>
            <P>You can disable cookies in your browser settings. Note that disabling essential cookies will prevent login and other core features from working properly.</P>
            <H2>Contact</H2>
            <P>Questions? Contact us at <a href="mailto:aurexis.app@gmail.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>aurexis.app@gmail.com</a>.</P>
          </SectionBlock>

        </main>
      </div>
    </div>
  );
}
