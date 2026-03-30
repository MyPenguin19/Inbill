"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

const policySections = [
  {
    title: "Overview",
    body: "We take your privacy seriously. This service is designed to process your medical bill securely without storing your documents.",
  },
  {
    title: "What We Collect",
    bullets: ["Uploaded files (temporary)", "Basic technical data"],
  },
  {
    title: "How We Use Data",
    bullets: ["Generate analysis", "Improve service"],
  },
  {
    title: "Data Storage",
    body: "We do not store uploaded medical documents after processing. Files are processed temporarily and not retained.",
  },
  {
    title: "Third-Party Services",
    body: "We use secure third-party services to process analysis requests.",
  },
  {
    title: "Data Sharing",
    body: "We do not sell or share your data.",
  },
  {
    title: "Security",
    body: "We use secure transmission methods.",
  },
  {
    title: "Disclaimer",
    body: "This service is for informational purposes only and does not constitute medical, legal, or financial advice.",
  },
  {
    title: "Contact",
    body: "support@inbill.com",
  },
] as const;

export default function PrivacyPage() {
  return (
    <main style={styles.page}>
      <style jsx global>{`
        .policy-nav {
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

        .policy-nav-links {
          display: flex;
          align-items: center;
          gap: 22px;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          flex-wrap: wrap;
        }

        .policy-nav-link {
          color: inherit;
          text-decoration: none;
        }

        @media (max-width: 760px) {
          .policy-nav {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div style={styles.container}>
        <header className="policy-nav">
          <Link href="/" style={styles.logo}>
            InBill
          </Link>

          <nav className="policy-nav-links" aria-label="Primary">
            <Link className="policy-nav-link" href="/#what-we-find">
              Features
            </Link>
            <Link className="policy-nav-link" href="/#pricing">
              Pricing
            </Link>
            <Link className="policy-nav-link" href="/#about">
              About
            </Link>
            <a className="policy-nav-link" href="mailto:support@inbill.com">
              Contact
            </a>
          </nav>
        </header>

        <section style={styles.heroCard}>
          <div style={styles.eyebrow}>Trust & Privacy</div>
          <h1 style={styles.title}>Privacy Policy</h1>
          <p style={styles.subtitle}>
            This page explains how InBill handles uploaded medical bill information and related technical
            data so you can use the service with more confidence.
          </p>
        </section>

        <section style={styles.contentCard}>
          {policySections.map((section) => (
            <article key={section.title} style={styles.sectionBlock}>
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

        <footer style={styles.footer}>
          <div style={styles.footerBrand}>
            <div style={styles.footerLogo}>InBill</div>
            <p style={styles.footerText}>
              Built to help patients understand medical bills, spot red flags, and prepare before paying.
            </p>
          </div>
          <div style={styles.footerLinks}>
            <Link href="/#what-we-find" style={styles.footerLink}>
              Features
            </Link>
            <Link href="/#pricing" style={styles.footerLink}>
              Pricing
            </Link>
            <Link href="/#about" style={styles.footerLink}>
              About
            </Link>
            <a href="mailto:support@inbill.com" style={styles.footerLink}>
              Contact
            </a>
          </div>
          <div style={styles.footerLegal}>
            <Link href="/privacy" style={styles.footerLegalLink}>
              Privacy
            </Link>
            <span style={styles.footerLegalLink}>Terms</span>
            <span style={styles.footerLegalLink}>Disclaimer</span>
          </div>
        </footer>
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
  logo: {
    fontSize: 22,
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#0f172a",
    textDecoration: "none",
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
  list: {
    margin: 0,
    paddingLeft: 22,
    display: "grid",
    gap: 8,
  },
  listItem: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.8,
  },
  footer: {
    marginTop: 24,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    display: "grid",
    gap: 16,
  },
  footerBrand: {
    display: "grid",
    gap: 8,
  },
  footerLogo: {
    fontSize: 22,
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#0f172a",
  },
  footerText: {
    margin: 0,
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.7,
  },
  footerLinks: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },
  footerLink: {
    color: "#334155",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
  },
  footerLegal: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    paddingTop: 8,
    borderTop: "1px solid #e2e8f0",
  },
  footerLegalLink: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
  },
};
