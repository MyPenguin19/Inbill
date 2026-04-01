import type { Metadata } from "next";

import LegalPage from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Disclaimer — BillFixa",
  description:
    "BillFixa provides informational analysis only and does not replace professional medical or legal advice.",
};

const sections = [
  {
    title: "Informational Only",
    body: "This service provides informational analysis only and does not constitute medical, legal, or financial advice.",
  },
  {
    title: "Not a Professional Service",
    body: "We are not healthcare providers, legal advisors, insurance representatives, or billing authorities.",
  },
  {
    title: "Always Verify Results",
    body: "Results may not be accurate or complete and should always be verified with your provider, insurer, or another qualified professional.",
  },
  {
    title: "Use at Your Own Risk",
    body: "Any action you take based on the analysis is your responsibility.",
  },
] as const;

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      subtitle="This page explains the limits of the service and how the analysis should be used."
      sections={sections}
    />
  );
}
