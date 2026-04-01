"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

const disclaimerItems = [
  {
    title: "Informational Only",
    body: "This service provides informational analysis only and does not constitute medical, legal, or financial advice.",
  },
  {
    title: "Not a Professional Service",
    body: "We are not healthcare providers, legal advisors, insurance representatives, or billing authorities.",
  },
  {
    title: "Always Verify Results",
    body: "Results may not be accurate or complete and should always be verified with your provider, insurer, or another qualified professional.",
  },
  {
    title: "Use at Your Own Risk",
    body: "Any action you take based on the analysis is your responsibility.",
  },
] as const;

export default function DisclaimerPage() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <section style={styles.headerCard}>
          <div style={styles.kicker}>Legal</div>
          <h1 style={styles.title}>Disclaimer</h1>
          <p style={styles.subtitle}>This page explains the limits of the service and how the analysis should be used.</p>
          <div style={styles.updatedLine}>Last updated: March 2026</div>
        </section>

        <section style={styles.sectionsWrap}>
          {disclaimerItems.map((item) => (
            <article key={item.title} style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>{item.title}</h2>
              <p style={styles.bodyText}>{item.body}</p>
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
