import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-10">
      <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 md:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="text-base font-semibold tracking-tight text-gray-950">BillFixa</div>
              <p className="text-sm leading-relaxed text-gray-600">Fix billing errors before you pay.</p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
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
        </div>
      </div>
    </footer>
  );
}
