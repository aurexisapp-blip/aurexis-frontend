import React from "react";
import PolicyLayout, { Section, P, UL } from "./PolicyLayout";
import { ABOUT, COMPANY, DISCLAIMER, PAYMENTS } from "../lib/siteFacts";

export default function About() {
  return (
    <PolicyLayout title="About Aurexis" label="Company" updated={null}>
      {ABOUT.map((text) => <P key={text}>{text}</P>)}

      <Section title="What Aurexis does — and doesn't do">
        <UL items={[
          "Scans 1,200+ US stocks each trading day and surfaces a trade idea with an entry, stop-loss and target",
          "Explains each idea in plain English",
          "Never connects to your brokerage, never places trades, never holds your money",
          PAYMENTS,
        ]} />
      </Section>

      <Section title="Company">
        <P>
          {COMPANY.legalName} · {COMPANY.state}, United States ·{" "}
          <a href={`mailto:${COMPANY.email}`} style={{ color: "rgba(134,239,172,0.8)", textDecoration: "none" }}>{COMPANY.email}</a>
        </P>
      </Section>

      <Section title="Important">
        <P>{DISCLAIMER}</P>
      </Section>
    </PolicyLayout>
  );
}
