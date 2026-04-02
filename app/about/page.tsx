import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About BillFixa",
  description: "Learn how BillFixa helps patients detect billing errors and review medical charges before they pay.",
};

const sections = [
  {
    title: "Why this exists",
    body: "Medical bills are often hard to understand. Charges are inconsistent, insurance adjustments are easy to miss, and many people pay without knowing whether the balance is correct.",
  },
  {
    title: "What it does",
    bullets: [
      "Detects billing issues worth reviewing",
      "Explains the bill in plain language",
      "Guides the next steps before payment",
    ],
  },
  {
    title: "What makes it useful",
    body: "BillFixa is built to help you understand what to question before you pay, so you can move into a billing call or follow-up with more clarity and confidence.",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="min-h-screen py-16">
      <div className="mx-auto w-full max-w-7xl space-y-12 px-6 lg:px-12">
        <section className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
              About
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-950">Fix billing errors before you pay</h1>
            <p className="max-w-[60ch] text-sm leading-relaxed text-gray-600">
              BillFixa helps patients review medical charges, spot likely issues, and understand what deserves a second look before money leaves their account.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">{section.title}</h2>
                {"body" in section ? (
                  <p className="text-sm leading-relaxed text-gray-600">{section.body}</p>
                ) : (
                  <div className="space-y-3">
                    {section.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
                      >
                        {bullet}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">Disclaimer</h2>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="max-w-[60ch] text-sm leading-relaxed text-gray-700">
                This is not medical, legal, or financial advice. BillFixa is designed to help you review billing details and prepare questions before you pay.
              </p>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              BillFixa is meant to help you ask better questions, understand confusing charges, and move into billing conversations with more confidence.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
