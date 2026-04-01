import Link from "next/link";
import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  body?: string;
  bullets?: readonly string[];
};

type LegalPageProps = {
  title: string;
  subtitle: string;
  sections: readonly LegalSection[];
};

export default function LegalPage({ title, subtitle, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-100 py-10">
      <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 md:px-6 lg:px-8">
        <section className="mx-auto max-w-[800px] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Legal
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">{subtitle}</p>
          <div className="mt-4 text-sm font-medium text-gray-500">Last updated: April 2026</div>
        </section>

        <section className="mx-auto max-w-[800px] space-y-6">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
            >
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">{section.title}</h2>
              {section.body ? (
                <p className="mt-4 text-sm leading-relaxed text-gray-600">{section.body}</p>
              ) : null}
              {section.bullets ? (
                <ul className="mt-4 space-y-3">
                  {section.bullets.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-gray-600">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>

        <footer className="mx-auto max-w-[800px] rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-relaxed text-gray-600 shadow-sm">
          Questions? Contact us at{" "}
          <a href="mailto:support@billfixa.com" className="font-medium text-gray-900">
            support@billfixa.com
          </a>
          .{" "}
          <Link href="/" className="font-medium text-gray-900">
            Return to home
          </Link>
          .
        </footer>
      </div>
    </main>
  );
}
