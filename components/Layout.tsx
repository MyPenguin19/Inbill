"use client";

import type { ReactNode } from "react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
      <Footer />
    </div>
  );
}
