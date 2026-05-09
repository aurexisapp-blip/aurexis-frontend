import React from "react";
import PolicyLayout, { Section, P, UL, Callout } from "./PolicyLayout";

export default function Terms() {
  return (
    <PolicyLayout title="Terms of Service">

      <Callout variant="warning">
        By using Aurexis you agree to these terms. If you do not agree, do not use the Service.
      </Callout>

      <Section num="1" title="Acceptance of Terms">
        <P>
          By accessing or using Aurexis ("the Service"), you agree to be bound by these Terms of Service.
          If you do not agree, do not use the Service.
        </P>
      </Section>

      <Section num="2" title="Description of Service">
        <P>
          Aurexis provides AI-generated stock trade ideas for educational and informational purposes.
          The Service scans publicly available market data to identify potential trading setups.
          Aurexis is <strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>NOT</strong> a
          registered investment advisor, broker-dealer, or financial planner.
        </P>
      </Section>

      <Section num="3" title="No Investment Advice">
        <P>
          The Service does <strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>NOT</strong> provide
          investment advice, financial advice, tax advice, or legal advice.
          All content is for educational purposes only. You are solely responsible for your own investment decisions.
        </P>
      </Section>

      <Section num="4" title="Account Registration">
        <P>
          You must be at least 18 years old or have legal capacity to use paid features.
          You agree to provide accurate information and keep your account credentials secure.
        </P>
      </Section>

      <Section num="5" title="Subscription and Payment">
        <UL items={[
          "Subscriptions are billed monthly via Stripe",
          "You may cancel anytime; cancellation takes effect at the end of the current billing period",
          "Refunds are governed by our Refund Policy",
        ]} />
      </Section>

      <Section num="6" title="Acceptable Use">
        <P>
          You may not: redistribute Aurexis content, scrape the Service, reverse engineer the system,
          or use the Service to harm others.
        </P>
      </Section>

      <Section num="7" title="Disclaimer of Warranties">
        <Callout variant="warning">
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. PAST PERFORMANCE DOES NOT GUARANTEE
          FUTURE RESULTS. ALL TRADING INVOLVES RISK OF LOSS.
        </Callout>
      </Section>

      <Section num="8" title="Limitation of Liability">
        <P>
          Aurexis is not liable for any losses incurred from following or not following its trade ideas.
          Maximum liability is limited to the amount paid by you in the prior 30 days.
        </P>
      </Section>

      <Section num="9" title="Termination">
        <P>
          We may terminate accounts that violate these terms. You may terminate by canceling your subscription.
        </P>
      </Section>

      <Section num="10" title="Changes to Terms">
        <P>
          We may update these terms at any time. Continued use of the Service constitutes acceptance of the updated terms.
        </P>
      </Section>

      <Section num="11" title="Governing Law &amp; Contact">
        <P>
          Aurexis is an AI-powered stock signal service. For legal notices, support requests, or other
          inquiries, contact us at{" "}
          <a href="mailto:support@aurexis.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>
            support@aurexis.com
          </a>
          . These Terms are governed by the laws of the Commonwealth of Massachusetts, without regard to
          conflict of law principles.
        </P>
      </Section>

    </PolicyLayout>
  );
}
