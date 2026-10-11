import React from "react";
import PolicyLayout, { Section, P } from "./PolicyLayout";
import { FAQ } from "../lib/siteFacts";

export default function Faq() {
  return (
    <PolicyLayout title="Frequently asked questions" label="Help" updated={null}>
      {FAQ.map(({ q, a }) => (
        <Section key={q} title={q}>
          <P>{a}</P>
        </Section>
      ))}
    </PolicyLayout>
  );
}
