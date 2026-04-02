"use client";

import Link from "next/link";
import CallScriptCard from "@/components/results/CallScriptCard";
import IssueList from "@/components/results/IssueList";
import NextStepsCard from "@/components/results/NextStepsCard";
import SavingsCard from "@/components/results/SavingsCard";
import SummaryCard from "@/components/results/SummaryCard";

const findings = [
  {
    title: "Duplicate Charge Identified",
    description: "Two similar charges were identified for the same service, which may indicate a billing duplication.",
    impact: "Estimated impact: $45–$90",
  },
  {
    title: "Insurance Issue Identified",
    description: "A billing or insurance issue was identified that may increase your out-of-pocket responsibility.",
    impact: "Estimated impact: $120–$240",
  },
] as const;

const steps = [
  "Contact the billing department",
  "Request an itemized review",
  "Reference the issues identified above",
  "Request a corrected statement",
] as const;

const script = `Hi, I reviewed my bill and noticed a duplicate charge and an insurance issue that need review before I make payment.

Can you verify these charges and send me a corrected statement once the review is complete?`;

export default function SamplePage() {
  const callSections = script.split(/\n+/).filter(Boolean);

  return (
    <main className="min-h-screen py-16">
      <div className="mx-auto w-full max-w-7xl space-y-12 px-6 lg:px-12">
        <div className="space-y-12">
          <SummaryCard
            label="Sample Report"
            title="Potential Overcharge Detected"
            amount="$162.72"
            amountLabel="Estimated Overpayment"
            confidenceScore={82}
            confidenceLabel="High"
            riskScore={86}
            riskLabel="High"
            verdict="This bill likely contains billing errors that may increase what you pay."
          />

          <IssueList issues={findings} />

          <SavingsCard
            amount="$162.72"
            insight="Based on the billing patterns identified, this bill shows characteristics commonly associated with duplicate charges and insurance issues. In similar cases, these discrepancies are often reviewed and adjusted after contacting the billing department."
            meaning="These findings suggest your total bill may be higher than necessary. In many cases, similar discrepancies are reviewed and corrected after contacting the billing department."
          />

          <CallScriptCard sections={callSections} copied={false} />

          <NextStepsCard steps={[...steps]} />
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-gray-950">Get your own analysis</h2>
              <p className="text-sm text-gray-700">Use the live report flow to review your actual bill.</p>
            </div>
            <Link
              href="/#analyze"
              className="inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700"
            >
              Fix My Bill — $4.99
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
