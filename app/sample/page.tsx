"use client";
import Link from "next/link";
import type { CSSProperties } from "react";

import type { AnalysisReport } from "@/lib/types";

const sampleReport: AnalysisReport = {
  summary:
    "This example bill shows a denied insurance claim with a patient balance that appears overstated. The combination of a denial note, a repeated lab-related charge, and unusually high test pricing is exactly the kind of pattern that leads patients to overpay when they pay too quickly.",
  concern_level: {
    level: "HIGH",
    reason:
      "This sample includes a denied claim, a likely duplicate charge, and pricing that appears higher than commonly expected for routine lab work. Those three patterns together create a strong risk that the patient could pay more than necessary.",
  },
  potential_savings: {
    range: "$100 – $500",
    reason:
      "Savings come from removing duplicate billing, correcting the insurance denial, and challenging inflated lab charges before payment is made.",
  },
  key_findings: [
    {
      title: "Insurance denial needs immediate review",
      impact:
        "Denied claims often shift the full balance to the patient before the payer issue is corrected.",
      action:
        "Ask why the claim was denied, confirm the correct insurance was billed, and request reprocessing before making payment.",
    },
    {
      title: "Possible duplicate lab charge",
      impact:
        "If the same service was billed twice, the patient could pay for a charge that should not be on the bill at all.",
      action:
        "Request an itemized bill and verify whether both charges refer to separate tests or the same CPT code entry.",
    },
    {
      title: "Lab pricing appears unusually high",
      impact:
        "High routine lab pricing can leave the patient paying inflated rates, especially when insurance adjustments have not been applied correctly.",
      action:
        "Ask for the billed amount, the contracted insurance rate, and whether a self-pay or pricing adjustment is available.",
    },
  ],
  priority_actions: [
    "Call insurance and ask why the claim was denied before paying anything.",
    "Request an itemized bill and challenge any repeated or unclear charge lines.",
    "Ask the billing office to review pricing and reprocess the claim if insurance was misapplied.",
  ],
  call_script:
    "Hello, I’m calling about a medical bill that appears to contain errors.\nI need the denied claim reviewed before I make any payment.\nI also want an itemized bill because I see a lab charge that may be duplicated.\nPlease verify whether this CPT code was entered twice and confirm the corrected balance before I pay.",
  risk_if_ignored:
    "If the patient pays immediately, they may lose leverage to dispute the balance, request reprocessing, or challenge duplicate and inflated charges.",
};

const findingImpacts = ["+$180", "+$120", "+$240"] as const;

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
          max-width: 1000px;
          margin: 0 auto;
        }

        .sample-grid-2 {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          gap: 22px;
          align-items: start;
        }

        .sample-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .sample-card {
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .sample-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
        }

        @media (max-width: 900px) {
          .sample-grid-2,
          .sample-grid-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="sample-shell" style={styles.container}>
        <section className="sample-card" style={styles.heroCard}>
          <div style={styles.heroTop}>
            <div>
              <div style={styles.badge}>Sample Report</div>
              <h1 style={styles.heroTitle}>See a Real Medical Bill Analysis</h1>
              <p style={styles.heroSummary}>
                This is exactly what you&apos;ll receive after uploading your bill.
              </p>
            </div>
            <div style={styles.fileChip}>Quest Diagnostics Bill</div>
          </div>
        </section>

        <section className="sample-grid-2" style={styles.dashboardSection}>
          <div style={styles.mainColumn}>
            <article className="sample-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Summary</h2>
              <p style={styles.bodyText}>{sampleReport.summary}</p>
            </article>

            <article className="sample-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Key Findings</h2>
              <div style={styles.findingsList}>
                {sampleReport.key_findings.map((finding, index) => (
                  <div key={finding.title} style={styles.findingCard}>
                    <div style={styles.findingHeader}>
                      <span style={styles.findingIcon}>⚠️</span>
                      <div>
                        <h3 style={styles.findingTitle}>{finding.title}</h3>
                        <div style={styles.findingImpactTag}>{findingImpacts[index]}</div>
                      </div>
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
              <div style={styles.scriptHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>What You&apos;ll Say When You Call</h2>
                  <p style={styles.scriptNote}>Use this script to challenge charges before paying.</p>
                </div>
              </div>
              <div style={styles.scriptBox}>
                {scriptLines.map((line) => (
                  <p key={line} style={styles.scriptLine}>
                    {line}
                  </p>
                ))}
              </div>
            </article>
          </div>

          <div style={styles.sidebarColumn}>
            <article className="sample-card" style={styles.savingsCard}>
              <div style={styles.savingsLabel}>Potential Overpayment</div>
              <div style={styles.savingsValue}>Up to $500 in Potential Overpayment</div>
              <p style={styles.savingsText}>Based on detected billing issues in this sample.</p>
            </article>

            <article className="sample-card" style={styles.whyCard}>
              <h2 style={styles.sectionTitle}>Why This Matters</h2>
              <p style={styles.bodyText}>
                Medical bills often contain errors. Without reviewing them, you could overpay or miss the opportunity to dispute incorrect charges.
              </p>
            </article>

            <article className="sample-card" style={styles.concernCard}>
              <h2 style={styles.sectionTitle}>Concern Level</h2>
              <div style={styles.concernBox}>
                <div style={styles.concernPill}>{sampleReport.concern_level.level}</div>
                <div style={styles.concernHeadline}>{getConcernLabel(sampleReport.concern_level.level)}</div>
                <p style={styles.concernReason}>{sampleReport.concern_level.reason}</p>
              </div>
            </article>

            <article className="sample-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Recommended Next Steps</h2>
              <div style={styles.actionList}>
                {sampleReport.priority_actions.map((item) => (
                  <div key={item} style={styles.actionItem}>
                    <span style={styles.actionIcon}>✔️</span>
                    <span style={styles.actionText}>{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="sample-card" style={styles.proofCard}>
              <div style={styles.proofValue}>Most users find errors in their bill</div>
              <div style={styles.proofText}>Common savings: $100–$400</div>
            </article>
          </div>
        </section>

        <section className="sample-card" style={styles.warningCard}>
          <div style={styles.warningTitle}>⚠️ Most bills go unchecked — and people overpay.</div>
        </section>

        <section className="sample-card" style={styles.ctaCard}>
          <h2 style={styles.ctaTitle}>Check Your Own Bill Before You Pay</h2>
          <p style={styles.ctaText}>Takes 60 seconds. Could save you hundreds.</p>
          <Link href="/#analyze" style={styles.ctaButton}>
            Fix My Bill — $4.99
          </Link>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    padding: "48px 16px 64px",
  },
  container: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto",
  },
  dashboardSection: {
    marginTop: 22,
  },
  mainColumn: {
    display: "grid",
    gap: 18,
  },
  sidebarColumn: {
    display: "grid",
    gap: 18,
  },
  heroCard: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "20px",
    border: "1px solid #d9e0e7",
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 10px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  heroTitle: {
    margin: "0 0 10px",
    fontSize: "clamp(2rem, 4vw, 2.8rem)",
    lineHeight: 1,
    letterSpacing: "-0.04em",
    color: "#111827",
    fontWeight: 900,
  },
  heroSummary: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.75,
    color: "#4b5563",
    fontWeight: 500,
  },
  fileChip: {
    background: "#f3f4f6",
    color: "#374151",
    padding: "10px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
  },
  card: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "18px",
    border: "1px solid #d9e0e7",
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  savingsCard: {
    background: "linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)",
    borderRadius: 12,
    padding: "20px",
    border: "1px solid #86efac",
    boxShadow: "0 18px 30px rgba(22, 163, 74, 0.12)",
  },
  savingsLabel: {
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  savingsValue: {
    color: "#0f172a",
    fontSize: "clamp(2.2rem, 5vw, 3rem)",
    lineHeight: 0.95,
    fontWeight: 900,
    letterSpacing: "-0.05em",
    marginBottom: 12,
  },
  savingsText: {
    margin: 0,
    color: "#166534",
    fontSize: 14,
    lineHeight: 1.7,
    fontWeight: 700,
  },
  whyCard: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "18px",
    border: "1px solid #d9e0e7",
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  concernCard: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "18px",
    border: "1px solid #d9e0e7",
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  sectionTitle: {
    margin: "0 0 16px",
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 900,
    color: "#111827",
    letterSpacing: "-0.03em",
  },
  bodyText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.8,
    color: "#334155",
  },
  concernBox: {
    borderRadius: 12,
    padding: 18,
    border: "1px solid #fecaca",
    background: "#fef2f2",
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
    color: "#991b1b",
  },
  concernHeadline: {
    fontSize: 24,
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    color: "#991b1b",
    marginBottom: 10,
  },
  concernReason: {
    margin: 0,
    color: "#7f1d1d",
    lineHeight: 1.75,
    fontSize: 14,
    fontWeight: 500,
  },
  findingsList: {
    display: "grid",
    gap: 14,
  },
  findingCard: {
    background: "#fff8f8",
    border: "1px solid #f3c0c0",
    borderRadius: 12,
    padding: 16,
  },
  findingHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  findingIcon: {
    fontSize: 18,
    lineHeight: 1,
    marginTop: 2,
  },
  findingTitle: {
    margin: "0 0 6px",
    fontSize: 17,
    lineHeight: 1.25,
    fontWeight: 900,
    color: "#991b1b",
  },
  findingImpactTag: {
    color: "#b42318",
    fontSize: 14,
    fontWeight: 800,
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
    fontSize: 14,
    fontWeight: 500,
  },
  findingAction: {
    margin: 0,
    color: "#111827",
    lineHeight: 1.75,
    fontSize: 14,
    fontWeight: 700,
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
    border: "1px solid #e5e7eb",
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
    fontSize: 14,
    fontWeight: 600,
  },
  scriptHeader: {
    marginBottom: 14,
  },
  scriptNote: {
    margin: "-6px 0 0",
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  scriptBox: {
    background: "#f3f4f6",
    borderRadius: 12,
    padding: 14,
    border: "1px solid #e5e7eb",
  },
  scriptLine: {
    margin: "0 0 10px",
    color: "#111827",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.85,
  },
  proofCard: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "20px 22px",
    border: "1px solid #d9e0e7",
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  proofValue: {
    color: "#0f172a",
    fontSize: 17,
    lineHeight: 1.4,
    fontWeight: 800,
    marginBottom: 6,
  },
  proofText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  warningCard: {
    background: "#fff7ed",
    borderRadius: 12,
    padding: "18px 22px",
    border: "1px solid #fdba74",
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
    marginTop: 18,
  },
  warningTitle: {
    color: "#9a3412",
    fontSize: 18,
    lineHeight: 1.5,
    fontWeight: 900,
  },
  ctaCard: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "22px 20px",
    border: "1px solid #d9e0e7",
    boxShadow: "0 14px 28px rgba(15,23,42,0.05)",
    marginTop: 18,
    textAlign: "center",
  },
  ctaTitle: {
    margin: "0 0 8px",
    fontSize: 26,
    lineHeight: 1.08,
    fontWeight: 900,
    color: "#111827",
    letterSpacing: "-0.03em",
  },
  ctaText: {
    margin: "0 0 18px",
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  ctaButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: "#0f7757",
    color: "#ffffff",
    padding: "14px 22px",
    fontSize: 15,
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 12px 24px rgba(15, 118, 110, 0.18)",
    border: "1px solid #0b6a4d",
  },
};
