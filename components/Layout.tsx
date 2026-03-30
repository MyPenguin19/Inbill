"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isResultPage = pathname.startsWith("/result");

  return (
    <div className="app-shell">
      {!isResultPage && <Navbar />}
      <main
        className="app-content"
        style={isResultPage ? { paddingTop: 40 } : undefined}
      >
        {children}
      </main>
      {!isResultPage && <Footer />}
    </div>
  );
}
