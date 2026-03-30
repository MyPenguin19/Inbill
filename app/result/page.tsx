"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

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

  const reportCards = useMemo(
    () =>
      report
        ? [
            { title: "Summary", type: "summary" as const, content: report.summary },
            { title: "Should You Be Concerned?", type: "concern" as const, content: report.concern },
            { title: "Potential Savings", type: "savings" as const, content: report.savings },
            { title: "What You Likely Owe", type: "owed" as const, content: report.owed },
            { title: "Potential Issues", type: "issues" as const, content: report.issues },
            { title: "Questions to Ask", type: "questions" as const, content: report.questions },
            { title: "Suggested Next Steps", type: "steps" as const, content: report.steps },
            { title: "Call Script", type: "script" as const, content: report.script },
            { title: "If You Pay Now", type: "ifPayNow" as const, content: report.ifPayNow },
          ]
        : [],
    [report],
  );

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
          max-width: 800px;
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
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
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
            Back to home
          </Link>
          <a href="mailto:support@inbill.co" style={styles.topLink}>
            Support
          </a>
          <a href="#privacy" style={styles.topLink}>
            Privacy
          </a>
        </div>

        <section className="report-card" style={styles.heroCard}>
          <div style={styles.heroBadge}>✨ Premium Report</div>
          <h1 style={styles.heroTitle}>Your medical bill review</h1>
          <p style={styles.heroText}>
            Reviewing <strong>{fileName}</strong>. This report is structured to feel like a professional patient
            audit with clean sections instead of raw AI text.
          </p>
        </section>

        {error ? <div style={styles.errorCard}>{error}</div> : null}

        {!report ? (
          <section className="report-card" style={styles.loadingCard}>
            <div style={styles.spinner} />
            <div>
              <h2 style={styles.loadingTitle}>Analysis workspace</h2>
              <p style={styles.loadingText}>
                {isLoading ? "Building your report now..." : "Waiting for bill data to start analysis."}
              </p>
            </div>
          </section>
        ) : null}

        {report ? (
          <section style={styles.reportGrid}>
            {reportCards.map((section) => {
              if (section.type === "summary") {
                return (
                  <article className="report-card" key={section.title} style={styles.card}>
                    <h2 style={styles.cardTitle}>📝 {section.title}</h2>
                    <div style={styles.summaryBody}>
                      <p style={styles.paragraph}>{section.content}</p>
                    </div>
                  </article>
                );
              }

              if (section.type === "concern") {
                const concern = section.content;
                const concernStyle =
                  concern.level === "HIGH"
                    ? styles.concernHigh
                    : concern.level === "LOW"
                      ? styles.concernLow
                      : styles.concernMedium;

                return (
                  <article className="report-card" key={section.title} style={styles.card}>
                    <h2 style={styles.cardTitle}>⏰ {section.title}</h2>
                    <div style={{ ...styles.concernBox, ...concernStyle }}>
                      <div style={styles.concernLevel}>{concern.level}</div>
                      <p style={styles.concernText}>{concern.explanation}</p>
                    </div>
                  </article>
                );
              }

              if (section.type === "savings") {
                return (
                  <article className="report-card" key={section.title} style={styles.card}>
                    <h2 style={styles.cardTitle}>💸 {section.title}</h2>
                    <div style={styles.savingsBox}>{section.content}</div>
                  </article>
                );
              }

              if (section.type === "owed") {
                return (
                  <article className="report-card" key={section.title} style={styles.card}>
                    <h2 style={styles.cardTitle}>💵 {section.title}</h2>
                    <div style={styles.owePanel}>
                      {section.content.map((line) => (
                        <div key={line} style={styles.oweRow}>
                          <span style={styles.oweLabel}>{line.split(":")[0]}</span>
                          <strong style={styles.oweValue}>{line.split(":").slice(1).join(":").trim()}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              }

              if (section.type === "issues") {
                return (
                  <article className="report-card" key={section.title} style={styles.issueCard}>
                    <h2 style={styles.cardTitle}>🚨 {section.title}</h2>
                    <div style={styles.issueList}>
                      {section.content.map((line) => (
                        <div key={line} style={styles.issueItem}>
                          <span style={styles.issueIcon}>⚠️</span>
                          <span style={styles.issueText}>{line}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              }

              if (section.type === "questions") {
                return (
                  <article className="report-card" key={section.title} style={styles.card}>
                    <h2 style={styles.cardTitle}>❓ {section.title}</h2>
                    <ul style={styles.bulletList}>
                      {section.content.map((line) => (
                        <li key={line} style={styles.bulletItem}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              }

              if (section.type === "steps") {
                return (
                  <article className="report-card" key={section.title} style={styles.card}>
                    <h2 style={styles.cardTitle}>✅ {section.title}</h2>
                    <div style={styles.checklist}>
                      {section.content.map((line) => (
                        <div key={line} style={styles.checkItem}>
                          <span style={styles.checkIcon}>✔️</span>
                          <span style={styles.checkText}>{line}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              }

              if (section.type === "script") {
                return (
                  <article className="report-card" key={section.title} style={styles.card}>
                    <h2 style={styles.cardTitle}>📞 {section.title}</h2>
                    <div style={styles.scriptBox}>
                      {section.content.map((line) => (
                        <p key={line} style={styles.scriptLine}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </article>
                );
              }

              if (section.type === "ifPayNow") {
                return (
                  <article className="report-card" key={section.title} style={styles.payNowCard}>
                    <h2 style={styles.cardTitle}>🛑 {section.title}</h2>
                    <div style={styles.checklist}>
                      {section.content.map((line) => (
                        <div key={line} style={styles.payNowItem}>
                          <span style={styles.payNowIcon}>!</span>
                          <span style={styles.checkText}>{line}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              }
            })}
          </section>
        ) : null}
        <section id="privacy" style={styles.privacyFooter}>
          This report is informational only and does not replace medical, legal, or insurance advice.
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
    maxWidth: 800,
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
  buttonDisabled: {
    opacity: 0.7,
    cursor: "wait",
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
    marginBottom: 0,
  },
  issueCard: {
    background: "#fffafa",
    padding: "22px 24px",
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    borderLeft: "4px solid #ef4444",
  },
  cardTitle: {
    margin: "0 0 16px",
    fontSize: 22,
    lineHeight: 1.2,
    letterSpacing: "-0.03em",
  },
  summaryBody: {
    display: "grid",
    gap: 12,
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
    background: "#ecfdf5",
    color: "#065f46",
    fontSize: 28,
    lineHeight: 1.2,
    fontWeight: 800,
  },
  owePanel: {
    display: "grid",
    gap: 12,
    background: "#f8fafc",
    borderRadius: 12,
    padding: 18,
  },
  oweRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  oweLabel: {
    color: "#64748b",
    fontWeight: 600,
  },
  oweValue: {
    fontSize: 22,
    color: "#0f172a",
    fontWeight: 800,
  },
  issueList: {
    display: "grid",
    gap: 12,
  },
  issueItem: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "#fff5f5",
    borderRadius: 12,
    padding: 14,
  },
  issueIcon: {
    fontSize: 16,
    lineHeight: 1.6,
    display: "inline-flex",
    flexShrink: 0,
  },
  issueText: {
    color: "#991b1b",
    lineHeight: 1.7,
  },
  bulletList: {
    margin: 0,
    paddingLeft: 22,
    display: "grid",
    gap: 12,
    color: "#334155",
    lineHeight: 1.7,
  },
  bulletItem: {
    paddingLeft: 4,
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
    borderRadius: 12,
    padding: 14,
  },
  checkIcon: {
    fontSize: 16,
    lineHeight: 1.6,
    flexShrink: 0,
  },
  checkText: {
    color: "#334155",
    lineHeight: 1.7,
  },
  scriptBox: {
    background: "#f3f4f6",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 18,
    display: "grid",
    gap: 12,
  },
  scriptLine: {
    margin: 0,
    color: "#1e293b",
    lineHeight: 1.8,
  },
  payNowCard: {
    background: "#fff7ed",
    padding: "22px 24px",
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    borderLeft: "4px solid #f97316",
  },
  payNowItem: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "rgba(255,255,255,0.65)",
    borderRadius: 12,
    padding: 14,
  },
  payNowIcon: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#f97316",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
  },
  privacyFooter: {
    marginTop: 20,
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 1.6,
    textAlign: "center",
  },
};
