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

        .report-shell {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
        }

        .report-topbar {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .report-card {
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
        }

        .report-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }

        @media (max-width: 640px) {
          .report-shell {
            max-width: 100%;
          }

          .report-topbar {
            align-items: stretch;
          }

          .report-topbar > * {
            width: 100%;
          }
        }
      `}</style>

      <div className="report-shell" style={styles.container}>
        <div className="report-topbar" style={styles.topbar}>
          <Link href="/" style={styles.backLink}>
            Back to Home
          </Link>
          <a href="mailto:support@inbill.co" style={styles.topLink}>
            Support
          </a>
          <a href="#privacy" style={styles.topLink}>
            Privacy
          </a>
        </div>

        <section className="report-card" style={styles.heroCard}>
          <div style={styles.heroBadge}>Premium Report</div>
          <h1 style={styles.heroTitle}>Your bill analysis</h1>
          <p style={styles.heroText}>
            Reviewing <strong>{fileName}</strong>. This report is designed to help you spot money-losing billing
            issues before you pay.
          </p>
        </section>

        {error ? <div style={styles.errorCard}>{error}</div> : null}

        {!report ? (
          <section className="report-card" style={styles.loadingCard}>
            <div style={styles.spinner} />
            <div>
              <h2 style={styles.loadingTitle}>Analysis workspace</h2>
              <p style={styles.loadingText}>
                {isLoading ? "Reviewing your uploaded bill and building your action plan..." : "Waiting for bill data to start analysis."}
              </p>
            </div>
          </section>
        ) : null}

        {report ? (
          <section style={styles.reportGrid}>
            <article className="report-card" style={styles.card}>
              <h2 style={styles.cardTitle}>📝 Summary</h2>
              <p style={styles.paragraph}>{report.summary}</p>
            </article>

            <article className="report-card" style={styles.card}>
              <h2 style={styles.cardTitle}>⏰ Should You Be Concerned?</h2>
              <div style={{ ...styles.concernBox, ...concernStyle }}>
                <div style={styles.concernLevel}>{report.concern_level.level}</div>
                <p style={styles.concernText}>{report.concern_level.reason}</p>
              </div>
            </article>

            <article className="report-card" style={styles.card}>
              <h2 style={styles.cardTitle}>💸 Potential Savings</h2>
              <div style={styles.savingsBox}>
                <div style={styles.savingsRange}>{report.potential_savings.range}</div>
                <p style={styles.savingsReason}>{report.potential_savings.reason}</p>
              </div>
            </article>

            <article className="report-card" style={styles.issueCard}>
              <h2 style={styles.cardTitle}>🚨 Key Findings</h2>
              <div style={styles.findingsList}>
                {report.key_findings.map((finding) => (
                  <div key={finding.title} style={styles.findingItem}>
                    <h3 style={styles.findingTitle}>{finding.title}</h3>
                    <p style={styles.findingLabel}>Why it matters</p>
                    <p style={styles.findingText}>{finding.impact}</p>
                    <p style={styles.findingLabel}>What to do</p>
                    <p style={styles.findingAction}>{finding.action}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="report-card" style={styles.card}>
              <h2 style={styles.cardTitle}>✅ Priority Actions</h2>
              <div style={styles.checklist}>
                {report.priority_actions.map((item) => (
                  <div key={item} style={styles.checkItem}>
                    <span style={styles.checkIcon}>✔️</span>
                    <span style={styles.checkText}>{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="report-card" style={styles.card}>
              <h2 style={styles.cardTitle}>📞 Call Script</h2>
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

            <article className="report-card" style={styles.payNowCard}>
              <h2 style={styles.cardTitle}>🛑 If You Pay Now</h2>
              <p style={styles.payNowText}>{report.risk_if_ignored}</p>
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
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    padding: "40px 16px 72px",
  },
  container: {
    width: "100%",
    maxWidth: 820,
    margin: "0 auto",
  },
  topbar: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  backLink: {
    color: "#475569",
    fontWeight: 700,
    textDecoration: "none",
    fontSize: 14,
  },
  topLink: {
    color: "#64748b",
    fontWeight: 600,
    textDecoration: "none",
    fontSize: 14,
  },
  heroCard: {
    background: "#ffffff",
    borderRadius: 16,
    padding: "28px 24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginBottom: 24,
  },
  heroBadge: {
    display: "inline-block",
    background: "#e6fffb",
    color: "#0f766e",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  heroTitle: {
    margin: "0 0 10px",
    fontSize: "clamp(2rem, 5vw, 3rem)",
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },
  heroText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.7,
    fontSize: 16,
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
    border: "3px solid #ccfbf1",
    borderTopColor: "#0f766e",
    animation: "spin 0.8s linear infinite",
  },
  loadingTitle: {
    margin: "0 0 6px",
    fontSize: 22,
  },
  loadingText: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.6,
  },
  reportGrid: {
    display: "grid",
    gap: 22,
  },
  card: {
    background: "#ffffff",
    padding: "22px 24px",
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  issueCard: {
    background: "#fffafa",
    padding: "22px 24px",
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    borderLeft: "4px solid #ef4444",
  },
  payNowCard: {
    background: "#fff7ed",
    padding: "22px 24px",
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    borderLeft: "4px solid #f97316",
  },
  cardTitle: {
    margin: "0 0 16px",
    fontSize: 22,
    lineHeight: 1.2,
    letterSpacing: "-0.03em",
  },
  paragraph: {
    margin: 0,
    color: "#334155",
    lineHeight: 1.75,
  },
  concernBox: {
    borderRadius: 16,
    padding: 18,
    border: "1px solid #e2e8f0",
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
  concernLevel: {
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 800,
    marginBottom: 10,
  },
  concernText: {
    margin: 0,
    color: "#334155",
    lineHeight: 1.75,
  },
  savingsBox: {
    padding: 18,
    borderRadius: 16,
    background: "#f0fdfa",
    border: "1px solid #99f6e4",
  },
  savingsRange: {
    fontSize: 32,
    lineHeight: 1,
    fontWeight: 800,
    color: "#0f766e",
    marginBottom: 10,
  },
  savingsReason: {
    margin: 0,
    color: "#334155",
    lineHeight: 1.75,
  },
  findingsList: {
    display: "grid",
    gap: 16,
  },
  findingItem: {
    background: "#ffffff",
    borderRadius: 12,
    padding: 16,
    border: "1px solid #fecaca",
  },
  findingTitle: {
    margin: "0 0 10px",
    fontSize: 18,
    lineHeight: 1.3,
    fontWeight: 800,
    color: "#991b1b",
  },
  findingLabel: {
    margin: "0 0 4px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#64748b",
  },
  findingText: {
    margin: "0 0 12px",
    color: "#334155",
    lineHeight: 1.7,
  },
  findingAction: {
    margin: 0,
    color: "#0f172a",
    lineHeight: 1.7,
    fontWeight: 600,
  },
  checklist: {
    display: "grid",
    gap: 12,
  },
  checkItem: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "#f8fafc",
    borderRadius: 16,
    padding: 14,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#166534",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
  },
  checkText: {
    color: "#334155",
    lineHeight: 1.7,
  },
  scriptBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 18,
    display: "grid",
    gap: 12,
  },
  scriptLine: {
    margin: 0,
    color: "#1e293b",
    lineHeight: 1.8,
  },
  payNowText: {
    margin: 0,
    color: "#7c2d12",
    lineHeight: 1.8,
    fontWeight: 600,
  },
  privacyFooter: {
    marginTop: 28,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.7,
    textAlign: "center",
  },
};
