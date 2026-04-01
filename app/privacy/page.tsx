"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

const policySections = [
  {
    title: "Overview",
    body: "InBill analyzes uploaded medical bills so patients can understand charges, spot likely billing issues, and decide what to question before making payment.",
  },
  {
    title: "What We Collect",
    bullets: ["Uploaded documents for temporary processing", "Basic technical data such as browser or request information"],
  },
  {
    title: "How We Use Data",
    bullets: ["To generate your medical bill analysis", "To improve the service and troubleshoot reliability issues"],
  },
  {
    title: "Data Storage",
    body: "Files are processed temporarily and are not stored permanently. We do not keep uploaded medical documents after processing is complete.",
  },
  {
    title: "Third-Party Services",
    body: "We use secure third-party services, including AI processing providers, to generate analysis results.",
  },
  {
    title: "Data Sharing",
    body: "We do not sell or share your data.",
  },
  {
    title: "Security",
    body: "We use secure transmission methods and limit data handling to what is required to provide the service.",
  },
  {
    title: "Contact",
    body: "Questions about privacy can be sent to support@inbill.com.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <section style={styles.headerCard}>
          <div style={styles.kicker}>Legal</div>
          <h1 style={styles.title}>Privacy Policy</h1>
          <p style={styles.subtitle}>We respect your privacy and are committed to protecting your data.</p>
          <div style={styles.updatedLine}>Last updated: March 2026</div>
        </section>

        <section style={styles.sectionsWrap}>
          {policySections.map((section) => (
            <article key={section.title} style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>{section.title}</h2>
              {"body" in section ? <p style={styles.bodyText}>{section.body}</p> : null}
              {"bullets" in section ? (
                <ul style={styles.list}>
                  {section.bullets.map((item) => (
                    <li key={item} style={styles.listItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
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
  list: {
    margin: 0,
    paddingLeft: 22,
    display: "grid",
    gap: 8,
  },
  listItem: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.8,
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
