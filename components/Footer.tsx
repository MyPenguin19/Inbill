import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-100 pt-10 pb-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 text-sm text-gray-500 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="space-y-1">
          <div className="font-semibold tracking-tight text-gray-950">BillFixa</div>
          <p>Fix billing errors before you pay.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="transition hover:text-gray-900">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-gray-900">
            Terms
          </Link>
          <Link href="/disclaimer" className="transition hover:text-gray-900">
            Disclaimer
          </Link>
        </div>
      </div>
    </footer>
  );
}
