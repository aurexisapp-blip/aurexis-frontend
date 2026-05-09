import "./TradeCard.css";

function display(v, fallback = "-") {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function hasText(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

export default function TradeCard({ loading, loadingAnalyze, symbol, bestPick, analysis }) {
  if (!bestPick) {
    return <div className="tradeCard card loading">Loading best pick...</div>;
  }

  const data = bestPick && typeof bestPick === "object" ? bestPick : null;

  const analyzeBody =
    (analysis?.analysis && typeof analysis.analysis === "object" ? analysis.analysis : null) ||
    (analysis && typeof analysis === "object" ? analysis : null);

  const thesis = data?.trade_thesis || null;

  const human = data?.human_explanation || data?.human_readable || null;

  const direction =
    data?.direction ||
    analyzeBody?.direction ||
    analyzeBody?.classification ||
    data?.classification;

  const aiScore = data?.ai_score_0_10 ?? data?.ai_score ?? data?.score;
  const executionScore = data?.execution_score_0_10 ?? data?.execution_score;
  const confidence =
    data?.confidence_0_10 ||
    data?.confidence ||
    analyzeBody?.confidence ||
    analyzeBody?.decision?.confidence;

  const tradePlan = data?.trade_plan && typeof data.trade_plan === "object" ? data.trade_plan : null;
  const entry = tradePlan?.entry;
  const stop = tradePlan?.stop ?? tradePlan?.stop_loss;
  const targets = toList(tradePlan?.targets);

  const thesisSummary = thesis?.summary;
  const thesisEdge = thesis?.edge;
  const thesisRiskLogic = thesis?.risk_logic;
  const thesisExecutionLogic = thesis?.execution_logic;
  const hasTradeThesis =
    hasText(thesisSummary) || hasText(thesisEdge) || hasText(thesisRiskLogic) || hasText(thesisExecutionLogic);

  const plainEnglishSummary = human?.plain_summary ?? human?.plain_english_summary ?? human?.summary;
  const whatSystemSees = human?.what_the_system_sees ?? human?.what_system_sees ?? human?.why_this_trade;
  const whatYouShouldDo = human?.what_you_should_do ?? human?.how_to_execute;
  const whatCouldGoWrong = human?.what_could_go_wrong ?? human?.risk_assessment;
  const hasHumanExplanation =
    hasText(plainEnglishSummary) || hasText(whatSystemSees) || hasText(whatYouShouldDo) || hasText(whatCouldGoWrong);

  const executionPlan =
    (data?.execution_plan && typeof data.execution_plan === "object" ? data.execution_plan : null) ||
    (analyzeBody?.execution_plan && typeof analyzeBody.execution_plan === "object" ? analyzeBody.execution_plan : null);
  const executionDate = executionPlan?.date ?? executionPlan?.day;
  const executionWindow = executionPlan?.window;
  const executionEntryMethod = executionPlan?.entry_method;
  const executionBuyZone = executionPlan?.buy_zone;
  const hasExecutionPanel =
    hasText(executionDate) || hasText(executionWindow) || hasText(executionEntryMethod) || hasText(executionBuyZone);

  const news =
    (analyzeBody?.news && typeof analyzeBody.news === "object" ? analyzeBody.news : null) ||
    (analyzeBody?.news_sentiment && typeof analyzeBody.news_sentiment === "object" ? analyzeBody.news_sentiment : null);
  const sentimentScore = Number(data?.pillar_scores_0_10?.sentiment ?? data?.sentiment_score);
  const sentimentData = data
    ? {
        direction: Number.isFinite(sentimentScore)
          ? sentimentScore >= 7
            ? "BULLISH"
            : sentimentScore <= 4
              ? "BEARISH"
              : "NEUTRAL"
          : "NEUTRAL",
        summary:
          data?.human_explanation?.plain_summary ||
          data?.human_readable?.summary ||
          data?.news_summary ||
          null,
        catalysts: toList(data?.catalysts).filter((item) => hasText(String(item || ""))),
        risks: toList(data?.risk_flags).filter((item) => hasText(String(item || ""))),
        headlines: toList(data?.headlines ?? news?.headlines).filter((item) => hasText(String(item || ""))),
      }
    : null;
  const hasNews =
    sentimentData &&
    (Boolean(sentimentData.summary) ||
      sentimentData.catalysts.length > 0 ||
      sentimentData.risks.length > 0);

  return (
    <section className="tradeCard">
      {loading ? (
        <div className="tradeCardState">Loading latest trade idea...</div>
      ) : !symbol ? (
        <div className="tradeCardState">No active best pick available.</div>
      ) : (
        <>
          <header className="tradeHeader">
            <div>
              <h2>{display(symbol)}</h2>
              <p className="subtitle">Best Pick</p>
            </div>
            <div className="badges">
              <span className="badge">Direction: {display(direction)}</span>
              <span className="badge">AI Score: {display(aiScore)}</span>
              <span className="badge">Execution Score: {display(executionScore)}</span>
              <span className="badge">Confidence: {display(confidence)}</span>
            </div>
          </header>

          {loadingAnalyze ? <p className="syncText">Syncing analysis for execution and sentiment...</p> : null}

          <div className="section">
            <h3>Trade Levels</h3>
            <div className="grid">
              <div>
                <label>Entry</label>
                <strong>{display(entry)}</strong>
              </div>
              <div>
                <label>Stop</label>
                <strong>{display(stop)}</strong>
              </div>
              <div>
                <label>Targets</label>
                <strong>{targets.length ? targets.map((t) => display(t)).join(" / ") : "-"}</strong>
              </div>
            </div>
          </div>

          {hasTradeThesis ? (
            <div className="section">
              <h3>Trade Thesis</h3>
              {hasText(thesisSummary) ? <p><strong>Summary:</strong> {thesisSummary}</p> : null}
              {hasText(thesisEdge) ? <p><strong>Edge:</strong> {thesisEdge}</p> : null}
              {hasText(thesisRiskLogic) ? <p><strong>Risk Logic:</strong> {thesisRiskLogic}</p> : null}
              {hasText(thesisExecutionLogic) ? <p><strong>Execution Logic:</strong> {thesisExecutionLogic}</p> : null}
            </div>
          ) : null}

          {hasHumanExplanation ? (
            <div className="section">
              <h3>In Plain English</h3>
              {hasText(plainEnglishSummary) ? <p><strong>Plain English Summary:</strong> {plainEnglishSummary}</p> : null}
              {hasText(whatSystemSees) ? <p><strong>What System Sees:</strong> {whatSystemSees}</p> : null}
              {hasText(whatYouShouldDo) ? <p><strong>What You Should Do:</strong> {whatYouShouldDo}</p> : null}
              {hasText(whatCouldGoWrong) ? <p><strong>What Could Go Wrong:</strong> {whatCouldGoWrong}</p> : null}
            </div>
          ) : null}

          {hasExecutionPanel ? (
            <div className="section">
              <h3>Execution Plan</h3>
              <div className="grid">
                <div>
                  <label>Date</label>
                  <strong>{display(executionDate)}</strong>
                </div>
                <div>
                  <label>Window</label>
                  <strong>{display(executionWindow)}</strong>
                </div>
                <div>
                  <label>Entry Method</label>
                  <strong>{display(executionEntryMethod)}</strong>
                </div>
                <div>
                  <label>Buy Zone</label>
                  <strong>{display(executionBuyZone)}</strong>
                </div>
              </div>
            </div>
          ) : null}

          {hasNews ? (
            <div className="section">
              <h3>News & Sentiment</h3>
              <p><strong>Direction:</strong> {sentimentData.direction}</p>
              {hasText(sentimentData.summary) ? <p><strong>Summary:</strong> {sentimentData.summary}</p> : null}
              {sentimentData.catalysts.length ? (
                <>
                  <p><strong>Catalysts:</strong></p>
                  <ul className="newsList">
                    {sentimentData.catalysts.slice(0, 6).map((line, idx) => (
                      <li key={`cat-${line}-${idx}`}>{display(line)}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {sentimentData.risks.length ? (
                <>
                  <p><strong>Risk Flags:</strong></p>
                  <ul className="newsList" style={{ color: "#b91c1c" }}>
                    {sentimentData.risks.slice(0, 6).map((line, idx) => (
                      <li key={`risk-${line}-${idx}`}>{display(line)}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {sentimentData.headlines.length ? (
                <ul className="newsList">
                  {sentimentData.headlines.slice(0, 4).map((line, idx) => (
                    <li key={`${line}-${idx}`}>{display(line)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
