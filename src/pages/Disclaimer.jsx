import React from "react";
import PolicyLayout, { Section, P, UL, Callout } from "./PolicyLayout";

export default function Disclaimer() {
  return (
    <PolicyLayout title="Financial Disclaimer">

      <Callout variant="warning">
        IMPORTANT: PLEASE READ CAREFULLY BEFORE USING AUREXIS
      </Callout>

      <Section title="Not Investment Advice">
        <P>
          Aurexis provides AI-generated trade ideas for educational purposes{" "}
          <strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>ONLY</strong>.
          Nothing on this Service constitutes investment advice, financial advice, trading advice, or any
          other sort of advice. We are not registered as an investment advisor with the SEC or any state regulator.
        </P>
      </Section>

      <Section title="Do Your Own Research">
        <P>
          You should independently verify any information before making investment decisions.
          Past performance is not indicative of future results.
        </P>
      </Section>

      <Section title="Risk of Loss">
        <Callout variant="warning">
          All trading and investing involves substantial risk of loss. You can lose more money than you invest,
          especially with options or margin trading. Only trade with money you can afford to lose.
        </Callout>
      </Section>

      <Section title="No Guaranteed Returns">
        <P>
          Aurexis makes no representations about future returns. The system's historical performance does not
          guarantee future performance. Markets are unpredictable.
        </P>
      </Section>

      <Section title="Win Rates and Backtests">
        <P>
          Any displayed win rates, returns, or performance metrics are based on historical data and live testing.
          Real-world results vary based on execution timing, slippage, fees, and market conditions.
        </P>
      </Section>

      <Section title="You Are Responsible">
        <P>You are solely responsible for:</P>
        <UL items={[
          "Your investment decisions",
          "Verifying trade ideas independently",
          "Managing your own risk",
          "Setting your own position sizes",
          "Determining tax implications",
        ]} />
      </Section>

      <Section title="Consult a Professional">
        <P>
          Before making any investment decision, consult with a licensed financial advisor, tax professional,
          or attorney as appropriate.
        </P>
      </Section>

      <Section title="Not a Fiduciary">
        <P>
          Aurexis has no fiduciary duty to you. We are a publisher of trade ideas, not a financial advisor.
        </P>
      </Section>

      <Callout variant="info">
        By using Aurexis, you acknowledge that you have read, understood, and agreed to this disclaimer.
      </Callout>

      <Section title="Contact">
        <P>
          Questions about this disclaimer? Contact us at{" "}
          <a href="mailto:support@aurexis.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>
            support@aurexis.com
          </a>
          .
        </P>
      </Section>

    </PolicyLayout>
  );
}
