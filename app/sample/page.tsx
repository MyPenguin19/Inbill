"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { AnalysisReport } from "@/lib/types";

const sampleReport: AnalysisReport = {
  summary:
    "This example bill shows a denied insurance claim with a patient balance that may be overstated. The combination of a denial note, a repeated lab-related charge, and unusually high test pricing is exactly the kind of pattern that can lead patients to overpay if they pay too quickly.",
  concern_level: {
    level: "HIGH",
    reason:
      "This sample includes a denied claim, a likely duplicate charge, and pricing that appears higher than commonly expected for routine lab work. Those three patterns together create a strong risk that the patient could pay more than necessary.",
  },
  potential_savings: {
    range: "$100 – $500",
    reason:
      "Savings may come from removing duplicate billing, correcting the insurance denial, and requesting pricing review or reprocessing on the highest-cost lab items.",
  },
  key_findings: [
    {
      title: "Insurance denial needs immediate review",
      impact:
        "Denied claims are one of the most common reasons patients overpay because the bill shifts the full balance to the patient before the payer issue is fixed.",
      action:
        "Ask why the claim was denied, confirm whether the correct insurance was billed, and request reprocessing before making payment.",
    },
    {
      title: "Possible duplicate lab charge",
      impact:
        "If the same service was billed twice, the patient could pay for a charge that should not be on the bill at all.",
      action:
        "Request an itemized bill and confirm whether both charges refer to separate tests or the same service date.",
    },
    {
      title: "Lab pricing appears unusually high",
      impact:
        "High routine lab pricing can leave the patient paying inflated rates, especially when insurance adjustments have not been applied correctly.",
      action:
        "Ask for the billed amount, any contracted insurance rate, and whether a self-pay reduction or pricing adjustment is available.",
    },
  ],
  priority_actions: [
    "Call insurance and ask why the claim was denied before paying anything.",
    "Request an itemized bill and challenge any repeated or unclear charge lines.",
    "Ask the billing office to review pricing and reprocess the claim if insurance was misapplied.",
  ],
  call_script:
    "Hi, I’m calling about a medical bill showing a balance I may not actually owe in full.\nThe bill includes a denied insurance claim, and I need that reviewed before I make any payment.\nI also want an itemized bill because I see a charge that may be duplicated and lab pricing that looks unusually high.\nPlease review this account for duplicate billing, insurance reprocessing, and any available adjustment or reduction.\nI’d like confirmation of the corrected balance before I pay anything.",
  risk_if_ignored:
    "If you pay immediately, you may lose leverage to dispute the balance, push for reprocessing, or challenge duplicate and inflated charges. Paying first can make it much harder to recover money later.",
};

function splitScript(script: string) {
  return script
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getConcernLabel(level: AnalysisReport["concern_level"]["level"]) {
  if (level === "HIGH") {
    return "High Risk of Overpayment";
  }

  if (level === "LOW") {
    return "Low Immediate Risk";
  }

  return "Medium Risk of Overpayment";
}

export default function SamplePage() {
  const scriptLines = splitScript(sampleReport.call_script);

  return (
    <main style={styles.page}>
      <style jsx global>{`
        .sample-shell {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .sample-card {
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
        }

        .sample-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
        }

        .sample-nav-inner {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .sample-nav-links {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }

        @media (max-width: 720px) {
          .sample-nav-inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .sample-nav-links {
            width: 100%;
            gap: 12px;
          }
        }
      `}</style>

      <header style={styles.navbar}>
        <div className="sample-nav-inner">
          <Link href="/" style={styles.logo}>
            InBill
          </Link>
          <nav className="sample-nav-links">
            <Link href="/" style={styles.navLink}>
              Back to Home
            </Link>
            <Link href="/privacy" style={styles.navLink}>
              Privacy
            </Link>
            <a href="mailto:support@inbill.com" style={styles.navLink}>
              Support
            </a>
          </nav>
        </div>
      </header>

      <div className="sample-shell" style={styles.container}>
        <section className="sample-card" style={styles.heroCard}>
          <div style={styles.heroMetaRow}>
            <div>
              <div style={styles.eyebrow}>Example analysis</div>
              <h1 style={styles.heroTitle}>See a Real Medical Bill Analysis</h1>
            </div>
            <div style={styles.fileChip}>Quest Diagnostics Bill</div>
          </div>
          <p style={styles.heroSummary}>
            This is exactly what you’ll receive after upload — no guesswork.
          </p>
        </section>

        <section style={styles.reportGrid}>
          <article className="sample-card" style={styles.card}>
            <h2 style={styles.sectionTitle}>Summary</h2>
            <p style={styles.heroSummary}>{sampleReport.summary}</p>
          </article>

          <article className="sample-card" style={styles.card}>
            <h2 style={styles.sectionTitle}>Concern Level</h2>
            <div style={{ ...styles.concernBox, ...styles.concernHigh }}>
              <div style={styles.concernPill}>{sampleReport.concern_level.level}</div>
              <div style={styles.concernHeadline}>{getConcernLabel(sampleReport.concern_level.level)}</div>
              <p style={styles.concernReason}>{sampleReport.concern_level.reason}</p>
            </div>
          </article>

          <article className="sample-card" style={styles.card}>
            <h2 style={styles.sectionTitle}>Potential Savings</h2>
            <div style={styles.savingsBox}>
              <div style={styles.savingsAmount}>{sampleReport.potential_savings.range}</div>
              <p style={styles.savingsReason}>{sampleReport.potential_savings.reason}</p>
            </div>
          </article>

          <article className="sample-card" style={styles.card}>
            <h2 style={styles.sectionTitle}>Key Findings</h2>
            <div style={styles.findingsList}>
              {sampleReport.key_findings.map((finding) => (
                <div key={finding.title} style={styles.findingCard}>
                  <div style={styles.findingHeader}>
                    <span style={styles.findingIcon}>⚠️</span>
                    <h3 style={styles.findingTitle}>{finding.title}</h3>
                  </div>
                  <div style={styles.findingBlock}>
                    <div style={styles.findingLabel}>Impact</div>
                    <p style={styles.findingText}>{finding.impact}</p>
                  </div>
                  <div style={styles.findingBlock}>
                    <div style={styles.findingLabel}>Action</div>
                    <p style={styles.findingAction}>{finding.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="sample-card" style={styles.card}>
            <h2 style={styles.sectionTitle}>Priority Actions</h2>
            <div style={styles.actionList}>
              {sampleReport.priority_actions.map((item) => (
                <div key={item} style={styles.actionItem}>
                  <span style={styles.actionIcon}>✔️</span>
                  <span style={styles.actionText}>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="sample-card" style={styles.card}>
            <h2 style={styles.sectionTitle}>Call Script</h2>
            <div style={styles.scriptBox}>
              {scriptLines.map((line) => (
                <p key={line} style={styles.scriptLine}>
                  {line}
                </p>
              ))}
            </div>
          </article>

          <article className="sample-card" style={styles.riskCard}>
            <h2 style={styles.sectionTitle}>Risk Warning</h2>
            <p style={styles.riskText}>{sampleReport.risk_if_ignored}</p>
          </article>
        </section>

        <section className="sample-card" style={styles.ctaCard}>
          <h2 style={styles.ctaTitle}>Get Your Own Analysis</h2>
          <p style={styles.ctaText}>No account required • One-time $4.99</p>
          <Link href="/#analyze" style={styles.ctaButton}>
            Analyze My Bill
          </Link>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f9fafb",
    padding: "96px 16px 64px",
  },
  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
    padding: "16px",
    marginBottom: 24,
  },
  container: {
    width: "100%",
    maxWidth: 900,
    margin: "0 auto",
  },
  logo: {
    color: "#111827",
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    textDecoration: "none",
  },
  navLink: {
    color: "#4b5563",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
  },
  heroCard: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginBottom: 24,
  },
  heroMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  eyebrow: {
    color: "#059669",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(2rem, 5vw, 2.6rem)",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    color: "#111827",
  },
  fileChip: {
    background: "#f3f4f6",
    color: "#374151",
    padding: "10px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
  },
  heroSummary: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.75,
    color: "#4b5563",
  },
  reportGrid: {
    display: "grid",
    gap: 20,
  },
  card: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  riskCard: {
    background: "#fff7ed",
    borderRadius: 12,
    padding: "24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    borderLeft: "4px solid #f97316",
  },
  sectionTitle: {
    margin: "0 0 16px",
    fontSize: 24,
    lineHeight: 1.2,
    fontWeight: 800,
    color: "#111827",
  },
  concernBox: {
    borderRadius: 12,
    padding: 20,
    border: "1px solid #e5e7eb",
  },
  concernHigh: {
    background: "#fef2f2",
    borderColor: "#fecaca",
  },
  concernPill: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  concernHeadline: {
    fontSize: 34,
    lineHeight: 1.05,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "#111827",
    marginBottom: 10,
  },
  concernReason: {
    margin: 0,
    color: "#374151",
    lineHeight: 1.75,
    fontSize: 15,
  },
  savingsBox: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 12,
    padding: 20,
  },
  savingsAmount: {
    fontSize: 40,
    lineHeight: 1,
    fontWeight: 900,
    color: "#047857",
    letterSpacing: "-0.05em",
    marginBottom: 12,
  },
  savingsReason: {
    margin: 0,
    color: "#374151",
    lineHeight: 1.75,
    fontSize: 15,
  },
  findingsList: {
    display: "grid",
    gap: 14,
  },
  findingCard: {
    background: "#fffafa",
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: 18,
  },
  findingHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  findingIcon: {
    fontSize: 18,
    lineHeight: 1,
  },
  findingTitle: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.3,
    fontWeight: 800,
    color: "#991b1b",
  },
  findingBlock: {
    marginTop: 10,
  },
  findingLabel: {
    marginBottom: 4,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#6b7280",
  },
  findingText: {
    margin: 0,
    color: "#374151",
    lineHeight: 1.75,
    fontSize: 15,
  },
  findingAction: {
    margin: 0,
    color: "#111827",
    lineHeight: 1.75,
    fontSize: 15,
    fontWeight: 600,
  },
  actionList: {
    display: "grid",
    gap: 12,
  },
  actionItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    background: "#f9fafb",
    borderRadius: 12,
    padding: "14px 16px",
  },
  actionIcon: {
    flexShrink: 0,
    lineHeight: 1.5,
  },
  actionText: {
    color: "#374151",
    lineHeight: 1.7,
    fontSize: 15,
    fontWeight: 600,
  },
  scriptBox: {
    background: "#f3f4f6",
    borderRadius: 12,
    padding: 18,
    border: "1px solid #e5e7eb",
  },
  scriptLine: {
    margin: "0 0 10px",
    color: "#111827",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.85,
  },
  riskText: {
    margin: 0,
    color: "#7c2d12",
    fontSize: 15,
    lineHeight: 1.8,
    fontWeight: 600,
  },
  ctaCard: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "28px 24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginTop: 24,
    textAlign: "center",
  },
  ctaTitle: {
    margin: "0 0 8px",
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#111827",
  },
  ctaText: {
    margin: "0 0 18px",
    color: "#475569",
    fontSize: 16,
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
};
