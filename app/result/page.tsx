import Link from "next/link";

import { ResultClient } from "@/components/result-client";
export default function ResultPage() {
  return (
    <main className="results-page">
      <section className="results-shell">
        <div className="results-topbar">
          <Link className="secondary-link" href="/">
            Back to home
          </Link>
        </div>
        <ResultClient />
      </section>
    </main>
  );
}
