import type { Metadata } from "next";

import HomePageClient from "@/components/home-page-client";

export const metadata: Metadata = {
  title: "Check Medical Bills for Errors — MyBillScanner",
  description:
    "Find errors, overcharges, and denied claims in your medical bill. Upload your bill and avoid overpaying. Fast, secure, and easy.",
  keywords: [
    "medical bill check",
    "medical bill errors",
    "overcharged hospital bill",
    "bill audit",
    "healthcare billing errors",
  ],
};

export default function HomePage() {
  return <HomePageClient />;
}
