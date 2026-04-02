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
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 md:px-6 lg:px-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm md:p-8">
          <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Pricing
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">Simple, transparent pricing</h1>
          <p className="mt-3 max-w-[60ch] mx-auto text-sm leading-relaxed text-gray-600">
            One-time payment. No subscription. Review your bill before you pay.
          </p>
        </section>

        <section className="mx-auto max-w-[760px] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">One-time payment</div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-gray-950">$4.99 per report</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {pricingFeatures.map((feature) => (
                <div key={feature} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {feature}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm font-medium text-green-700">
              One report can help you avoid overpaying.
            </div>

            <Link
              href="/#analyze"
              className="mt-6 inline-flex w-full justify-center rounded-xl bg-gray-900 px-5 py-4 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-black hover:shadow-md active:scale-[0.99]"
            >
              Fix My Bill — $4.99
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">Why this matters</h2>
            <p className="max-w-[60ch] text-sm leading-relaxed text-gray-600">
              Medical billing errors are common, and many people pay without questioning balances that deserve a closer review. A quick report can help you spot issues before payment and move into a billing call with more clarity.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">Trust and privacy</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {trustPoints.map((point) => (
                <div key={point} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
