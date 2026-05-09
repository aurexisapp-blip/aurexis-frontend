import { useEffect, useMemo, useState } from "react";
import TradeCard from "./components/TradeCard";
import TopMovers from "./components/TopMovers";
import "./App.css";

function App() {
  const [bestPick, setBestPick] = useState(null);
  const [analyzeSymbol, setAnalyzeSymbol] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [topMovers, setTopMovers] = useState([]);
  const [loadingBestPick, setLoadingBestPick] = useState(false);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [error, setError] = useState("");

  const symbol = useMemo(() => {
    return String(bestPick?.symbol || "").trim().toUpperCase();
  }, [bestPick]);

  async function fetchBestPick() {
    setLoadingBestPick(true);
    setError("");
    try {
      const res = await fetch("/best_pick_v2?max_scan=1200&allow_llm_news=true");
      const best = await res.json();
      setBestPick(best);
      const nextSymbol = best?.symbol || "";
      setAnalysis(null);
      setAnalyzeSymbol(nextSymbol);
      if (!nextSymbol) {
        setAnalysis(null);
      }
    } catch (err) {
      setError(String(err?.message || "Failed to load best pick."));
      setBestPick(null);
      setAnalyzeSymbol("");
      setAnalysis(null);
    } finally {
      setLoadingBestPick(false);
    }
  }

  async function fetchTopMovers() {
    try {
      const res = await fetch("/top_movers");
      const data = await res.json();
      console.log("Top movers received:", data?.movers);
      const normalized = Array.isArray(data?.movers)
        ? data.movers.map((m) => ({
            symbol: m?.symbol,
            price: m?.price ?? m?.last ?? 0,
            change: m?.change ?? 0,
            pct_change: m?.pct_change ?? m?.change_percent ?? 0,
          }))
        : [];
      setTopMovers(normalized);
    } catch {
      setTopMovers([]);
    }
  }

  async function refreshAll() {
    await fetchBestPick();
    await fetchTopMovers();
  }

  useEffect(() => {
    fetchBestPick();
    fetchTopMovers();
  }, []);

  useEffect(() => {
    if (!bestPick?.symbol) return;
    const clean = encodeURIComponent(String(bestPick?.symbol || "").trim().toUpperCase());
    if (!clean) return;

    let cancelled = false;
    setLoadingAnalyze(true);

    fetch(`/analyze/${clean}?budget=1000&risk=medium&timeframe=swing`)
      .then((r) => r.json())
      .then((payload) => {
        if (!cancelled) {
          setAnalysis(payload);
          setLoadingAnalyze(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnalysis(null);
          setLoadingAnalyze(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bestPick]);

  return (
    <main className="appShell">
      <div className="appContainer">
        <header className="appHeader">
          <div>
            <h1>StackIQ Trade Card</h1>
            <p>Live best pick with thesis, human explanation, movers, and execution sync.</p>
          </div>
          <button className="refreshButton" onClick={refreshAll} disabled={loadingBestPick}>
            {loadingBestPick ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error ? <div className="errorBox">{error}</div> : null}

        {topMovers && topMovers.length > 0 ? <TopMovers movers={topMovers} /> : null}

        <TradeCard
          loading={loadingBestPick}
          loadingAnalyze={loadingAnalyze}
          symbol={symbol}
          bestPick={bestPick}
          analysis={analysis}
        />
      </div>
    </main>
  );
}

export default App;
