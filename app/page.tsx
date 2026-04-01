import type { Metadata } from "next";

import HomePageClient from "@/components/home-page-client";

export const metadata: Metadata = {
  title: "Fix Medical Bill Errors — BillFixa",
  description:
    "Find and fix errors in your medical bill. Detect overcharges, duplicate fees, and insurance issues before you pay.",
  keywords: [
    "medical bill errors",
    "fix hospital bill",
    "overcharged medical bill",
    "billing audit",
    "insurance billing errors",
  ],
};

export default function HomePage() {
  return <HomePageClient />;
}
