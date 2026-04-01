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

const UNLOCK_STATE_PREFIX = "medical-bill-report-unlocked";

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
  const amount = getTopSavingsAmount(range);

  if (!amount) {
    return "Included in the overall savings estimate above.";
  }

  if (index === 0) {
    return `${amount} at risk on this bill right now.`;
  }

  return `Contributes to the ${amount} in potential overpayment identified.`;
}

function getFindingMeaning(title: string, impact: string) {
  return `${title} indicates this bill does not reflect the correct patient balance yet. ${directifyText(impact)}`;
}

function getTopSavingsAmount(range: string) {
  const matches = range.match(/\$[\d,]+(?:\.\d{1,2})?/g);

  if (!matches || matches.length === 0) {
    return range.trim();
  }

  return matches[matches.length - 1];
}

function directifyText(text: string) {
  return text
    .replace(/^You may be responsible/i, "You are currently responsible")
    .replace(/^This may indicate/i, "This indicates")
    .replace(/\bmay increase\b/gi, "increase")
    .replace(/\bmay result\b/gi, "result")
    .replace(/\bmay be\b/gi, "is")
    .replace(/\bappears to\b/gi, "is likely to");
}

function getUnlockStateKey(fileName: string, billText: string, billImageData: string) {
  return `${UNLOCK_STATE_PREFIX}:${fileName}:${billText.length}:${billImageData.length}`;
}

function getTeaserSummary(report: AnalysisReport | null) {
  if (!report) {
    return "We detected multiple issues that may increase your cost.";
  }

  return directifyText(report.summary || "We detected multiple issues that may increase your cost.");
}

function getPreviewSnippet(report: AnalysisReport | null) {
  if (!report || report.key_findings.length === 0) {
    return "Duplicate charge detected on lab services. Insurance adjustment missing on claim review.";
  }

  return `${report.key_findings[0].title}. ${directifyText(report.key_findings[0].impact)}`;
}

export default function ResultPage() {
  const router = useRouter();
  const paywallRef = useRef<HTMLDivElement | null>(null);
  const [billText, setBillText] = useState("");
  const [billImageData, setBillImageData] = useState("");
  const [fileName, setFileName] = useState("medical-bill");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
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

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const unlockKey = getUnlockStateKey(fileName, billText, billImageData);
    const hasSessionId = Boolean(new URLSearchParams(window.location.search).get("session_id"));
    const storedUnlockState = window.sessionStorage.getItem(unlockKey) === "paid";

    if (hasSessionId) {
      window.sessionStorage.setItem(unlockKey, "paid");
      setIsUnlocked(true);
      setJustUnlocked(true);
      return;
    }

    setIsUnlocked(storedUnlockState);
  }, [billImageData, billText, fileName, hasHydrated]);

  useEffect(() => {
    if (!justUnlocked) {
      return;
    }

    const timeoutId = window.setTimeout(() => setJustUnlocked(false), 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [justUnlocked]);

  useEffect(() => {
    if (isUnlocked) {
      setScrollOffset(0);
      return;
    }

    const handleScroll = () => {
      setScrollOffset(Math.min(window.scrollY, 180));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isUnlocked]);

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

  async function handleUnlockReport() {
    setError("");
    setIsStartingCheckout(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
        }),
      });

      const payload = await readJsonResponse<{ url?: string; error?: string }>(response);

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to start checkout.");
      }

      window.location.href = payload.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Something went wrong while starting checkout.",
      );
      setIsStartingCheckout(false);
    }
  }

  function handleDownloadReport() {
    window.print();
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
  const savingsAmount = report ? getTopSavingsAmount(report.potential_savings.range) : "$162.72";
  const parallaxShift = Math.round(scrollOffset * 0.18);
  const overlayShift = Math.round(scrollOffset * 0.06);

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
          max-width: 1020px;
          margin: 0 auto;
        }

        .audit-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.18fr) minmax(300px, 0.82fr);
          gap: 18px;
          align-items: start;
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

        .cta-animated:hover {
          transform: scale(1.03);
          box-shadow: 0 16px 28px rgba(15, 119, 87, 0.24);
        }

        .locked-preview {
          position: relative;
          overflow: hidden;
        }

        .locked-preview::after {
          content: "";
          position: absolute;
          inset: 0;
          backdrop-filter: blur(6px);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.28) 24%, rgba(255, 255, 255, 0.76) 66%, rgba(237, 242, 247, 0.98) 100%);
          pointer-events: none;
          transition:
            opacity 0.3s ease,
            backdrop-filter 0.3s ease;
        }

        .locked-content {
          filter: blur(6px);
          opacity: 0.6;
          user-select: none;
          pointer-events: none;
          transition:
            filter 0.3s ease,
            opacity 0.3s ease,
            transform 0.2s ease;
        }

        @media print {
          .hide-on-print {
            display: none !important;
          }

          body {
            background: #ffffff;
          }
        }

        @media (max-width: 920px) {
          .audit-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="audit-shell" style={styles.container}>
        <div style={styles.brandBar}>
          <div style={styles.brand}>BillFixa</div>
          {isUnlocked ? (
            <button type="button" onClick={handleDownloadReport} style={styles.downloadButton}>
              Download Report
            </button>
          ) : null}
        </div>

        {justUnlocked ? <div style={styles.unlockFlash}>Full report unlocked</div> : null}

        <section className="audit-card" style={styles.reportHeaderCard}>
          <div style={styles.reportHeaderTop}>
            <div>
              <div style={styles.reportEyebrow}>
                {isUnlocked ? "Medical Bill Audit Report" : "Early Risk Preview"}
              </div>
              <h1 style={styles.reportTitle}>
                {isUnlocked ? "Medical Bill Audit Report" : "Your Bill Has Issues"}
              </h1>
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

          <div style={styles.headerBody}>
            <div style={styles.summaryBlock}>
              <div style={styles.summaryLabel}>{isUnlocked ? "Audit Summary" : "Short Summary"}</div>
              <p style={styles.reportSummary}>
                {isUnlocked
                  ? getTeaserSummary(report)
                  : "We detected multiple issues that may increase your cost."}
              </p>
            </div>

            {report ? (
              <div style={styles.headerSavingsChip}>
                <div style={styles.headerSavingsLabel}>Potential Overpayment</div>
                <div style={styles.headerSavingsValue}>{`${savingsAmount} Identified`}</div>
              </div>
            ) : null}
          </div>
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
            <section
              className="audit-grid"
              style={{
                ...styles.dashboardGrid,
                ...(!isUnlocked ? styles.lockedDashboard : {}),
              }}
            >
              <div style={styles.mainColumn}>
                <article
                  className={`audit-card ${!isUnlocked ? "locked-preview" : ""}`}
                  style={styles.card}
                >
                  <div
                    className={!isUnlocked ? "locked-content" : undefined}
                    style={!isUnlocked ? { transform: `translateY(-${parallaxShift}px)` } : undefined}
                  >
                    <h2 style={styles.sectionTitle}>
                      {isUnlocked ? "Detailed Findings" : "Detailed Findings Preview"}
                    </h2>
                    <div style={styles.findingsList}>
                      {report.key_findings.map((finding, index) => (
                        <div key={finding.title} style={styles.findingCard}>
                          <div style={styles.findingHeader}>
                            <div style={styles.findingIcon}>⚠️</div>
                            <h3 style={styles.findingTitle}>{finding.title}</h3>
                          </div>

                          <div style={styles.findingRow}>
                            <div style={styles.findingLabel}>Impact</div>
                            <div style={styles.findingValue}>{directifyText(finding.impact)}</div>
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
                              {finding.action.replace(/^Contact/i, "Call").replace(/^Request/i, "Ask for")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </article>
              </div>

              <div style={styles.sidebarColumn}>
                <article className="audit-card" style={styles.savingsHeroCard}>
                  <div style={styles.savingsHeroBadge}>Potential Overpayment</div>
                  <div style={styles.savingsHeroLabel}>Potential Overpayment</div>
                  <div style={styles.savingsHeroAmount}>{`${savingsAmount} Potential Overpayment Identified`}</div>
                  <p style={styles.savingsHeroText}>
                    {isUnlocked
                      ? "This amount is at risk due to detected billing issues and missing adjustments."
                      : "This amount is at risk due to detected billing issues."}
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
                    {isUnlocked
                      ? directifyText(report.concern_level.reason)
                      : "Multiple issues detected that may increase your out-of-pocket cost."}
                  </p>
                </article>

                <article
                  className={`audit-card ${!isUnlocked ? "locked-preview" : ""}`}
                  style={styles.card}
                >
                  <div
                    className={!isUnlocked ? "locked-content" : undefined}
                    style={!isUnlocked ? { transform: `translateY(-${parallaxShift}px)` } : undefined}
                  >
                    <h2 style={styles.sectionTitle}>Recommended Next Steps</h2>
                    <div style={styles.actionList}>
                      {report.priority_actions.slice(0, 4).map((item, index) => (
                        <div key={item} style={styles.actionItem}>
                          <span style={styles.actionNumber}>{index + 1}.</span>
                          <span style={styles.actionText}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </article>

                <article
                  className={`audit-card ${!isUnlocked ? "locked-preview" : ""}`}
                  style={styles.card}
                >
                  <div
                    className={!isUnlocked ? "locked-content" : undefined}
                    style={!isUnlocked ? { transform: `translateY(-${parallaxShift}px)` } : undefined}
                  >
                    <h2 style={styles.sectionTitle}>What to Say When You Call</h2>
                    <div style={styles.scriptBox}>
                      {scriptLines.length > 0 ? (
                        scriptLines.map((line) => (
                          <p key={line} style={styles.scriptLine}>
                            {directifyText(line).replace(/can you/i, "I need you to")}
                          </p>
                        ))
                      ) : (
                        <p style={styles.scriptLine}>{report.call_script}</p>
                      )}
                    </div>
                  </div>

                </article>
              </div>

              {!isUnlocked ? (
                <div
                  style={{
                    ...styles.lockOverlayWrap,
                    transform: `translate(-50%, calc(-50% + ${overlayShift}px))`,
                  }}
                >
                  <div style={styles.lockProof}>Most people find billing errors before paying</div>
                  <div style={styles.lockOverlay}>
                    <div style={styles.lockTitle}>Unlock Full Report</div>
                    <p style={styles.lockText}>
                      See exactly what’s wrong and how to fix it before you pay.
                    </p>
                    <div style={styles.lockList}>
                      <div style={styles.lockListItem}>✔ Full error breakdown</div>
                      <div style={styles.lockListItem}>✔ Exact steps to fix issues</div>
                      <div style={styles.lockListItem}>✔ Call script included</div>
                    </div>
                    <button
                      className="cta-animated"
                      type="button"
                      onClick={() => void handleUnlockReport()}
                      disabled={isStartingCheckout}
                      style={{
                        ...styles.lockButton,
                        ...(isStartingCheckout ? styles.buttonDisabled : {}),
                      }}
                    >
                      {isStartingCheckout ? "Processing..." : "Unlock Full Report — $4.99"}
                    </button>
                    <div style={styles.lockSubtext}>One-time payment • Takes 60 seconds</div>
                    <div style={styles.lockWarning}>You may be overpaying if you don’t review this</div>
                  </div>
                </div>
              ) : null}
            </section>

            {!isUnlocked ? (
              <section ref={paywallRef} style={styles.sectionStack}>
                <div style={styles.fadedBottomWarning}>
                  ⚠️ Do not pay this bill until you review these issues
                </div>
                <article className="audit-card" style={styles.paywallCard}>
                  <div style={styles.paywallEyebrow}>Unlock full report</div>
                  <h2 style={styles.paywallTitle}>Fix Your Bill Before You Pay</h2>
                  <div style={styles.paywallGrid}>
                    <div style={styles.paywallList}>
                      <div style={styles.paywallItem}>✔ Full error breakdown</div>
                      <div style={styles.paywallItem}>✔ Exact steps to fix issues</div>
                      <div style={styles.paywallItem}>✔ Call script included</div>
                      <div style={styles.paywallItem}>✔ Takes 60 seconds</div>
                    </div>

                    <div style={styles.paywallOffer}>
                      <div style={styles.paywallPriceLabel}>One-time price</div>
                      <div style={styles.paywallPrice}>$4.99 one-time</div>
                      <button
                        className="cta-animated"
                        type="button"
                        onClick={() => void handleUnlockReport()}
                        disabled={isStartingCheckout}
                        style={{
                          ...styles.paywallButton,
                          ...(isStartingCheckout ? styles.buttonDisabled : {}),
                        }}
                      >
                        {isStartingCheckout ? "Processing..." : "Unlock Full Report"}
                      </button>
                      <div style={styles.trustLine}>
                        Secure processing • No account required • Files deleted after analysis
                      </div>
                    </div>
                  </div>
                </article>

                <article className="audit-card" style={styles.warningCard}>
                  <div style={styles.warningTitle}>⚠️ Do Not Pay This Bill Yet</div>
                  <p style={styles.warningText}>
                    Paying this bill now may prevent you from disputing these charges and could result in overpayment.
                  </p>
                </article>
              </section>
            ) : (
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
            )}
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
    padding: "32px 16px 56px",
  },
  container: {
    width: "100%",
    maxWidth: 1020,
    margin: "0 auto",
  },
  brandBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  unlockFlash: {
    marginBottom: 16,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 800,
    boxShadow: "0 10px 20px rgba(22, 163, 74, 0.08)",
  },
  brand: {
    color: "#0f172a",
    fontSize: 20,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  downloadButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
  },
  sectionStack: {
    display: "grid",
    gap: 18,
  },
  dashboardGrid: {
    alignItems: "start",
    gap: 18,
    position: "relative",
  },
  lockedDashboard: {
    paddingBottom: 56,
  },
  mainColumn: {
    display: "grid",
    gap: 18,
  },
  sidebarColumn: {
    display: "grid",
    gap: 16,
  },
  reportHeaderCard: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #d9e0e7",
    padding: 18,
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
    fontSize: "clamp(1.75rem, 3vw, 2.15rem)",
    lineHeight: 1.02,
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
    gap: 10,
    paddingTop: 14,
  },
  metaItem: {
    display: "grid",
    gap: 4,
    padding: 10,
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
  headerBody: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "end",
    paddingTop: 14,
  },
  summaryBlock: {
    display: "grid",
    gap: 8,
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  reportSummary: {
    margin: 0,
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  headerSavingsChip: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    borderRadius: 12,
    padding: "10px 12px",
    minWidth: 190,
  },
  headerSavingsLabel: {
    color: "#166534",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headerSavingsValue: {
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 1.15,
    fontWeight: 900,
    letterSpacing: "-0.03em",
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
    padding: 20,
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
    padding: 18,
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
    fontSize: "clamp(2.1rem, 4vw, 3rem)",
    lineHeight: 0.96,
    letterSpacing: "-0.06em",
    fontWeight: 900,
    marginBottom: 8,
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
    padding: 16,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
    position: "relative",
  },
  lockOverlayWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "min(100%, 340px)",
    zIndex: 4,
    transition: "transform 0.18s ease",
  },
  lockProof: {
    textAlign: "center",
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionTitle: {
    margin: "0 0 16px",
    color: "#0f172a",
    fontSize: 20,
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
    gap: 14,
  },
  findingCard: {
    border: "1px solid #f1c7c7",
    background: "#fffaf9",
    borderRadius: 12,
    padding: 14,
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
    gridTemplateColumns: "132px minmax(0, 1fr)",
    gap: 10,
    padding: "9px 0",
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
    gap: 10,
  },
  actionItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 10,
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
    padding: 12,
  },
  scriptLine: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: 13,
    lineHeight: 1.85,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  lockOverlay: {
    background: "rgba(255,255,255,0.98)",
    border: "1px solid #dbe3ea",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 24px 48px rgba(15, 23, 42, 0.12)",
  },
  lockTitle: {
    color: "#0f172a",
    fontSize: 22,
    lineHeight: 1.15,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    marginBottom: 8,
    maxWidth: 520,
  },
  lockText: {
    margin: "0 0 14px",
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.65,
    fontWeight: 600,
    maxWidth: 520,
  },
  lockList: {
    display: "grid",
    gap: 10,
    marginBottom: 14,
  },
  lockListItem: {
    color: "#0f172a",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 700,
  },
  lockButton: {
    border: "none",
    background: "#0f7757",
    color: "#ffffff",
    borderRadius: 10,
    padding: "14px 18px",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15, 119, 87, 0.18)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  lockSubtext: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.6,
    fontWeight: 700,
    textAlign: "center",
  },
  lockWarning: {
    marginTop: 10,
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 800,
    textAlign: "center",
  },
  paywallCard: {
    background: "#ffffff",
    border: "1px solid #d9e0e7",
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 16px 32px rgba(15,23,42,0.07)",
  },
  paywallEyebrow: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  paywallTitle: {
    margin: "0 0 18px",
    color: "#0f172a",
    fontSize: "clamp(1.7rem, 3vw, 2.2rem)",
    lineHeight: 1.02,
    letterSpacing: "-0.04em",
    fontWeight: 900,
  },
  paywallGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)",
    gap: 16,
    alignItems: "start",
  },
  paywallList: {
    display: "grid",
    gap: 12,
  },
  paywallItem: {
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 1.6,
    fontWeight: 700,
    padding: "12px 14px",
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
  },
  paywallOffer: {
    border: "1px solid #dbe3ea",
    background: "#f8fafc",
    borderRadius: 12,
    padding: 18,
    textAlign: "center",
  },
  paywallPriceLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  paywallPrice: {
    color: "#0f172a",
    fontSize: 30,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.05em",
    marginBottom: 14,
  },
  paywallButton: {
    width: "100%",
    border: "none",
    background: "#0f7757",
    color: "#ffffff",
    borderRadius: 10,
    padding: "15px 18px",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15, 119, 87, 0.18)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  trustLine: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "wait",
  },
  fadedBottomWarning: {
    color: "#9a3412",
    fontSize: 13,
    lineHeight: 1.7,
    fontWeight: 800,
    textAlign: "center",
    opacity: 0.7,
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
