"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import {
  BILL_IMAGE_STORAGE_KEY,
  BILL_STORAGE_KEY,
  FILE_NAME_STORAGE_KEY,
  BILL_UPLOAD_STATE_KEY,
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

function formatAnalysisDate() {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function getConcernLabel(level: AnalysisReport["concern_level"]["level"]) {
  if (level === "HIGH") {
    return "High Risk";
  }

  if (level === "LOW") {
    return "Low Risk";
  }

  return "Moderate Risk";
}

function getConcernTone(level: AnalysisReport["concern_level"]["level"]) {
  if (level === "HIGH") {
    return {
      badge: "#fff1f2",
      badgeBorder: "#fecdd3",
      badgeText: "#b42318",
      meter: "#dc2626",
      meterTrack: "#fee2e2",
    };
  }

  if (level === "LOW") {
    return {
      badge: "#f0fdf4",
      badgeBorder: "#bbf7d0",
      badgeText: "#166534",
      meter: "#16a34a",
      meterTrack: "#dcfce7",
    };
  }

  return {
    badge: "#fff7ed",
    badgeBorder: "#fed7aa",
    badgeText: "#b45309",
    meter: "#ea580c",
    meterTrack: "#ffedd5",
  };
}

function getRiskMeterWidth(level: AnalysisReport["concern_level"]["level"]) {
  if (level === "HIGH") {
    return "92%";
  }

  if (level === "LOW") {
    return "38%";
  }

  return "68%";
}

function getFindingFinancialImpact(range: string, index: number) {
  if (!range.trim()) {
    return "Included in the overall savings estimate above.";
  }

  if (index === 0) {
    return `${range} at risk across the bill.`;
  }

  return `Contributes to the estimated ${range} in potential savings.`;
}

function getFindingMeaning(title: string, impact: string) {
  return `${title} indicates this bill does not reflect the correct patient balance yet. ${impact}`;
}

export default function ResultPage() {
  const router = useRouter();
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
    const hasStoredUploadState = window.sessionStorage.getItem(BILL_UPLOAD_STATE_KEY) === "ready";
    const hasFile = window.sessionStorage.getItem("hasFile");

    if (pendingPayload) {
      setBillText(pendingPayload.billText);
      setBillImageData(pendingPayload.billImageData);
      setFileName(pendingPayload.fileName || "uploaded-medical-bill");
      clearPendingBillPayload();
      setHasHydrated(true);
      return;
    }

    const storedBillText = window.sessionStorage.getItem(BILL_STORAGE_KEY) || "";
    const storedBillImageData = window.sessionStorage.getItem(BILL_IMAGE_STORAGE_KEY) || "";
    const storedFileName = window.sessionStorage.getItem(FILE_NAME_STORAGE_KEY) || "uploaded-medical-bill";

    if (!hasFile || !hasStoredUploadState || (!storedBillText.trim() && !storedBillImageData.trim())) {
      router.replace("/");
      return;
    }

    setBillText(storedBillText);
    setBillImageData(storedBillImageData);
    setFileName(storedFileName);
    setHasHydrated(true);
  }, [router]);

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

  const scriptLines = report ? splitScript(report.call_script) : [];
  const analyzedDate = useMemo(() => formatAnalysisDate(), []);
  const concernTone = report ? getConcernTone(report.concern_level.level) : getConcernTone("MEDIUM");

  return (
    <main style={styles.page}>
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .audit-shell {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
        }

        .audit-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .audit-card {
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .audit-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }

        @media (max-width: 760px) {
          .audit-grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="audit-shell" style={styles.container}>
        <section className="audit-card" style={styles.reportHeaderCard}>
          <div style={styles.reportHeaderTop}>
            <div>
              <div style={styles.reportEyebrow}>Medical Bill Audit Report</div>
              <h1 style={styles.reportTitle}>Audit Summary</h1>
            </div>
            {report ? (
              <div
                style={{
                  ...styles.statusBadge,
                  background: concernTone.badge,
                  borderColor: concernTone.badgeBorder,
                  color: concernTone.badgeText,
                }}
              >
                {getConcernLabel(report.concern_level.level)}
              </div>
            ) : null}
          </div>

          <div style={styles.reportMetaRow}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Date analyzed</span>
              <span style={styles.metaValue}>{analyzedDate}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>File name</span>
              <span style={styles.metaValue}>{fileName}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Status</span>
              <span style={styles.metaValue}>
                {report ? getConcernLabel(report.concern_level.level) : "Processing"}
              </span>
            </div>
          </div>

          <p style={styles.reportSummary}>
            {report?.summary ||
              "This bill contains multiple issues that result in overpayment risk if not addressed."}
          </p>
        </section>

        {error ? <div style={styles.errorCard}>{error}</div> : null}

        {!report ? (
          <section className="audit-card" style={styles.loadingCard}>
            <div style={styles.spinner} />
            <div>
              <h2 style={styles.loadingTitle}>Generating your audit report</h2>
              <p style={styles.loadingText}>
                {isLoading
                  ? "Reviewing charges, denials, and payment risk now..."
                  : "Waiting for bill data to start analysis."}
              </p>
            </div>
          </section>
        ) : null}

        {report ? (
          <>
            <section className="audit-grid-2" style={styles.dashboardGrid}>
              <div style={styles.mainColumn}>
                <article className="audit-card" style={styles.card}>
                  <h2 style={styles.sectionTitle}>Detailed Findings</h2>
                  <div style={styles.findingsList}>
                    {report.key_findings.map((finding, index) => (
                      <div key={finding.title} style={styles.findingCard}>
                        <div style={styles.findingHeader}>
                          <div style={styles.findingIcon}>⚠️</div>
                          <h3 style={styles.findingTitle}>{finding.title}</h3>
                        </div>

                        <div style={styles.findingRow}>
                          <div style={styles.findingLabel}>Impact</div>
                          <div style={styles.findingValue}>
                            {finding.impact
                              .replace(/^You may be responsible/i, "You are currently responsible")
                              .replace(/^This may indicate/i, "This indicates")}
                          </div>
                        </div>

                        <div style={styles.findingRow}>
                          <div style={styles.findingLabel}>Financial Impact</div>
                          <div style={styles.findingValue}>
                            {getFindingFinancialImpact(report.potential_savings.range, index)}
                          </div>
                        </div>

                        <div style={styles.findingRow}>
                          <div style={styles.findingLabel}>What This Means</div>
                          <div style={styles.findingValue}>{getFindingMeaning(finding.title, finding.impact)}</div>
                        </div>

                        <div style={styles.findingRow}>
                          <div style={styles.findingLabel}>Action</div>
                          <div style={styles.findingAction}>
                            {finding.action
                              .replace(/^Contact/i, "Call")
                              .replace(/^Request/i, "Ask for")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <div style={styles.sidebarColumn}>
                <article className="audit-card" style={styles.savingsHeroCard}>
                  <div style={styles.savingsHeroBadge}>Potential Overpayment</div>
                  <div style={styles.savingsHeroLabel}>Potential Overpayment</div>
                  <div style={styles.savingsHeroAmount}>
                    {`${report.potential_savings.range.replace(/^\$0\s*-\s*/, "$")} Potential Overpayment Identified`}
                  </div>
                  <p style={styles.savingsHeroText}>
                    This amount is at risk due to detected billing issues.
                  </p>
                </article>

                <article className="audit-card" style={styles.card}>
                  <h2 style={styles.sectionTitle}>Risk Level</h2>
                  <div style={styles.riskRow}>
                    <div
                      style={{
                        ...styles.riskBadge,
                        background: concernTone.badge,
                        borderColor: concernTone.badgeBorder,
                        color: concernTone.badgeText,
                      }}
                    >
                      Risk Level: {report.concern_level.level}
                    </div>
                    <div style={styles.riskMeter}>
                      <div style={{ ...styles.riskMeterTrack, background: concernTone.meterTrack }}>
                        <div
                          style={{
                            ...styles.riskMeterFill,
                            width: getRiskMeterWidth(report.concern_level.level),
                            background: concernTone.meter,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <p style={styles.riskReason}>
                    {(
                      report.concern_level.reason ||
                      "Multiple issues detected that increase your out-of-pocket cost."
                    )
                      .replace(/may increase/gi, "increase")
                      .replace(/may result/gi, "result")}
                  </p>
                </article>

                <article className="audit-card" style={styles.card}>
                  <h2 style={styles.sectionTitle}>Recommended Next Steps</h2>
                  <div style={styles.actionList}>
                    {report.priority_actions.slice(0, 4).map((item, index) => (
                      <div key={item} style={styles.actionItem}>
                        <span style={styles.actionNumber}>{index + 1}.</span>
                        <span style={styles.actionText}>{item}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="audit-card" style={styles.card}>
                  <h2 style={styles.sectionTitle}>What to Say When You Call</h2>
                  <div style={styles.scriptBox}>
                    {scriptLines.length > 0 ? (
                      scriptLines.map((line) => (
                        <p key={line} style={styles.scriptLine}>
                          {line
                            .replace(/appears to have/gi, "has")
                            .replace(/may be/gi, "is")
                            .replace(/can you/i, "I need you to")}
                        </p>
                      ))
                    ) : (
                      <p style={styles.scriptLine}>{report.call_script}</p>
                    )}
                  </div>
                </article>
              </div>
            </section>

            <section style={styles.sectionStack}>
              <article className="audit-card" style={styles.warningCard}>
                <div style={styles.warningTitle}>⚠️ Do Not Pay This Bill Yet</div>
                <p style={styles.warningText}>
                  Paying this bill now may prevent you from disputing these charges and could result in overpayment.
                </p>
              </article>

              <div style={styles.reportFooter}>
                Report generated using AI-assisted billing analysis.
              </div>
            </section>
          </>
        ) : null}
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
  sectionStack: {
    display: "grid",
    gap: 22,
  },
  dashboardGrid: {
    alignItems: "start",
    gap: 22,
  },
  mainColumn: {
    display: "grid",
    gap: 22,
  },
  sidebarColumn: {
    display: "grid",
    gap: 18,
  },
  reportHeaderCard: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #d9e0e7",
    padding: 20,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
    marginBottom: 18,
  },
  reportHeaderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    paddingBottom: 16,
    borderBottom: "1px solid #e8edf2",
  },
  reportEyebrow: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  reportTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(1.9rem, 4vw, 2.4rem)",
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 900,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  reportMetaRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    paddingTop: 16,
  },
  metaItem: {
    display: "grid",
    gap: 4,
    padding: 12,
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e6ebf0",
  },
  metaLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  metaValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.5,
  },
  reportSummary: {
    margin: "16px 0 0",
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.75,
    fontWeight: 500,
  },
  errorCard: {
    background: "#fff1f2",
    color: "#b42318",
    border: "1px solid #fecdd3",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    fontWeight: 700,
  },
  loadingCard: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #d9e0e7",
    padding: 24,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "3px solid #dbeafe",
    borderTopColor: "#2563eb",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  loadingTitle: {
    margin: "0 0 6px",
    fontSize: 22,
    color: "#111827",
    fontWeight: 800,
  },
  loadingText: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.7,
  },
  savingsHeroCard: {
    background: "linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)",
    borderRadius: 14,
    border: "1px solid #86efac",
    padding: 20,
    boxShadow: "0 18px 32px rgba(22, 163, 74, 0.12)",
  },
  savingsHeroBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "8px 10px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  savingsHeroLabel: {
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  savingsHeroAmount: {
    color: "#0f172a",
    fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
    lineHeight: 0.92,
    letterSpacing: "-0.06em",
    fontWeight: 900,
    marginBottom: 10,
  },
  savingsHeroText: {
    margin: 0,
    color: "#166534",
    fontSize: 14,
    lineHeight: 1.7,
    fontWeight: 700,
  },
  card: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #d9e0e7",
    padding: 18,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  sectionTitle: {
    margin: "0 0 16px",
    color: "#0f172a",
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: "-0.03em",
  },
  riskRow: {
    display: "grid",
    gap: 12,
    marginBottom: 14,
  },
  riskBadge: {
    display: "inline-flex",
    width: "fit-content",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  riskMeter: {
    width: "100%",
  },
  riskMeterTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  riskMeterFill: {
    height: "100%",
    borderRadius: 999,
  },
  riskReason: {
    margin: 0,
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.75,
    fontWeight: 600,
  },
  findingsList: {
    display: "grid",
    gap: 16,
  },
  findingCard: {
    border: "1px solid #f1c7c7",
    background: "#fffaf9",
    borderRadius: 12,
    padding: 16,
  },
  findingHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  findingIcon: {
    fontSize: 18,
    lineHeight: 1,
  },
  findingTitle: {
    margin: 0,
    color: "#991b1b",
    fontSize: 17,
    lineHeight: 1.25,
    fontWeight: 800,
  },
  findingRow: {
    display: "grid",
    gridTemplateColumns: "150px minmax(0, 1fr)",
    gap: 12,
    padding: "10px 0",
    borderTop: "1px solid #f4dddd",
  },
  findingLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  findingValue: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  findingAction: {
    color: "#0f172a",
    fontSize: 13,
    lineHeight: 1.7,
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
    padding: 12,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
  },
  actionNumber: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.6,
    minWidth: 18,
  },
  actionText: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  scriptBox: {
    border: "1px solid #d7dee5",
    background: "#f8fafc",
    borderRadius: 12,
    padding: 14,
  },
  scriptLine: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: 13,
    lineHeight: 1.85,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  warningCard: {
    background: "#fff7ed",
    border: "2px solid #fb923c",
    borderRadius: 12,
    padding: 18,
    boxShadow: "0 16px 28px rgba(249, 115, 22, 0.12)",
  },
  warningTitle: {
    color: "#9a3412",
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1.2,
    marginBottom: 10,
  },
  warningText: {
    margin: 0,
    color: "#7c2d12",
    fontSize: 14,
    lineHeight: 1.75,
    fontWeight: 700,
  },
  reportFooter: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.7,
    textAlign: "center",
    padding: "4px 8px 0",
  },
};
