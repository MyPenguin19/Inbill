"use client";

import type { CSSProperties } from "react";

const termsSections = [
  {
    title: "Overview",
    body: "By using this service, you agree to these terms.",
  },
  {
    title: "Service Description",
    body: "InBill provides AI-generated analysis of medical bills for informational purposes only.",
  },
  {
    title: "No Professional Advice",
    body: "This service does not provide medical, legal, or financial advice.",
  },
  {
    title: "User Responsibility",
    body: "You are responsible for verifying all information before taking action.",
  },
  {
    title: "Payments",
    body: "All payments are one-time and non-refundable once analysis is generated.",
  },
  {
    title: "Limitation of Liability",
    body: "We are not liable for any decisions made based on this analysis.",
  },
  {
    title: "Availability",
    body: "Service may change or be discontinued at any time.",
  },
  {
    title: "Contact",
    body: "support@inbill.com",
  },
] as const;

export default function TermsPage() {
  return (
    <main style={styles.page}>
      <style jsx global>{`
        .legal-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          margin-bottom: 28px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
          backdrop-filter: blur(10px);
        }

        .legal-nav-links {
          display: flex;
          align-items: center;
          gap: 22px;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          flex-wrap: wrap;
        }

        .legal-nav-link {
          color: inherit;
          text-decoration: none;
        }

        @media (max-width: 760px) {
          .legal-nav {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div style={styles.container}>
        <section style={styles.heroCard}>
          <div style={styles.eyebrow}>Legal</div>
          <h1 style={styles.title}>Terms of Service</h1>
          <p style={styles.subtitle}>
            Please review these terms before using InBill. They explain the service and your
            responsibilities when relying on the analysis.
          </p>
        </section>

        <section style={styles.contentCard}>
          {termsSections.map((section) => (
            <article key={section.title} style={styles.sectionBlock}>
              <h2 style={styles.sectionTitle}>{section.title}</h2>
              <p style={styles.bodyText}>{section.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#0f172a",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: "32px 16px 64px",
  },
  container: {
    width: "100%",
    maxWidth: 800,
    margin: "0 auto",
  },
  heroCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "28px 24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginBottom: 24,
  },
  eyebrow: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#ecfeff",
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 14,
  },
  title: {
    margin: "0 0 12px",
    fontSize: "clamp(2rem, 5vw, 3rem)",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.75,
    color: "#475569",
  },
  contentCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  sectionBlock: {
    paddingBottom: 22,
    marginBottom: 22,
    borderBottom: "1px solid #e2e8f0",
  },
  sectionTitle: {
    margin: "0 0 10px",
    fontSize: 22,
    lineHeight: 1.2,
    fontWeight: 800,
    color: "#111827",
  },
  bodyText: {
    margin: 0,
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.8,
  },
};
