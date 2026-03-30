"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import {
  BILL_IMAGE_STORAGE_KEY,
  BILL_STORAGE_KEY,
  FILE_NAME_STORAGE_KEY,
} from "@/lib/bill";
import { clearPendingBillPayload, getPendingBillPayload } from "@/lib/client-bill-session";
import type { AnalysisReport } from "@/lib/types";

function readJsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

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

export default function ResultPage() {
  const [billText, setBillText] = useState("");
  const [billImageData, setBillImageData] = useState("");
  const [fileName, setFileName] = useState("medical-bill");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    const pendingPayload = getPendingBillPayload();

    if (pendingPayload) {
      setBillText(pendingPayload.billText);
      setBillImageData(pendingPayload.billImageData);
      setFileName(pendingPayload.fileName || "uploaded-medical-bill");
      clearPendingBillPayload();
      setHasHydrated(true);
      return;
    }

    setBillText(window.sessionStorage.getItem(BILL_STORAGE_KEY) || "");
    setBillImageData(window.sessionStorage.getItem(BILL_IMAGE_STORAGE_KEY) || "");
    setFileName(window.sessionStorage.getItem(FILE_NAME_STORAGE_KEY) || "uploaded-medical-bill");
    setHasHydrated(true);
  }, []);

  async function generateAnalysis(nextBillText = billText, nextBillImageData = billImageData) {
    if (!nextBillText.trim() && !nextBillImageData.trim()) {
      setError("We could not find uploaded bill data for this session. Please upload your file again.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 45000);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          extractedText: nextBillText,
          imageDataUrl: nextBillImageData,
        }),
      });

      window.clearTimeout(timeoutId);

      const payload = await readJsonResponse<{
        report?: AnalysisReport;
        error?: string;
      }>(response);

      if (!response.ok || !payload.report) {
        throw new Error(payload.error || "Unable to generate analysis.");
      }

      setReport(payload.report);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.name === "AbortError"
            ? "Analysis timed out. Please try a clearer image or upload a PDF."
            : analysisError.message
          : "Something went wrong while generating the analysis.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!hasHydrated || hasAutoStarted.current || (!billText.trim() && !billImageData.trim())) {
      return;
    }

    hasAutoStarted.current = true;
    void generateAnalysis(billText, billImageData);
  }, [billImageData, billText, hasHydrated]);

  const concernStyle =
    report?.concern_level.level === "HIGH"
      ? styles.concernHigh
      : report?.concern_level.level === "LOW"
        ? styles.concernLow
        : styles.concernMedium;

  const scriptLines = report ? splitScript(report.call_script) : [];

  return (
    <main style={styles.page}>
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .result-shell {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .result-card {
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
        }

        .result-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
        }

        .result-nav-inner {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .result-nav-links {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }

        @media (max-width: 720px) {
          .result-nav-inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .result-nav-links {
            width: 100%;
            gap: 12px;
          }
        }
      `}</style>

      <header style={styles.navbar}>
        <div className="result-nav-inner">
          <Link href="/" style={styles.logo}>
            InBill
          </Link>
          <nav className="result-nav-links">
            <Link href="/" style={styles.navLink}>
              Back to Home
            </Link>
            <a href="#privacy" style={styles.navLink}>
              Privacy
            </a>
            <a href="mailto:support@inbill.co" style={styles.navLink}>
              Support
            </a>
          </nav>
        </div>
      </header>

      <div className="result-shell" style={styles.container}>
        <section className="result-card" style={styles.heroCard}>
          <div style={styles.heroMetaRow}>
            <div>
              <div style={styles.eyebrow}>Professional audit</div>
              <h1 style={styles.heroTitle}>Your Bill Review</h1>
            </div>
            <div style={styles.fileChip}>{fileName}</div>
          </div>
          <p style={styles.heroSummary}>
            {report?.summary ||
              "We’re reviewing your bill for overcharges, denial issues, and billing mistakes that could cost you money if you pay too quickly."}
          </p>
        </section>

        {error ? <div style={styles.errorCard}>{error}</div> : null}

        {!report ? (
          <section className="result-card" style={styles.loadingCard}>
            <div style={styles.spinner} />
            <div>
              <h2 style={styles.loadingTitle}>Building your audit</h2>
              <p style={styles.loadingText}>
                {isLoading
                  ? "Reviewing charges, looking for billing mistakes, and preparing your action plan..."
                  : "Waiting for bill data to start analysis."}
              </p>
            </div>
          </section>
        ) : null}

        {report ? (
          <section style={styles.reportGrid}>
            <article className="result-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Concern Level</h2>
              <div style={{ ...styles.concernBox, ...concernStyle }}>
                <div style={styles.concernPill}>{report.concern_level.level}</div>
                <div style={styles.concernHeadline}>{getConcernLabel(report.concern_level.level)}</div>
                <p style={styles.concernReason}>{report.concern_level.reason}</p>
              </div>
            </article>

            <article className="result-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Potential Savings</h2>
              <div style={styles.savingsBox}>
                <div style={styles.savingsAmount}>{report.potential_savings.range}</div>
                <p style={styles.savingsReason}>{report.potential_savings.reason}</p>
              </div>
            </article>

            <article className="result-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Key Findings</h2>
              <div style={styles.findingsList}>
                {report.key_findings.map((finding) => (
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

            <article className="result-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Priority Actions</h2>
              <div style={styles.actionList}>
                {report.priority_actions.slice(0, 3).map((item) => (
                  <div key={item} style={styles.actionItem}>
                    <span style={styles.actionIcon}>✔️</span>
                    <span style={styles.actionText}>{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="result-card" style={styles.card}>
              <h2 style={styles.sectionTitle}>Call Script</h2>
              <div style={styles.scriptBox}>
                {scriptLines.length > 0 ? (
                  scriptLines.map((line) => (
                    <p key={line} style={styles.scriptLine}>
                      {line}
                    </p>
                  ))
                ) : (
                  <p style={styles.scriptLine}>{report.call_script}</p>
                )}
              </div>
            </article>

            <article className="result-card" style={styles.riskCard}>
              <h2 style={styles.sectionTitle}>Before You Pay</h2>
              <p style={styles.riskText}>{report.risk_if_ignored}</p>
            </article>
          </section>
        ) : null}

        <section id="privacy" style={styles.privacyFooter}>
          Your uploaded document is processed for analysis and is not intended to be stored long-term by the app.
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
  errorCard: {
    background: "#fff1f2",
    color: "#b42318",
    border: "1px solid #fecdd3",
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
    fontWeight: 600,
  },
  loadingCard: {
    background: "#ffffff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "3px solid #d1fae5",
    borderTopColor: "#059669",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  loadingTitle: {
    margin: "0 0 6px",
    fontSize: 22,
    color: "#111827",
  },
  loadingText: {
    margin: 0,
    color: "#6b7280",
    lineHeight: 1.7,
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
  concernMedium: {
    background: "#fff7ed",
    borderColor: "#fed7aa",
  },
  concernLow: {
    background: "#f0fdf4",
    borderColor: "#bbf7d0",
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
  privacyFooter: {
    marginTop: 24,
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 1.7,
    textAlign: "center",
  },
};
