"use client";

import Link from "next/link";

const pricingFeatures = [
  "Full bill analysis",
  "Detect errors and overcharges",
  "Exact steps to fix issues",
  "Call script included",
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-100 py-10">
      <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 md:px-6 lg:px-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm md:p-8">
          <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Pricing
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">Simple, transparent pricing</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            One-time payment. No subscription. One report built to help you review the bill before you pay.
          </p>
        </section>

        <section className="mx-auto max-w-[720px] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-500">One-time payment</div>
            <div className="mt-2 text-4xl font-semibold tracking-tight text-gray-950">$4.99 per report</div>
          </div>

          <div className="mt-8 space-y-4">
            {pricingFeatures.map((feature) => (
              <div key={feature} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {feature}
              </div>
            ))}
          </div>

          <Link
            href="/#analyze"
            className="mt-8 inline-flex w-full justify-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Fix My Bill — $4.99
          </Link>
        </section>
      </div>
    </main>
  );
}
