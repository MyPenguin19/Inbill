"use client";

import Link from "next/link";

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

const letter = `Dear Billing Department,

I am requesting a review of my recent bill because I identified a possible duplicate charge and an insurance-related issue that may affect the balance.

Please review the charges, confirm whether the balance is correct, and provide an updated itemized statement once the review is complete.

Thank you,
[Your Name]`;

export default function SamplePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-100 py-10">
      <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 md:px-6 lg:px-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Sample
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950">Example result preview</h1>
              <p className="text-sm leading-relaxed text-gray-600">
                This page uses the same report structure as the live results page, but with sample content.
              </p>
            </div>
            <div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">Sample only</div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <article className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Potential Overcharge Detected
                </div>
                <div className="mt-3 text-5xl font-semibold tracking-tight text-gray-950">$162.72</div>
                <div className="mt-2 text-sm text-gray-500">Estimated Overpayment</div>
                <p className="mt-4 text-sm font-medium leading-relaxed text-gray-700">
                  This bill likely contains billing errors that may increase what you pay.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">Key Findings</h2>
                <div className="mt-6 space-y-4">
                  {findings.map((finding) => (
                    <div key={finding.title} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-base font-semibold tracking-tight text-gray-950">{finding.title}</div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{finding.description}</p>
                      <div className="mt-2 text-sm font-semibold text-gray-900">{finding.impact}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">What This Means</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  These findings suggest your total bill may be higher than necessary. In many cases, similar discrepancies are reviewed and corrected after contacting the billing department.
                </p>
              </div>
            </article>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-gray-950">What to Say When You Call</h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      Use this script to explain the issue clearly and request a review.
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm leading-relaxed text-gray-800 whitespace-pre-line">
                  {script}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">Written Dispute (Ready to Send)</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  You can copy and send this directly to the billing department.
                </p>
                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-sm leading-relaxed text-gray-800 whitespace-pre-line">
                  {letter}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">Recommended Next Steps</h2>
                <div className="mt-4 space-y-3">
                  {steps.map((step, index) => (
                    <div key={step} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      {index + 1}. {step}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">Get your own analysis</h2>
              <p className="text-sm leading-relaxed text-gray-600">Use the live report flow to review your actual bill.</p>
            </div>
            <Link
              href="/#analyze"
              className="inline-flex rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-900"
            >
              Fix My Bill — $4.99
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
