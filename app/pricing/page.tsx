"use client";

import Link from "next/link";

const pricingFeatures = [
  "Full bill analysis",
  "Detect duplicate charges",
  "Clear explanation",
  "Steps to fix",
  "Call script",
  "Dispute message",
] as const;

const trustPoints = [
  "No subscription",
  "No hidden fees",
  "Secure",
  "No account",
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen py-16">
      <div className="mx-auto w-full max-w-[1280px] space-y-10 px-6 lg:px-12">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm md:p-8">
          <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Pricing
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">Simple, transparent pricing</h1>
          <p className="mt-3 max-w-[60ch] mx-auto text-sm leading-relaxed text-gray-600">
            One-time payment. No subscription. Review your bill before you pay.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <div className="space-y-6">
              <div className="text-sm font-medium text-gray-500">One-time payment</div>
              <div className="text-5xl font-semibold tracking-tight text-gray-950">$4.99</div>
              <p className="max-w-[60ch] text-sm leading-relaxed text-gray-600">
                One report can help you avoid overpaying and give you a clearer path before you call billing.
              </p>

              <div className="grid gap-3">
                {pricingFeatures.map((feature) => (
                  <div key={feature} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    {feature}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm font-medium text-green-700">
                One report can help you avoid overpaying.
              </div>

              <Link
                href="/#analyze"
                className="inline-flex w-full justify-center rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.99]"
              >
                Fix My Bill — $4.99
              </Link>
            </div>
          </div>

          <div className="space-y-10">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">Why this matters</h2>
                <p className="max-w-[60ch] text-sm leading-relaxed text-gray-600">
                  Medical billing errors are common, and many people pay without questioning balances that deserve a closer review. A quick report can help you spot issues before payment and move into a billing call with more clarity.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">Trust and privacy</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {trustPoints.map((point) => (
                    <div key={point} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
