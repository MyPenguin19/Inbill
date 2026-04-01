import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About BillFixa",
  description: "Learn why BillFixa was built to help patients fix medical bill errors before they pay.",
};

const sections = [
  {
    title: "Why BillFixa exists",
    body: "Medical bills are confusing, inconsistent, and often wrong. BillFixa was built to help people understand what they are paying before they overpay.",
  },
  {
    title: "What it does",
    body: "The product reviews uploaded bills, highlights likely issues, explains the balance in plain English, and gives you an action plan for what to question.",
  },
  {
    title: "Why people trust it",
    body: "No account required. No subscriptions. Files are processed for the report and not meant to be stored long term.",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-100 py-10">
      <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 md:px-6 lg:px-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            About
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">Why we built BillFixa</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600">
            BillFixa is designed to help patients understand their bill, identify likely errors, and take action before paying a balance that may be inflated.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{section.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
