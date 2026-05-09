import React from "react";
import { Link } from "react-router-dom";
import PolicyLayout, { Section, P, UL, Callout } from "./PolicyLayout";

export default function Privacy() {
  return (
    <PolicyLayout title="Privacy Policy">

      <Section num="1" title="Information We Collect">
        <UL items={[
          "Account info: email, name, password (hashed)",
          "Payment info: handled by Stripe — we never see your card numbers",
          "Usage data: which features you use, when you log in",
          "Optional: phone number for SMS alerts",
        ]} />
      </Section>

      <Section num="2" title="How We Use Information">
        <UL items={[
          "Provide the Service",
          "Process payments",
          "Send pick alerts (if opted in)",
          "Improve the system",
          "Respond to support requests",
        ]} />
      </Section>

      <Section num="3" title="Information We Do NOT Sell">
        <Callout variant="info">
          We do not sell your personal information to third parties. Period.
        </Callout>
      </Section>

      <Section num="4" title="Third-Party Services">
        <UL items={[
          "Stripe — payments",
          "SendGrid — email delivery",
          "Twilio — SMS alerts (optional)",
          "Cloudflare — security and DDoS protection",
          "Vercel — frontend hosting",
          "Railway — backend hosting",
        ]} />
      </Section>

      <Section num="5" title="Cookies">
        <P>
          We use minimal cookies for authentication and basic analytics. See our{" "}
          <Link to="/cookies" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>
            Cookie Policy
          </Link>{" "}
          for details.
        </P>
      </Section>

      <Section num="6" title="Data Security">
        <P>
          We use industry-standard encryption for data in transit and at rest.
          However, no system is 100% secure. We will notify you promptly in the event of a data breach
          that affects your information.
        </P>
      </Section>

      <Section num="7" title="Your Rights">
        <P>You can:</P>
        <UL items={[
          "Request a copy of your data",
          "Delete your account and all associated data",
          "Opt out of marketing emails at any time",
          "Update your information in account settings",
        ]} />
      </Section>

      <Section num="8" title="Children's Privacy">
        <P>
          The Service is not intended for users under 18. We do not knowingly collect information
          from minors. If you believe a minor has provided us information, contact us immediately.
        </P>
      </Section>

      <Section num="9" title="Changes to This Policy">
        <P>
          We will notify users of material changes via email before the changes take effect.
        </P>
      </Section>

      <Section num="10" title="Contact">
        <P>
          For privacy-related questions or to exercise your data rights (access, deletion, correction),
          contact us at{" "}
          <a href="mailto:privacy@aurexis.com" style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>
            privacy@aurexis.com
          </a>
          .
        </P>
      </Section>

    </PolicyLayout>
  );
}
