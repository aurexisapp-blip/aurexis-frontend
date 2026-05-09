import React from "react";
import PolicyLayout, { Section, P, UL, Callout } from "./PolicyLayout";

export default function Cookies() {
  return (
    <PolicyLayout title="Cookie Policy">

      <Section title="What Are Cookies">
        <P>
          Cookies are small text files stored on your device that help websites remember information
          about your visit. We keep our cookie usage minimal.
        </P>
      </Section>

      <Section title="Cookies We Use">
        <P><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Essential Cookies (required):</strong></P>
        <UL items={[
          "Authentication — keeps you logged in securely",
          "Session — maintains your active session",
        ]} />
        <P><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Functional Cookies:</strong></P>
        <UL items={[
          "Preferences — remembers your settings (theme, tab state)",
          "Tab state — keeps you on the right page between visits",
        ]} />
        <P><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Analytics Cookies:</strong></P>
        <UL items={[
          "We use minimal privacy-respecting analytics (Plausible or similar)",
          "No personal information is tracked",
          "No cross-site tracking",
        ]} />
      </Section>

      <Section title="Cookies We Do NOT Use">
        <Callout variant="info">
          We do not use advertising cookies. We do not sell your data to advertisers.
          We do not track you across other websites.
        </Callout>
      </Section>

      <Section title="Managing Cookies">
        <P>
          You can disable cookies in your browser settings. Note that disabling essential cookies will
          prevent login and other core features from working properly.
        </P>
      </Section>

      <Section title="Changes">
        <P>
          We will notify users of material changes to this policy via email.
        </P>
      </Section>

      <Section title="Contact">
        <P>
          Questions about our cookie policy? Contact us at{" "}
          <a href="mailto:privacy@aurexis.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>
            privacy@aurexis.com
          </a>
          .
        </P>
      </Section>

    </PolicyLayout>
  );
}
