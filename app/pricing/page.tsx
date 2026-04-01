"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

const pricingFeatures = [
  "Full bill analysis",
  "Detect errors & overcharges",
  "Exact steps to fix issues",
  "Call script included",
] as const;

const offerDetails = [
  {
    title: "Plain-English Summary",
    description: "Understand what the bill says and where the balance may be inflated.",
  },
  {
    title: "Billing Issue Detection",
    description: "Catch duplicate charges, denial problems, and suspicious pricing fast.",
  },
  {
    title: "Potential Savings Estimate",
    description: "See where money may be recoverable before you pay too quickly.",
  },
  {
    title: "Action Plan",
    description: "Know exactly what to challenge and in what order.",
  },
] as const;

const trustPoints = [
  "No account required",
  "Files automatically deleted",
  "No data stored",
  "Secure processing",
] as const;

const valueComparison = [
  {
    label: "Medical billing advocate",
    value: "$100–$300",
    detail: "Professional help can be useful, but it costs much more upfront.",
  },
  {
    label: "Manual review",
    value: "Hours of effort",
    detail: "You still have to decode the bill, call providers, and figure out what matters.",
  },
  {
    label: "This tool",
    value: "$4.99 in 60 seconds",
    detail: "Fast review, clear next steps, and a script before you pay anything.",
  },
] as const;

export default function PricingPage() {
  return (
    <main style={styles.page}>
      <style jsx global>{`
        .pricing-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .pricing-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .pricing-card {
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .pricing-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 32px rgba(15, 23, 42, 0.08);
        }

        @media (max-width: 860px) {
          .pricing-grid-2,
          .pricing-grid-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={styles.container}>
        <section className="pricing-card" style={styles.heroCard}>
          <div style={styles.badge}>One-time payment</div>
          <h1 style={styles.title}>Check Your Medical Bill Before You Pay It</h1>
          <p style={styles.subtitle}>
            Most medical bills contain errors. This takes 60 seconds and could save you hundreds.
          </p>
        </section>

        <section style={styles.section}>
          <div className="pricing-card" style={styles.pricingCard}>
            <div style={styles.pricingTopLine}>One-time payment</div>
            <div style={styles.price}>$4.99 per analysis</div>

            <div style={styles.featureList}>
              {pricingFeatures.map((item) => (
                <div key={item} style={styles.featureItem}>
                  <span style={styles.check}>✔</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <Link href="/#analyze" style={styles.ctaButton}>
              Analyze My Bill — $4.99
            </Link>

            <p style={styles.riskReversal}>
              If no issues are found, you still get a full report explaining your bill.
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Why This Is Worth It</h2>
          </div>

          <div className="pricing-grid-3">
            {valueComparison.map((item) => (
              <article key={item.label} className="pricing-card" style={styles.valueCard}>
                <div style={styles.valueLabel}>{item.label}</div>
                <div style={styles.valueNumber}>{item.value}</div>
                <p style={styles.valueText}>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div className="pricing-card" style={styles.savingsAnchorCard}>
            <div style={styles.savingsAnchorLabel}>Savings Anchor</div>
            <div style={styles.savingsAnchorValue}>Most users find $100–$400 in potential errors</div>
            <p style={styles.savingsAnchorText}>Average detected issue: duplicate charges or denied claims.</p>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>What You Get</h2>
          </div>

          <div className="pricing-grid-2">
            {offerDetails.map((item) => (
              <article key={item.title} className="pricing-card" style={styles.infoCard}>
                <h3 style={styles.infoTitle}>{item.title}</h3>
                <p style={styles.infoText}>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div className="pricing-card" style={styles.trustCard}>
            <h2 style={styles.sectionTitle}>Safe and Private</h2>
            <div className="pricing-grid-2">
              {trustPoints.map((item) => (
                <div key={item} style={styles.trustItem}>
                  <span style={styles.trustCheck}>✔</span>
                  <span style={styles.trustText}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.urgencySection}>
          <div style={styles.urgencyLine}>Most people never review their bill — and overpay.</div>
        </section>

        <section style={styles.disclaimerSection}>
          <div style={styles.disclaimerCard}>
            This service is for informational purposes only and does not constitute medical, legal, or financial advice.
          </div>
        </section>

        <section style={styles.finalCtaSection}>
          <div className="pricing-card" style={styles.finalCtaCard}>
            <h2 style={styles.finalCtaTitle}>Don’t Pay Your Bill Blind</h2>
            <p style={styles.finalCtaText}>Check it first. Takes 60 seconds.</p>
            <Link href="/#analyze" style={styles.finalCtaButton}>
              Analyze My Bill — $4.99
            </Link>
          </div>
        </section>
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
    maxWidth: 1120,
    margin: "0 auto",
  },
  heroCard: {
    background: "#ffffff",
    border: "1px solid #d9e0e7",
    borderRadius: 12,
    padding: "30px 28px",
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
    textAlign: "center",
  },
  badge: {
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
    margin: "0 0 12px",
    fontSize: "clamp(2.4rem, 5vw, 4rem)",
    lineHeight: 0.98,
    letterSpacing: "-0.05em",
    fontWeight: 900,
  },
  subtitle: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.7,
    color: "#475569",
    fontWeight: 500,
  },
  section: {
    marginTop: 32,
  },
  pricingCard: {
    maxWidth: 700,
    margin: "0 auto",
    background: "#ffffff",
    border: "1px solid #86efac",
    borderRadius: 14,
    padding: "34px 30px",
    boxShadow: "0 22px 34px rgba(22,163,74,0.12)",
    textAlign: "center",
  },
  pricingTopLine: {
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  price: {
    fontSize: "clamp(3.4rem, 9vw, 5rem)",
    lineHeight: 0.95,
    fontWeight: 900,
    letterSpacing: "-0.06em",
    color: "#0f172a",
    marginBottom: 18,
  },
  featureList: {
    display: "grid",
    gap: 10,
    maxWidth: 360,
    margin: "0 auto 22px",
    textAlign: "left",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#334155",
    fontSize: 16,
    lineHeight: 1.6,
    fontWeight: 700,
  },
  check: {
    color: "#0f7757",
    fontWeight: 900,
  },
  ctaButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 280,
    borderRadius: 10,
    background: "#0f7757",
    color: "#ffffff",
    padding: "18px 28px",
    fontSize: 17,
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 14px 26px rgba(15, 118, 110, 0.2)",
    border: "1px solid #0b6a4d",
  },
  riskReversal: {
    margin: "16px auto 0",
    maxWidth: 520,
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.75,
    fontWeight: 600,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: "-0.03em",
  },
  valueCard: {
    background: "#ffffff",
    border: "1px solid #d9e0e7",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  valueLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  valueNumber: {
    color: "#0f172a",
    fontSize: 32,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    marginBottom: 10,
  },
  valueText: {
    margin: 0,
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.75,
    fontWeight: 500,
  },
  savingsAnchorCard: {
    background: "#ffffff",
    border: "1px solid #d9e0e7",
    borderRadius: 12,
    padding: "24px 26px",
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
    textAlign: "center",
  },
  savingsAnchorLabel: {
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  savingsAnchorValue: {
    color: "#0f172a",
    fontSize: "clamp(2rem, 5vw, 3.1rem)",
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    marginBottom: 10,
  },
  savingsAnchorText: {
    margin: 0,
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  infoCard: {
    background: "#ffffff",
    border: "1px solid #d9e0e7",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  infoTitle: {
    margin: "0 0 8px",
    fontSize: 19,
    lineHeight: 1.25,
    fontWeight: 800,
  },
  infoText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.75,
    fontSize: 15,
  },
  trustCard: {
    background: "#ffffff",
    border: "1px solid #d9e0e7",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
  },
  trustCheck: {
    color: "#0f7757",
    fontWeight: 900,
  },
  trustText: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 1.6,
    fontWeight: 700,
  },
  urgencySection: {
    marginTop: 20,
  },
  urgencyLine: {
    textAlign: "center",
    color: "#9a3412",
    fontSize: 15,
    lineHeight: 1.7,
    fontWeight: 700,
  },
  disclaimerSection: {
    marginTop: 20,
  },
  disclaimerCard: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 12,
    padding: 18,
    color: "#7c2d12",
    fontSize: 14,
    lineHeight: 1.8,
    fontWeight: 600,
  },
  finalCtaSection: {
    marginTop: 30,
  },
  finalCtaCard: {
    background: "#ffffff",
    border: "1px solid #d9e0e7",
    borderRadius: 12,
    padding: 28,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
    textAlign: "center",
  },
  finalCtaTitle: {
    margin: "0 0 8px",
    fontSize: 32,
    lineHeight: 1.08,
    fontWeight: 900,
    letterSpacing: "-0.03em",
  },
  finalCtaButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: "#0f7757",
    color: "#ffffff",
    padding: "16px 24px",
    fontSize: 16,
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 12px 24px rgba(15, 118, 110, 0.18)",
    border: "1px solid #0b6a4d",
  },
  finalCtaText: {
    margin: "0 0 18px",
    color: "#475569",
    fontSize: 16,
    lineHeight: 1.7,
    fontWeight: 600,
  },
};
