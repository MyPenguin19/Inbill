"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isResultPage = pathname.startsWith("/result");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100">
      {!isResultPage ? <Navbar /> : null}
      <main className={isResultPage ? "min-h-screen" : "min-h-[calc(100vh-64px)]"}>{children}</main>
      {!isResultPage ? <Footer /> : null}
    </div>
  );
}
