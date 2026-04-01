"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

const termsSections = [
  {
    title: "Overview",
    body: "By using InBill, you agree to these terms. They explain what the service does and what it does not do.",
  },
  {
    title: "Service Description",
    body: "InBill provides AI-assisted analysis of medical bills to help users review charges before payment.",
  },
  {
    title: "No Professional Advice",
    body: "This service does not provide medical, legal, or financial advice. It is intended for informational use only.",
  },
  {
    title: "User Responsibility",
    body: "You are responsible for reviewing the output, verifying billing details, and confirming any conclusions with the provider, insurer, or another qualified professional.",
  },
  {
    title: "Payments",
    body: "All payments are one-time. Once analysis is generated, the payment is non-refundable.",
  },
  {
    title: "Limitation of Liability",
    body: "We are not liable for actions, decisions, payments, disputes, or outcomes based on the analysis provided.",
  },
  {
    title: "Availability",
    body: "The service may change, pause, or be discontinued at any time without notice.",
  },
  {
    title: "Contact",
    body: "Questions about these terms can be sent to support@inbill.com.",
  },
] as const;

export default function TermsPage() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <section style={styles.headerCard}>
          <div style={styles.kicker}>Legal</div>
          <h1 style={styles.title}>Terms of Service</h1>
          <p style={styles.subtitle}>These terms explain how the service works and what you agree to when you use it.</p>
          <div style={styles.updatedLine}>Last updated: March 2026</div>
        </section>

        <section style={styles.sectionsWrap}>
          {termsSections.map((section) => (
            <article key={section.title} style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>{section.title}</h2>
              <p style={styles.bodyText}>{section.body}</p>
            </article>
          ))}
        </section>

        <footer style={styles.footerNote}>
          Questions? Contact us at <a href="mailto:support@inbill.com" style={styles.link}>support@inbill.com</a>.{" "}
          <Link href="/" style={styles.link}>
            Return to home
          </Link>
        </footer>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    color: "#0f172a",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: "48px 16px 64px",
  },
  container: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto",
  },
  headerCard: {
    background: "#ffffff",
    border: "1px solid #d9e0e7",
    borderRadius: 12,
    padding: "24px 22px",
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
    marginBottom: 24,
  },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 14,
  },
  title: {
    margin: "0 0 10px",
    fontSize: "clamp(2rem, 4vw, 2.7rem)",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  subtitle: {
    margin: "0 0 14px",
    fontSize: 15,
    lineHeight: 1.75,
    color: "#475569",
    maxWidth: 760,
  },
  updatedLine: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    fontWeight: 700,
  },
  sectionsWrap: {
    display: "grid",
    gap: 18,
  },
  sectionCard: {
    background: "#ffffff",
    border: "1px solid #d9e0e7",
    borderRadius: 12,
    padding: "18px 18px 16px",
    boxShadow: "0 10px 22px rgba(15,23,42,0.04)",
  },
  sectionTitle: {
    margin: "0 0 10px",
    fontSize: 21,
    lineHeight: 1.15,
    fontWeight: 900,
    letterSpacing: "-0.03em",
  },
  bodyText: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.85,
  },
  footerNote: {
    marginTop: 24,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.8,
  },
  link: {
    color: "#0f7757",
    textDecoration: "none",
    fontWeight: 700,
  },
};
