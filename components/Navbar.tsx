"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/sample", label: "Sample" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/70 backdrop-blur shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-12">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-950">
            <span className="h-6 w-6 rounded-md bg-blue-600" />
            <span>BillFixa</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-gray-600 transition hover:text-black">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link
              href="/#analyze"
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 active:scale-[0.99]"
            >
              Fix My Bill
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-900 shadow-sm md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] bg-gray-950/20 md:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="ml-auto flex min-h-screen w-full max-w-sm flex-col gap-6 bg-white p-6 shadow-sm"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-950">
                <span className="h-6 w-6 rounded-md bg-blue-600" />
                <span>BillFixa</span>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-900 shadow-sm"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-base font-medium text-gray-700"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <Link
              href="/#analyze"
              className="mt-auto inline-flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 active:scale-[0.99]"
              onClick={() => setMobileOpen(false)}
            >
              Fix My Bill
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
