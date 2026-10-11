import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./ScrollFilm.css";
import { COMPANY, FAQ, OPERATED_BY, PLANS } from "../lib/siteFacts";

// The landing page as a short "film": five scenes pinned to the viewport and
// scrubbed by the scroll position (hero -> market scan -> trade plan -> screen
// recording -> scores), then a static ending (how it works, pricing, FAQ).
// Respects prefers-reduced-motion by showing every scene at its final frame.

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500;600&display=swap";

// Phone browsers get the "open this on your computer" screen instead of the
// auth pages from here (see /open-on-desktop in main.jsx); /login and /signup
// themselves stay reachable for the iOS app's Safari hand-off.
function goToAuth(path) {
  let preview = false;
  try { preview = sessionStorage.getItem("aurexis_mobilepreview") === "1"; } catch {}
  window.location.href = window.innerWidth < 768 && !preview ? "/open-on-desktop" : path;
}

const TICKERS = "AAPL MSFT NVDA AMZN META GOOGL TSLA AMD AVGO NFLX JPM V MA COST PEP KO XOM CVX COP SLB PFE MRK LLY ABBV UNH BE UMC SMCI EEM SPY QQQ IWM PLTR SNOW CRWD NET SHOP PYPL COIN HOOD SOFI F GM RIVN NIO TSM ASML INTC QCOM TXN MU ADI ON MRVL ARM DELL IBM ORCL CRM ADBE NOW INTU UBER ABNB DASH RBLX EA DIS WBD CMCSA T VZ TMUS BA LMT RTX GE CAT DE HON MMM UPS FDX DAL UAL CCL RCL MAR HLT WMT TGT HD LOW NKE SBUX MCD CMG YUM LULU DECK ELF CELH MNST KDP GIS HSY MDLZ PG CL KMB EL ULTA BBY ETSY EBAY W CHWY PINS SNAP RDDT DDOG MDB ZS PANW FTNT OKTA TEAM HUBS TTD APP DUOL CVNA AFRM UPST NU MELI SE BIDU JD PDD LI XPEV".split(" ");
const N_TILES = 168;
const WIN_TILE = Math.floor(N_TILES * 0.46);
const TILES = Array.from({ length: N_TILES }, (_, i) => ({
  name: i === WIN_TILE ? "AS" : TICKERS[(i * 7 + 3) % TICKERS.length],
  // deterministic pseudo-random point at which each tile drops out of the scan
  thr: i === WIN_TILE ? 2 : 0.04 + (Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.86,
}));
const FILTERS = ["MOMENTUM", "TREND", "VOLATILITY", "LIQUIDITY", "RISK"];
const SCAN_LINES = ["The AI screens the market for one clean setup.", "Filtering for momentum…", "Checking the trend…", "Weighing volatility…", "Screening out thin liquidity…", "Sizing up the risk…", "One setup makes the cut."];
const BARS = [["Momentum", 34, "#E5484D"], ["Trend", 67, "#E6B422"], ["Volatility", 21, "#E5484D"], ["Liquidity", 36, "#E5484D"], ["Risk", 62, "#E6B422"]];
const BEATS = [
  ["Tap Analyze", "One tap on today's pick."],
  ["The AI reads the setup", "Signals, regime and risk, fast-forwarded here."],
  ["Results in about ten seconds", "Why it was picked, what confirms it, what breaks it."],
  ["Every score, explained", "Technical scores, an execution window and score rings."],
];
const CHAPTERS = ["OPEN", "01 SCAN", "02 PLAN", "03 ANALYZE", "04 SCORE"];
const SCENE_LEN = { "s-hero": 2.2, "s-scan": 3, "s-plan": 3, "s-film": 4, "s-score": 2.2 };

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const seg = (p, a, b) => clamp((p - a) / (b - a));
const fmt = (t) => { t = Math.max(0, Math.round(t)); return "00:" + (t < 10 ? "0" : "") + t; };

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const Dots = () => (<><i style={{ background: "#FF5F57" }} /><i style={{ background: "#FEBC2E" }} /><i style={{ background: "#28C840" }} /></>);

export default function ScrollFilm() {
  const root = useRef(null);

  useEffect(() => {
    if (!document.getElementById("sf-fonts")) {
      const l = document.createElement("link");
      l.id = "sf-fonts"; l.rel = "stylesheet"; l.href = FONTS_HREF;
      document.head.appendChild(l);
    }
    document.documentElement.classList.add("sf-page"); // see html.sf-page in ScrollFilm.css
    const el = root.current;
    const q = (s) => el.querySelector(s);
    const qa = (s) => [...el.querySelectorAll(s)];
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scenes = qa(".scene");
    const tiles = qa(".tk");
    const filters = qa("#sf-filters span");
    const barFills = qa(".brow .t i"), barNums = qa(".brow b");
    const beats = qa("#sf-beats li");
    const rail = qa(".rail div"), railEl = q(".rail");
    const radar = q(".radar"), copy = q(".hero-copy"), flash = q(".flash"), cue = q(".scroll-cue");
    const video = q("#sf-film");
    let wantTime = 0, seeking = false, ticking = false;

    const seekTo = (t) => {
      wantTime = t;
      if (!video || !isFinite(video.duration) || !video.duration) return;
      if (!seeking) { seeking = true; try { video.currentTime = t; } catch { seeking = false; } }
    };
    const onSeeked = () => { seeking = false; if (Math.abs(video.currentTime - wantTime) > 0.04) seekTo(wantTime); };
    // iOS Safari often won't decode frames for seeking until a muted video has
    // started once; a play()+pause() on load primes it (muted+playsInline).
    const primeVideo = () => { video.play().then(() => video.pause()).catch(() => {}); };

    const setHeights = () => scenes.forEach((s) => {
      s.style.height = reduce ? "auto" : (SCENE_LEN[s.id] * window.innerHeight + window.innerHeight) + "px";
    });
    const progress = (s) => {
      const r = s.getBoundingClientRect(), span = s.offsetHeight - window.innerHeight;
      return span > 0 ? clamp(-r.top / span) : 1;
    };

    const draw = {
      "s-hero": (p) => {
        const a = ease(seg(p, 0, 0.45));
        copy.style.transform = `translateY(${-a * 120}px) scale(${1 - a * 0.08})`;
        copy.style.opacity = String(1 - seg(p, 0.05, 0.42));
        const z = ease(seg(p, 0.15, 1));
        radar.style.transform = `translate(-50%,-50%) scale(${0.55 + Math.pow(z, 2.2) * 28})`;
        radar.style.opacity = String(seg(p, 0.08, 0.3) * (1 - 0.6 * seg(p, 0.85, 1)));
        flash.style.opacity = String(Math.sin(Math.PI * seg(p, 0.72, 1)) * 0.55);
        cue.style.opacity = String(1 - seg(p, 0, 0.08));
      },
      "s-scan": (p) => {
        const qq = seg(p, 0.05, 0.92);
        tiles.forEach((t, i) => {
          const off = qq > TILES[i].thr;
          if (t.classList.contains("off") !== off) t.classList.toggle("off", off);
        });
        tiles[WIN_TILE]?.classList.toggle("win", p > 0.9);
        let count = Math.max(1, Math.round(1200 * ease(1 - qq)));
        if (p > 0.9) count = 1;
        q("#sf-count").innerHTML = (count === 1 ? "1" : count.toLocaleString("en-US")) + "<small>" + (count === 1 ? "setup" : "stocks") + "</small>";
        const stage = Math.min(4, Math.floor(qq * 5));
        filters.forEach((f, i) => { f.className = p <= 0.05 ? "" : (i < stage || qq >= 1 ? "done" : (i === stage ? "now" : "")); });
        q("#sf-scanline").textContent = p <= 0.05 ? SCAN_LINES[0] : (p > 0.9 ? SCAN_LINES[6] : SCAN_LINES[1 + stage]);
        q("#sf-tc1").textContent = fmt(p * 9);
      },
      "s-plan": (p) => {
        const tilt = ease(seg(p, 0, 0.3)), zoom = ease(seg(p, 0.3, 0.6));
        q("#sf-screen").style.transform = `rotateX(${(1 - tilt) * 26}deg) scale(${0.86 + tilt * 0.14 + zoom * 0.16})`;
        q("#sf-c1").classList.toggle("hide", p < 0.4);
        q("#sf-c2").classList.toggle("hide", p < 0.55);
        q("#sf-c3").classList.toggle("hide", p < 0.7);
      },
      "s-film": (p) => {
        const qq = seg(p, 0.04, 0.96);
        if (video) seekTo(qq * (video.duration || 7.4));
        q("#sf-scrub").style.width = qq * 100 + "%";
        q("#sf-tc2").textContent = fmt(qq * 7) + " / 00:07";
        const beat = qq < 0.24 ? 0 : qq < 0.41 ? 1 : qq < 0.63 ? 2 : 3;
        beats.forEach((li, i) => li.classList.toggle("on", i === beat));
      },
      "s-score": (p) => {
        const a = ease(seg(p, 0.05, 0.6)), b = ease(seg(p, 0.2, 0.75));
        q("#sf-r1").style.background = `conic-gradient(#E6B422 0 ${46 * a}%, rgba(236,244,240,.09) ${46 * a}% 100%)`;
        q("#sf-r2").style.background = `conic-gradient(#00D278 0 ${79 * b}%, rgba(236,244,240,.09) ${79 * b}% 100%)`;
        q("#sf-r1n").textContent = Math.round(46 * a); q("#sf-r2n").textContent = Math.round(79 * b);
        BARS.forEach((bar, i) => {
          const k = ease(seg(p, 0.3 + i * 0.06, 0.7 + i * 0.04));
          barFills[i].style.width = bar[1] * k + "%"; barNums[i].textContent = Math.round(bar[1] * k);
        });
      },
    };

    const frame = () => {
      ticking = false;
      let active = -1;
      scenes.forEach((s, idx) => {
        const p = progress(s), r = s.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5) active = idx;
        if (r.bottom > -50 && r.top < window.innerHeight + 50) draw[s.id](p);
      });
      rail.forEach((d, i) => d.classList.toggle("on", i === active));
      if (railEl) railEl.style.opacity = active < 0 ? "0" : "1";
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    const onResize = () => { setHeights(); onScroll(); };

    if (reduce) {
      el.classList.add("still");
      draw["s-scan"](1); draw["s-plan"](1); draw["s-score"](1);
      if (video) video.setAttribute("controls", "");
      beats[3]?.classList.add("on");
      return () => document.documentElement.classList.remove("sf-page");
    }
    setHeights();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    video?.addEventListener("seeked", onSeeked);
    video?.addEventListener("loadedmetadata", onScroll);
    video?.addEventListener("loadeddata", primeVideo, { once: true });
    frame();
    return () => {
      document.documentElement.classList.remove("sf-page");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      video?.removeEventListener("seeked", onSeeked);
      video?.removeEventListener("loadedmetadata", onScroll);
    };
  }, []);

  const scrollTo = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <div className="sf" ref={root}>
      <div className="grain" aria-hidden="true" />

      <header className="nav">
        <div className="wrap nav-in">
          <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Aurexis, back to top">
            <svg width="28" height="28" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="15" fill="#1E232D" /><circle cx="15" cy="15" r="10.8" fill="#28303C" /><circle cx="15" cy="15" r="7" fill="#00B464" /><circle cx="15" cy="15" r="3.8" fill="#00D278" /><circle cx="15" cy="15" r="1.2" fill="#FFFFFF" /></svg>
            AUREXIS
          </button>
          <nav className="nav-links" aria-label="Main">
            <a className="l" href="#sf-how" onClick={scrollTo("sf-how")}>How it works</a>
            <a className="l" href="#pricing" onClick={scrollTo("pricing")}>Pricing</a>
            <a className="l" href="#faq" onClick={scrollTo("faq")}>FAQ</a>
            <button className="l" onClick={() => goToAuth("/login")}>Log in</button>
            <button className="sfbtn btn-primary" onClick={() => goToAuth("/signup")}>Get today's pick</button>
          </nav>
        </div>
      </header>

      <aside className="rail" aria-hidden="true">
        {CHAPTERS.map((c) => <div key={c}>{c} <i /></div>)}
      </aside>

      <main>
        {/* 1 · OPEN */}
        <section className="scene" id="s-hero">
          <div className="stage">
            <div className="radar" aria-hidden="true">
              <span style={{ width: "100%", height: "100%", background: "#151a22" }} />
              <span style={{ width: "72%", height: "72%", background: "#1E2530" }} />
              <span style={{ width: "47%", height: "47%", background: "#00B464" }} />
              <span style={{ width: "25%", height: "25%", background: "#00D278" }} />
              <span style={{ width: "7%", height: "7%", background: "#D9FBEA" }} />
            </div>
            <div className="flash" aria-hidden="true" />
            <div className="hero-copy">
              <div className="sfpill"><i />AI STOCK RESEARCH · ONE IDEA A DAY</div>
              <h1>The market gives<br />one signal a day.<br /><span className="g">We find it.</span></h1>
              <p>One AI-curated setup before the open: entry, stop and targets, with the reasoning behind it. You decide, and you trade in your own brokerage.</p>
              <div className="cta-row">
                <button className="sfbtn btn-primary" onClick={() => goToAuth("/signup")}>Get today's pick <Arrow /></button>
                <a className="sfbtn btn-ghost" href="#s-scan" onClick={scrollTo("s-scan")}>Watch how it works</a>
              </div>
              <p className="fine">Free plan · No credit card · Educational use, not investment advice</p>
            </div>
            <div className="scroll-cue" aria-hidden="true">SCROLL TO PLAY</div>
          </div>
        </section>

        {/* 2 · SCAN */}
        <section className="scene" id="s-scan">
          <div className="stage">
            <div className="field" aria-hidden="true">
              {TILES.map((t, i) => <div className="tk" key={i}>{t.name}</div>)}
            </div>
            <div className="scan-hud">
              <div className="eyebrow">Every morning before 9:30 ET</div>
              <div className="count" id="sf-count">1,200<small>stocks</small></div>
              <div className="filters" id="sf-filters">{FILTERS.map((f) => <span key={f}>{f}</span>)}</div>
              <div id="sf-scanline" style={{ fontSize: 15, color: "var(--muted)" }}>{SCAN_LINES[0]}</div>
            </div>
            <div className="timecode" aria-hidden="true">SCENE 01 <b id="sf-tc1">00:00</b></div>
          </div>
        </section>

        {/* 3 · PLAN */}
        <section className="scene" id="s-plan">
          <div className="stage" id="sf-how">
            <div className="plan-head">
              <div className="eyebrow">Today's AI pick</div>
              <h2>Three numbers. <span>Zero guessing.</span></h2>
            </div>
            <div className="screen-mask">
              <div className="screen" id="sf-screen">
                <div className="bar"><Dots /></div>
                <img src="/landing/app_home.jpg" alt="The Aurexis dashboard with an example AI pick for AS, showing entry, stop loss and three profit targets" width="2400" height="1378" />
              </div>
            </div>
            <div className="chips">
              <div className="chip" id="sf-c1"><span className="k" style={{ color: "var(--muted)" }}>ENTRY</span><span className="v">$28.15</span><span className="d">Where to get in, as a limit order.</span></div>
              <div className="chip" id="sf-c2"><span className="k" style={{ color: "var(--stop)" }}>STOP</span><span className="v" style={{ color: "var(--stop)" }}>$27.00</span><span className="d">Where the idea is wrong. Risk set before you buy.</span></div>
              <div className="chip" id="sf-c3"><span className="k" style={{ color: "var(--signal)" }}>TARGETS</span><span className="v" style={{ color: "var(--signal)" }}>$29.66 · $30.41 · $31.16</span><span className="d">Take some, let some run, trail the rest.</span></div>
            </div>
            <p className="note">Example trade plan from the app · illustrative, not a recommendation</p>
          </div>
        </section>

        {/* 4 · ANALYZE */}
        <section className="scene" id="s-film">
          <div className="stage">
            <div className="film-grid">
              <div className="film-copy">
                <div className="eyebrow">Real screen recording</div>
                <h2>The reasoning, not just the ticker.</h2>
                <p className="lead">Scroll to play the analysis. Scroll back to rewind.</p>
                <ol className="beats" id="sf-beats">
                  {BEATS.map(([b, s]) => <li key={b}><b>{b}</b><span>{s}</span></li>)}
                </ol>
              </div>
              <div className="film-frame">
                <div className="bar"><Dots /><em id="sf-tc2">00:00 / 00:07</em></div>
                <video id="sf-film" src="/landing/analyze_scrub.mp4" poster="/landing/analyze_poster.jpg" muted playsInline preload="auto" aria-label="Screen recording of Aurexis analyzing a stock, scrubbed by scrolling" />
                <div className="scrub"><i id="sf-scrub" /></div>
              </div>
            </div>
          </div>
        </section>

        {/* 5 · SCORE */}
        <section className="scene" id="s-score">
          <div className="stage">
            <div className="plan-head">
              <div className="eyebrow">Scored 0 to 100</div>
              <h2>Numbers you can read.</h2>
            </div>
            <div className="rings">
              <div className="sfring"><div className="ring-dial" id="sf-r1" role="img" aria-label="Example AI score 46 of 100"><div id="sf-r1n" style={{ color: "#F2C94C" }}>0</div></div><span className="lab">AI SCORE · SETUP</span></div>
              <div className="sfring"><div className="ring-dial" id="sf-r2" role="img" aria-label="Example execution score 79 of 100"><div id="sf-r2n" style={{ color: "#4FE29F" }}>0</div></div><span className="lab">EXECUTION · TIMING</span></div>
            </div>
            <div className="bars">
              {BARS.map(([name, , color]) => (
                <div className="brow" key={name}><span>{name}</span><div className="t"><i style={{ background: color }} /></div><b>0</b></div>
              ))}
            </div>
            <p className="note">Scores from the example analysis above · 0–39 weak · 40–69 mixed · 70+ strong</p>
          </div>
        </section>

        {/* static ending */}
        <section className="static">
          <div className="wrap">
            <h2>Your morning,<br /><span style={{ color: "var(--faint)" }}>in three moves.</span></h2>
            <div className="moves">
              <div><span className="n">01</span><h3>The AI scans</h3><p>Before the bell, Aurexis reads the market regime and screens 1,200+ stocks for one clean setup.</p></div>
              <div><span className="n">02</span><h3>You get one plan</h3><p>Entry, stop and targets, a 0–100 score, and the reasoning in plain English.</p></div>
              <div><span className="n">03</span><h3>You decide</h3><p>Paper trade it, or place it yourself in your own brokerage. Aurexis never trades for you or asks for your login.</p></div>
            </div>
          </div>
        </section>

        <section className="static" id="pricing" style={{ background: "var(--stage)", borderTop: "1px solid var(--line)" }}>
          <div className="wrap">
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <div className="eyebrow">Pricing</div>
              <h2>Start free.</h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 18 }}>Cancel anytime. Secure checkout by Stripe. 7-day refund for new subscribers.</p>
            </div>
            <div className="prices">
              {PLANS.map((plan) => {
                const featured = plan.name === "Starter";
                const [amt, per] = plan.price.split("/");
                return (
                  <div className={`price${featured ? " feat" : ""}`} key={plan.name}>
                    <strong>{plan.name}</strong>
                    <div className="amt">{amt}{per ? <small>/{per}</small> : null}</div>
                    <p>{plan.detail}</p>
                    <button className={`sfbtn ${featured ? "btn-primary" : "btn-ghost"}`} onClick={() => goToAuth(`/signup?plan=${plan.name.toLowerCase()}`)}>
                      {plan.name === "Free" ? "Start free" : `Choose ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="static" id="faq">
          <div className="wrap">
            <h2 style={{ textAlign: "center" }}>Straight answers.</h2>
            <div className="faq">
              {FAQ.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
            </div>
          </div>
        </section>

        <section className="static final">
          <div className="wrap">
            <h2>Tomorrow's setup is<br /><span style={{ color: "var(--signal)" }}>already being scanned.</span></h2>
            <button className="sfbtn btn-primary" style={{ padding: "20px 32px", fontSize: 18 }} onClick={() => goToAuth("/signup")}>Get today's pick</button>
            <p className="fine">Free plan · No credit card required</p>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="row">
            <span className="brand">AUREXIS</span>
            <nav aria-label="Footer">
              {[["About", "/about"], ["FAQ", "/faq"], ["Terms", "/terms"], ["Privacy", "/privacy"], ["Refund", "/refund"], ["Disclaimer", "/disclaimer"], ["Support", "/support"]].map(([l, to]) => (
                <Link key={to} to={to}>{l}</Link>
              ))}
            </nav>
          </div>
          <p>
            {OPERATED_BY} <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Aurexis provides educational stock research, not
            investment advice. Trading involves risk, including loss of principal. Example trade plans shown are illustrative.
            © {new Date().getFullYear()} {COMPANY.legalName}.
          </p>
        </div>
      </footer>
    </div>
  );
}
