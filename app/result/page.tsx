import Link from "next/link";

import { ResultClient } from "@/components/result-client";
export default function ResultPage() {
  return (
    <main className="page-shell page-shell-wide">
      <Link className="secondary-link" href="/">
        Back to home
      </Link>
      <ResultClient />
    </main>
  );
}
