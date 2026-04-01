import type { Metadata } from "next";

import LegalPage from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — BillFixa",
  description:
    "Learn how BillFixa protects your data and handles uploaded medical documents securely.",
};

const sections = [
  {
    title: "Overview",
    body: "BillFixa analyzes uploaded medical bills so patients can understand charges, spot likely billing issues, and decide what to question before making payment.",
  },
  {
    title: "What We Collect",
    bullets: [
      "Uploaded documents for temporary processing",
      "Basic technical data such as browser or request information",
    ],
  },
  {
    title: "How We Use Data",
    bullets: [
      "To generate your medical bill analysis",
      "To improve the service and troubleshoot reliability issues",
    ],
  },
  {
    title: "Data Storage",
    body: "Files are processed temporarily and are not stored permanently. We do not keep uploaded medical documents after processing is complete.",
  },
  {
    title: "Third-Party Services",
    body: "We use secure third-party services, including AI processing providers, to generate analysis results.",
  },
  {
    title: "Data Sharing",
    body: "We do not sell or share your data.",
  },
  {
    title: "Security",
    body: "We use secure transmission methods and limit data handling to what is required to provide the service.",
  },
  {
    title: "Contact",
    body: "Questions about privacy can be sent to support@billfixa.com.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="We respect your privacy and are committed to protecting your data."
      sections={sections}
    />
  );
}
