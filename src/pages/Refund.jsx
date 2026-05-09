import React from "react";
import PolicyLayout, { Section, P, UL, Callout } from "./PolicyLayout";

export default function Refund() {
  return (
    <PolicyLayout title="Refund Policy">

      <Callout variant="info">
        New subscribers are covered by a 7-day money-back guarantee — no questions asked.
      </Callout>

      <Section title="7-Day Money-Back Guarantee">
        <P>
          New subscribers may request a full refund within 7 days of their first payment for any reason.
        </P>
      </Section>

      <Section title="How to Request a Refund">
        <P>
          To request a refund, email{" "}
          <a href="mailto:support@aurexis.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>
            support@aurexis.com
          </a>{" "}
          with your account email and date of purchase. A reason is optional but helpful.
        </P>
      </Section>

      <Section title="Processing Time">
        <P>
          Refunds are processed within 5–10 business days back to the original payment method.
        </P>
      </Section>

      <Section title="After 7 Days">
        <P>
          After the 7-day window, all sales are final. However, you can cancel anytime to prevent future
          charges. Cancellation takes effect at the end of your current billing period — you retain access
          until then.
        </P>
      </Section>

      <Section title="Exceptions">
        <UL items={[
          "Refunds are not available for accounts terminated for terms of service violations",
          "Refunds are not available for the same user requesting multiple refunds across multiple accounts",
        ]} />
      </Section>

      <Section title="Annual Plans (if applicable in future)">
        <P>
          Annual subscriptions follow the same 7-day money-back guarantee.
        </P>
      </Section>

      <Section title="Contact">
        <P>
          Questions about refunds? Email{" "}
          <a href="mailto:support@aurexis.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>
            support@aurexis.com
          </a>
          .
        </P>
      </Section>

    </PolicyLayout>
  );
}
