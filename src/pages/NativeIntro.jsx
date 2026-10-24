import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NATIVE_FONT, NATIVE_SPRING } from "../lib/nativeTheme";
import { tapHaptic, selectionHaptic } from "../lib/haptics";

// First-open guided reveal for the iOS app, shown once per device before
// sign-in. Illustrations are abstract on purpose: no tickers, prices or
// statistics appear here, because none of them would be real yet.
export const NATIVE_INTRO_KEY = "aurexis_intro_seen";

function Rings({ size = 168, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 168 168" aria-hidden="true">
      <circle cx="84" cy="84" r="78" fill="none" stroke={color} strokeOpacity="0.16" strokeWidth="2" />
      <circle cx="84" cy="84" r="58" fill="none" stroke={color} strokeOpacity="0.34" strokeWidth="5" />
      <circle cx="84" cy="84" r="38" fill="none" stroke={color} strokeOpacity="0.62" strokeWidth="7" />
      <circle cx="84" cy="84" r="15" fill={color} />
    </svg>
  );
}

function CardStack({ P }) {
  const bar = (w, o = 1) => <div style={{ height: 10, width: w, borderRadius: 5, background: P.text, opacity: 0.12 * o }} />;
  return (
    <div style={{ position: "relative", width: 270, height: 290 }}>
      <div style={{ position: "absolute", left: 34, right: 34, top: 0, height: 210, borderRadius: 26, background: P.surface, opacity: 0.45 }} />
      <div style={{ position: "absolute", left: 16, right: 16, top: 20, height: 210, borderRadius: 26, background: P.raised, opacity: 0.7 }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 44, height: 226, borderRadius: 26, background: P.surface, border: `1px solid ${P.accent}44`, boxShadow: P.shadow, boxSizing: "border-box", padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: P.accent }}>Tonight's pick</div>
        <div style={{ height: 34, width: 130, borderRadius: 10, background: P.text, opacity: 0.16 }} />
        {bar(170)}
        <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>{bar(64, 0.8)}{bar(64, 0.8)}{bar(64, 0.8)}</div>
      </div>
    </div>
  );
}

function LevelsArt({ P }) {
  return (
    <div style={{ position: "relative", width: 300, height: 250, borderRadius: 26, background: P.surface, boxShadow: P.shadow, overflow: "hidden" }}>
      <svg width="300" height="250" viewBox="0 0 300 250" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <line x1="0" y1="60" x2="300" y2="60" stroke={P.accent} strokeWidth="1.5" strokeDasharray="5 6" />
        <line x1="0" y1="145" x2="300" y2="145" stroke={P.text} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="5 6" />
        <line x1="0" y1="192" x2="300" y2="192" stroke={P.danger} strokeWidth="1.5" strokeDasharray="5 6" />
        <path d="M0 206 C 30 198, 48 214, 74 190 S 118 170, 140 176 S 178 154, 196 145" fill="none" stroke={P.text} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M196 145 C 222 128, 246 100, 288 64" fill="none" stroke={P.accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 7" />
        <circle cx="196" cy="145" r="6" fill={P.text} />
      </svg>
      <div style={{ position: "absolute", left: 16, top: 34, fontSize: 12, fontWeight: 600, color: P.accent }}>Target</div>
      <div style={{ position: "absolute", left: 16, top: 119, fontSize: 12, fontWeight: 600, color: P.text }}>Entry</div>
      <div style={{ position: "absolute", left: 16, top: 202, fontSize: 12, fontWeight: 600, color: P.danger }}>Stop</div>
    </div>
  );
}

function PracticeArt({ P }) {
  const rows = [
    { t: "Paper trading only", s: "No deposits. No broker connection.", d: "M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z M9 12l2 2 4-4" },
    { t: "Free to start", s: "Upgrade later on the website if you want more.", d: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l3 2" },
    { t: "Transparent by design", s: "Every pick's result stays in your log.", d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z" },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.t} style={{ display: "flex", gap: 16, alignItems: "center", padding: "18px 20px", borderRadius: 20, background: P.surface, border: `1px solid ${P.hairline}` }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={P.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={r.d} /></svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: P.text }}>{r.t}</div>
            <div style={{ fontSize: 15, color: P.textSec }}>{r.s}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  { key: "welcome" },
  { key: "pick", title: "One pick.\nEvery night.", body: "While the market sleeps, Aurexis reviews the field and surfaces a single setup worth your attention — or tells you plainly when there isn't one." },
  { key: "levels", title: "Every level,\nexplained.", body: "Entry, stop and target arrive with the reasoning behind them and a conviction label you can read at a glance. Nothing hidden." },
  { key: "practice", title: "Practice\nwithout risk.", body: "Build judgment on paper first. Aurexis is research, not financial advice." },
];

export default function NativeIntro({ P, onDone }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const go = (n) => { selectionHaptic(); setDir(n > step ? 1 : -1); setStep(n); };
  const finish = (view) => { tapHaptic("medium"); onDone(view); };

  const primary = { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 54, borderRadius: 16, border: "none", fontFamily: NATIVE_FONT, fontSize: 17, fontWeight: 600, cursor: "pointer" };

  return (
    <div style={{ position: "fixed", inset: 0, background: step === 0 ? `radial-gradient(120% 70% at 50% 34%, ${P.accent}22 0%, ${P.bg} 62%)` : P.bg, color: P.text, fontFamily: NATIVE_FONT, display: "flex", flexDirection: "column", padding: "env(safe-area-inset-top, 0px) 28px calc(env(safe-area-inset-bottom, 0px) + 24px)", boxSizing: "border-box", transition: "background 0.5s ease" }}>
      <div style={{ height: 52, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        {step > 0 && !isLast && (
          <button type="button" onClick={() => finish("signup")} style={{ background: "none", border: "none", color: P.textSec, fontFamily: NATIVE_FONT, fontSize: 15, fontWeight: 500, padding: "10px 4px", cursor: "pointer" }}>Skip</button>
        )}
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={s.key}
          custom={dir}
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={NATIVE_SPRING}
          style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          {s.key === "welcome" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36 }}>
              <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                <Rings color={P.accent} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...NATIVE_SPRING, delay: 0.15 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>Aurexis</div>
                <div style={{ fontSize: 17, lineHeight: 1.45, color: P.textSec, maxWidth: 270 }}>A calmer way to find your next trade.</div>
              </motion.div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
                {s.key === "pick" && <CardStack P={P} />}
                {s.key === "levels" && <LevelsArt P={P} />}
                {s.key === "practice" && <PracticeArt P={P} />}
              </div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...NATIVE_SPRING, delay: 0.08 }} style={{ display: "flex", flexDirection: "column", gap: 14, margin: "28px 0 32px" }}>
                <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.12, whiteSpace: "pre-line" }}>{s.title}</div>
                <div style={{ fontSize: 17, lineHeight: 1.5, color: P.textSec }}>{s.body}</div>
              </motion.div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }} aria-hidden="true">
        {STEPS.map((x, i) => (
          <motion.div key={x.key} animate={{ width: i === step ? 20 : 6, opacity: i === step ? 1 : 0.25 }} transition={NATIVE_SPRING} style={{ height: 6, borderRadius: 3, background: P.text }} />
        ))}
      </div>

      {isLast ? (
        <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => finish("signup")} style={{ ...primary, background: P.accent, color: P.accentInk }}>Create your account</motion.button>
      ) : (
        <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => go(step + 1)} style={{ ...primary, background: P.primaryBg, color: P.primaryInk }}>{step === 0 ? "Get started" : "Continue"}</motion.button>
      )}
      <button type="button" onClick={() => finish("login")} style={{ marginTop: 8, height: 44, background: "none", border: "none", color: P.textSec, fontFamily: NATIVE_FONT, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
        I already have an account
      </button>
    </div>
  );
}
