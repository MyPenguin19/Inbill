"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

const pricingFeatures = [
  {
    title: "Plain-English Summary",
    description: "Understand what the bill is for and why the balance may be higher than expected.",
  },
  {
    title: "Billing Issue Detection",
    description: "Spot likely problems like duplicate charges, denial issues, or unclear pricing.",
  },
  {
    title: "Potential Savings Estimate",
    description: "See where savings may be available before you pay the balance too quickly.",
  },
  {
    title: "Call Script",
    description: "Get a ready-to-use script for speaking with billing or insurance with confidence.",
  },
  {
    title: "Action Plan",
    description: "Know the next steps to take first so you can challenge the right issue fast.",
  },
] as const;

const valuePoints = [
  "Billing errors can cost $50–$500+",
  "Helps avoid overpaying",
  "Pays for itself if you catch one issue",
] as const;

const trustPoints = ["No file storage", "Secure processing", "No sharing"] as const;

export default function PricingPage() {
  return (
    <main style={styles.page}>
      <style jsx global>{`
        .pricing-nav {
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

        .pricing-nav-links {
          display: flex;
          align-items: center;
          gap: 22px;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          flex-wrap: wrap;
        }

        .pricing-nav-link {
          color: inherit;
          text-decoration: none;
        }

        .pricing-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        @media (max-width: 760px) {
          .pricing-nav {
            align-items: flex-start;
            flex-direction: column;
          }

          .pricing-grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={styles.container}>
        <section style={styles.heroCard}>
          <div style={styles.eyebrow}>Simple pricing</div>
          <h1 style={styles.title}>Simple, transparent pricing</h1>
          <p style={styles.subtitle}>One-time payment. No subscription. No hidden fees.</p>
        </section>

        <section style={styles.section}>
          <div style={styles.pricingCard}>
            <div style={styles.pricingLabel}>Single report</div>
            <div style={styles.price}>$4.99 / report</div>
            <div style={styles.priceList}>
              <div style={styles.priceListItem}>• One-time payment</div>
              <div style={styles.priceListItem}>• No account required</div>
              <div style={styles.priceListItem}>• Instant results</div>
            </div>
            <Link href="/#analyze" style={styles.ctaButton}>
              Analyze My Bill
            </Link>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>What You Get</h2>
          </div>
          <div className="pricing-grid-2">
            {pricingFeatures.map((item) => (
              <article key={item.title} style={styles.infoCard}>
                <h3 style={styles.infoTitle}>{item.title}</h3>
                <p style={styles.infoText}>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.valueCard}>
            <h2 style={styles.sectionTitle}>Why $4.99 is worth it</h2>
            <div style={styles.valueList}>
              {valuePoints.map((item) => (
                <div key={item} style={styles.valueItem}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.trustCard}>
            <h2 style={styles.sectionTitle}>Your data stays private</h2>
            <div style={styles.valueList}>
              {trustPoints.map((item) => (
                <div key={item} style={styles.valueItem}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.disclaimerSection}>
          <div style={styles.disclaimerCard}>
            This service is for informational purposes only and does not constitute medical, legal, or
            financial advice.
          </div>
        </section>

        <section style={styles.finalCtaSection}>
          <div style={styles.finalCtaCard}>
            <h2 style={styles.finalCtaTitle}>Get your analysis in under 60 seconds</h2>
            <Link href="/#analyze" style={styles.finalCtaButton}>
              Analyze My Bill
            </Link>
            <p style={styles.finalCtaText}>One-time $4.99 • No account required</p>
          </div>
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
    textAlign: "center",
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
  section: {
    marginTop: 28,
  },
  pricingCard: {
    maxWidth: 420,
    margin: "0 auto",
    background: "#ffffff",
    border: "1px solid #d1fae5",
    borderRadius: 12,
    padding: "28px 24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    textAlign: "center",
  },
  pricingLabel: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 10,
  },
  price: {
    fontSize: "clamp(3rem, 10vw, 4.5rem)",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.06em",
    color: "#0f172a",
    marginBottom: 14,
  },
  priceList: {
    display: "grid",
    gap: 8,
    marginBottom: 18,
  },
  priceListItem: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  ctaButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    background: "#0f766e",
    color: "#ffffff",
    padding: "16px 22px",
    fontSize: 16,
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 8px 18px rgba(15, 118, 110, 0.18)",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  infoCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  infoTitle: {
    margin: "0 0 8px",
    fontSize: 18,
    lineHeight: 1.3,
    fontWeight: 700,
  },
  infoText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.7,
    fontSize: 15,
  },
  valueCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  trustCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  valueList: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  valueItem: {
    color: "#334155",
    fontSize: 16,
    lineHeight: 1.7,
    fontWeight: 600,
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
    marginTop: 28,
  },
  finalCtaCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    textAlign: "center",
  },
  finalCtaTitle: {
    margin: "0 0 14px",
    fontSize: 26,
    lineHeight: 1.15,
    fontWeight: 800,
  },
  finalCtaButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    background: "#0f766e",
    color: "#ffffff",
    padding: "16px 22px",
    fontSize: 16,
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 8px 18px rgba(15, 118, 110, 0.18)",
  },
  finalCtaText: {
    margin: "14px 0 0",
    color: "#475569",
    fontSize: 16,
    lineHeight: 1.7,
    fontWeight: 600,
  },
};
