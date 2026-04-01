import type { Metadata } from "next";

import LegalPage from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — BillFixa",
  description:
    "Read the terms and conditions for using BillFixa medical bill analysis service.",
};

const sections = [
  {
    title: "Overview",
    body: "By using BillFixa, you agree to these terms. They explain what the service does and what it does not do.",
  },
  {
    title: "Service Description",
    body: "BillFixa provides AI-assisted analysis of medical bills to help users review charges before payment.",
  },
  {
    title: "No Professional Advice",
    body: "This service does not provide medical, legal, or financial advice. It is intended for informational use only.",
  },
  {
    title: "User Responsibility",
    body: "You are responsible for reviewing the output, verifying billing details, and confirming any conclusions with the provider, insurer, or another qualified professional.",
  },
  {
    title: "Payments",
    body: "All payments are one-time. Once analysis is generated, the payment is non-refundable.",
  },
  {
    title: "Limitation of Liability",
    body: "We are not liable for actions, decisions, payments, disputes, or outcomes based on the analysis provided.",
  },
  {
    title: "Availability",
    body: "The service may change, pause, or be discontinued at any time without notice.",
  },
  {
    title: "Contact",
    body: "Questions about these terms can be sent to support@billfixa.com.",
  },
] as const;

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="These terms explain how the service works and what you agree to when you use it."
      sections={sections}
    />
  );
}
