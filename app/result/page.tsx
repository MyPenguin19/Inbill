import Link from "next/link";

import { ResultClient } from "@/components/result-client";
import { verifyMedicalBillSession } from "@/lib/stripe";

type ResultPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

async function getPaymentStatus(sessionId: string) {
  try {
    return await verifyMedicalBillSession(sessionId);
  } catch {
    return false;
  }
}

export default async function ResultPage({ searchParams }: ResultPageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <main className="page-shell">
        <section className="status-card">
          <p className="eyebrow">Missing session</p>
          <h1>We need a completed checkout to continue.</h1>
          <p>Return to the home page, upload a bill, and finish payment before generating the analysis.</p>
          <Link className="secondary-link" href="/">
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  const isPaid = await getPaymentStatus(sessionId);

  return (
    <main className="page-shell page-shell-wide">
      <ResultClient isPaid={isPaid} sessionId={sessionId} />
    </main>
  );
}
