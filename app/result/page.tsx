"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  BILL_IMAGE_STORAGE_KEY,
  BILL_STORAGE_KEY,
  FILE_NAME_STORAGE_KEY,
  BILL_UPLOAD_STATE_KEY,
} from "@/lib/bill";
import { clearPendingBillPayload, getPendingBillPayload } from "@/lib/client-bill-session";
import type { AnalysisReport } from "@/lib/types";

const UNLOCK_STATE_PREFIX = "medical-bill-report-unlocked";
const PAYWALL_ENABLED = false;

type AnalysisJson = {
  total_bill: number | null;
  estimated_overpayment: number;
  confidence: "high" | "medium" | "low";
  issues: Array<{
    title: string;
    description: string;
    impact_range: string;
  }>;
  call_script: string;
  action_steps: string[];
};

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

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "Not clearly stated";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseCurrencyValue(raw: string) {
  const normalized = raw.replace(/[$,]/g, "").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTopSavingsAmount(range: string) {
  const matches = range.match(/\$[\d,]+(?:\.\d{1,2})?/g);

  if (!matches || matches.length === 0) {
    return range.trim();
  }

  return matches[matches.length - 1];
}

function getConcernLabel(level: AnalysisReport["concern_level"]["level"]) {
  if (level === "HIGH") {
    return "High Confidence";
  }

  if (level === "LOW") {
    return "Low Confidence";
  }

  return "Medium Confidence";
}

function getConcernTone(level: AnalysisReport["concern_level"]["level"]) {
  if (level === "HIGH") {
    return {
      badge: "#fff1f2",
      border: "#fecdd3",
      text: "#b42318",
    };
  }

  if (level === "LOW") {
    return {
      badge: "#f0fdf4",
      border: "#bbf7d0",
      text: "#166534",
    };
  }

  return {
    badge: "#fff7ed",
    border: "#fed7aa",
    text: "#b45309",
  };
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

function extractLikelyTotalBill(rawText: string) {
  const matches = rawText.match(/\$[\d,]+(?:\.\d{1,2})?/g);

  if (!matches || matches.length === 0) {
    return null;
  }

  const parsed = matches
    .map(parseCurrencyValue)
    .filter((value): value is number => value !== null);

  if (parsed.length === 0) {
    return null;
  }

  return Math.max(...parsed);
}

function buildIssueImpactRange(impact: string, fallbackAmount: string, index: number) {
  const amountMatches = impact.match(/\$[\d,]+(?:\.\d{1,2})?/g);

  if (amountMatches && amountMatches.length > 0) {
    if (amountMatches.length >= 2) {
      return `${amountMatches[0]}–${amountMatches[1]}`;
    }

    return `${amountMatches[0]}`;
  }

  const numeric = parseCurrencyValue(fallbackAmount);

  if (numeric === null) {
    return "Review needed";
  }

  const ratios = [
    [0.28, 0.55],
    [0.18, 0.42],
    [0.12, 0.35],
    [0.1, 0.24],
  ] as const;
  const [lowRatio, highRatio] = ratios[index] || ratios[ratios.length - 1];
  const low = Math.max(15, Math.round(numeric * lowRatio));
  const high = Math.max(low + 10, Math.round(numeric * highRatio));

  return `${formatCurrency(low)}–${formatCurrency(high)}`;
}

function buildQuickVerdict(report: AnalysisReport) {
  if (report.concern_level.level === "LOW") {
    return "This bill likely contains billing errors that may increase what you pay.";
  }

  return "This bill likely contains billing errors that may increase what you pay.";
}

function buildMeaningText(report: AnalysisReport) {
  if (report.key_findings.length === 0) {
    return "These findings suggest your total bill may be higher than necessary. In many cases, similar discrepancies are reviewed and corrected after contacting the billing department.";
  }

  return "These findings suggest your total bill may be higher than necessary. In many cases, similar discrepancies are reviewed and corrected after contacting the billing department.";
}

function normalizeIssueTitle(title: string) {
  const lower = title.toLowerCase();

  if (lower.includes("duplicate")) {
    return "Duplicate Charge Identified";
  }

  if (lower.includes("denial") || lower.includes("insurance")) {
    return "Insurance Issue Identified";
  }

  if (lower.includes("lab")) {
    return "Lab Charge Review Recommended";
  }

  if (lower.includes("adjustment")) {
    return "Missing Adjustment Identified";
  }

  return title;
}

function normalizeIssueDescription(title: string, description: string) {
  const lower = title.toLowerCase();

  if (lower.includes("duplicate")) {
    return "Two similar charges were identified for the same service, which may indicate a billing duplication.";
  }

  if (lower.includes("denial") || lower.includes("insurance")) {
    return "A billing or insurance issue was identified that may increase your out-of-pocket responsibility.";
  }

  if (lower.includes("adjustment")) {
    return "An expected adjustment appears to be missing, which suggests your balance may be higher than necessary.";
  }

  return directifyText(description);
}

function getLikelihoodScore(level: AnalysisReport["concern_level"]["level"], findingsCount: number) {
  const baseScore = level === "HIGH" ? 84 : level === "LOW" ? 42 : 68;
  return Math.min(98, baseScore + Math.min(findingsCount, 4) * 3);
}

function getConfidenceScore(level: AnalysisReport["concern_level"]["level"], findingsCount: number) {
  const baseScore = level === "HIGH" ? 82 : level === "LOW" ? 38 : 61;
  return Math.min(96, baseScore + Math.min(findingsCount, 3) * 4);
}

function getConfidenceLabel(score: number) {
  if (score > 70) {
    return "High";
  }

  if (score > 40) {
    return "Moderate";
  }

  return "Low";
}

function getRiskScore(level: AnalysisReport["concern_level"]["level"], findingsCount: number) {
  const baseScore = level === "HIGH" ? 86 : level === "LOW" ? 32 : 58;
  return Math.min(97, baseScore + Math.min(findingsCount, 4) * 3);
}

function getRiskLabel(score: number) {
  if (score > 70) {
    return "High";
  }

  if (score > 40) {
    return "Moderate";
  }

  return "Low";
}

function buildPriorityAction(report: AnalysisReport) {
  return (
    report.priority_actions[0] ||
    "Call the billing department and request an itemized review before making payment."
  );
}

function buildExpectedOutcome(report: AnalysisReport) {
  if (report.concern_level.level === "HIGH") {
    return "You may receive a corrected balance, removed duplicate charges, or a bill sent back for insurance review.";
  }

  if (report.concern_level.level === "LOW") {
    return "You should leave the call with a clearer explanation of your charges and confirmation of the correct balance.";
  }

  return "You may receive clarification, a corrected statement, or follow-up review from billing or insurance.";
}

function buildEstimatedResolutionTime(report: AnalysisReport) {
  if (report.concern_level.level === "HIGH") {
    return "10-15 minutes for the first call, then 1-3 business days for review.";
  }

  return "10-15 minutes for the first call, then 1-2 business days for follow-up.";
}

function buildPreparationList(fileName: string, totalBill: string, issues: AnalysisJson["issues"]) {
  return [
    `Your bill or statement (${fileName})`,
    `The total amount due${totalBill !== "Not clearly stated" ? ` (${totalBill})` : ""}`,
    issues[0] ? `The issue titled "${normalizeIssueTitle(issues[0].title)}"` : "The issue you want reviewed",
    "A pen or notes app to record the representative's response",
  ];
}

function buildPossibleOutcomes(report: AnalysisReport) {
  const outcomes = [
    "A corrected statement with duplicate or unsupported charges removed",
    "A billing review or insurance reprocessing request",
    "A clearer explanation of what you actually owe before payment",
  ];

  if (report.concern_level.level === "LOW") {
    return [
      "A clearer explanation of the current balance",
      "Confirmation that the charges were billed correctly",
      "Written follow-up or a corrected itemized statement if needed",
    ];
  }

  return outcomes;
}

function buildProfessionalInsight(report: AnalysisReport, analysisJson: AnalysisJson) {
  const findingsCount = analysisJson.issues.length;
  const severity =
    report.concern_level.level === "HIGH"
      ? "higher-risk"
      : report.concern_level.level === "LOW"
        ? "lower-risk"
        : "moderate-risk";

  const issueTypes = analysisJson.issues
    .slice(0, 3)
    .map((issue) => normalizeIssueTitle(issue.title).replace(/\s+Identified$|\s+Recommended$/i, "").toLowerCase());

  const issueSummary =
    issueTypes.length === 0
      ? "billing discrepancies"
      : issueTypes.length === 1
        ? issueTypes[0]
        : `${issueTypes.slice(0, -1).join(", ")} and ${issueTypes[issueTypes.length - 1]}`;

  const issueReference = analysisJson.issues[0]
    ? normalizeIssueTitle(analysisJson.issues[0].title).toLowerCase()
    : "the billing pattern identified";

  return `Based on the billing patterns identified, this bill shows characteristics commonly associated with ${severity} ${issueSummary}. The presence of ${issueReference} across ${findingsCount} ${findingsCount === 1 ? "issue" : "issues"} suggests that the total may include charges that warrant clarification before payment. In similar cases, these discrepancies are often reviewed and adjusted after contacting the billing department.`;
}

function buildIssueSummary(issues: AnalysisJson["issues"]) {
  if (issues.length === 0) {
    return "the billing issues identified in my statement";
  }

  const titles = issues.slice(0, 2).map((issue) => normalizeIssueTitle(issue.title).toLowerCase());

  if (titles.length === 1) {
    return titles[0];
  }

  return `${titles[0]} and ${titles[1]}`;
}

function buildDisputePhoneScript(report: AnalysisReport, analysisJson: AnalysisJson) {
  const issueReference = buildIssueSummary(analysisJson.issues);
  const provider = report.provider_name || "your billing department";
  const totalBill = formatCurrency(analysisJson.total_bill);

  return [
    `Hello, I'm calling about my medical bill from ${provider}${totalBill !== "Not clearly stated" ? ` for ${totalBill}` : ""}.`,
    `I reviewed the statement and identified ${issueReference}, and I need these charges reviewed before I make payment.`,
    "Please verify the charges, confirm whether any corrections are needed, and send me an updated itemized statement.",
    "If you cannot resolve it on this call, please document the dispute and escalate it for formal review before payment is expected.",
    "Thank you. Please tell me the next step and when I should expect a corrected response.",
  ];
}

function buildDisputeEmail(report: AnalysisReport, analysisJson: AnalysisJson) {
  const provider = report.provider_name || "Billing Department";
  const issueReference = buildIssueSummary(analysisJson.issues);
  const totalBill = formatCurrency(analysisJson.total_bill);
  const subject = `Billing review request${report.provider_name ? ` - ${report.provider_name}` : ""}`;

  const body = [
    `Dear ${provider},`,
    "",
    `I am requesting a review of my recent medical bill${totalBill !== "Not clearly stated" ? ` totaling ${totalBill}` : ""}. After reviewing the statement, I identified ${issueReference}.`,
    "",
    "Please review these charges, confirm whether any corrections are needed, and provide an updated itemized statement before payment is expected.",
    "",
    "If additional information is required, please let me know the next step and timeline for review.",
    "",
    "Thank you,",
    "[Your Name]",
  ].join("\n");

  return { subject, body };
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(reportData: {
  fileName: string;
  analyzedDate: string;
  report: AnalysisReport;
  analysisJson: AnalysisJson;
}) {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 48;
  const right = 48;
  const maxWidth = pageWidth - left - right;
  const fontSize = {
    title: 22,
    heading: 14,
    body: 11,
    small: 9,
  };

  type Segment = {
    text: string;
    font: "F1" | "F2";
    size: number;
    gapAfter?: number;
  };

  const wrapText = (text: string, size: number) => {
    const averageCharWidth = size * 0.52;
    const maxChars = Math.max(24, Math.floor(maxWidth / averageCharWidth));
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  };

  const segments: Segment[] = [
    { text: "BillFixa", font: "F2", size: fontSize.heading, gapAfter: 10 },
    { text: "Medical Bill Audit Report", font: "F2", size: fontSize.title, gapAfter: 8 },
    { text: "Prepared analysis of your medical charges", font: "F1", size: fontSize.body, gapAfter: 8 },
    { text: `Date analyzed: ${reportData.analyzedDate}`, font: "F1", size: fontSize.small },
    { text: "Prepared by BillFixa", font: "F1", size: fontSize.small },
    { text: `Source file: ${reportData.fileName}`, font: "F1", size: fontSize.small, gapAfter: 14 },
    { text: "Executive Summary", font: "F2", size: fontSize.heading, gapAfter: 6 },
    { text: `Estimated Overpayment: ${formatCurrency(reportData.analysisJson.estimated_overpayment)}`, font: "F2", size: fontSize.body, gapAfter: 2 },
    { text: `Confidence: ${reportData.analysisJson.confidence.charAt(0).toUpperCase()}${reportData.analysisJson.confidence.slice(1)} Confidence`, font: "F1", size: fontSize.body, gapAfter: 2 },
    { text: `Verdict: ${buildQuickVerdict(reportData.report)}`, font: "F1", size: fontSize.body, gapAfter: 12 },
    { text: "Total Bill Amount", font: "F2", size: fontSize.heading, gapAfter: 6 },
    { text: formatCurrency(reportData.analysisJson.total_bill), font: "F1", size: fontSize.body, gapAfter: 10 },
    { text: "Key Findings", font: "F2", size: fontSize.heading, gapAfter: 8 },
  ];

  for (const issue of reportData.analysisJson.issues) {
    segments.push({ text: issue.title, font: "F2", size: fontSize.body, gapAfter: 2 });
    segments.push({ text: issue.description, font: "F1", size: fontSize.body, gapAfter: 2 });
    segments.push({ text: `Estimated impact: ${issue.impact_range}`, font: "F1", size: fontSize.body, gapAfter: 8 });
  }

  segments.push({ text: "What This Means", font: "F2", size: fontSize.heading, gapAfter: 8 });
  segments.push({ text: buildMeaningText(reportData.report), font: "F1", size: fontSize.body, gapAfter: 10 });
  segments.push({ text: "Recommended Next Steps", font: "F2", size: fontSize.heading, gapAfter: 8 });

  reportData.analysisJson.action_steps.forEach((step, index) => {
    segments.push({ text: `${index + 1}. ${step}`, font: "F1", size: fontSize.body, gapAfter: 4 });
  });

  segments.push({ text: "Suggested Call Script", font: "F2", size: fontSize.heading, gapAfter: 8 });

  splitScript(reportData.analysisJson.call_script).forEach((line) => {
    segments.push({ text: line, font: "F1", size: fontSize.body, gapAfter: 4 });
  });

  segments.push({ text: "Negotiation Tip", font: "F2", size: fontSize.heading, gapAfter: 8 });
  segments.push({
    text: "Do not agree to pay until the billing office reviews the charges and confirms the corrected balance.",
    font: "F1",
    size: fontSize.body,
    gapAfter: 10,
  });
  segments.push({ text: "Notes", font: "F2", size: fontSize.heading, gapAfter: 8 });
  segments.push({
    text: "Generated by BillFixa.com. This report is for informational purposes only and is not medical or legal advice.",
    font: "F1",
    size: fontSize.small,
    gapAfter: 0,
  });

  const pages: string[][] = [];
  let pageCommands: string[] = [];
  let y = pageHeight - 56;

  const flushPage = () => {
    pages.push(pageCommands);
    pageCommands = [];
    y = pageHeight - 56;
  };

  const addLine = (line: string, font: "F1" | "F2", size: number) => {
    if (y < 56) {
      flushPage();
    }

    pageCommands.push(`BT /${font} ${size} Tf 1 0 0 1 ${left} ${y} Tm (${escapePdfText(line)}) Tj ET`);
    y -= size + 6;
  };

  for (const segment of segments) {
    const lines = wrapText(segment.text, segment.size);

    for (const line of lines) {
      addLine(line, segment.font, segment.size);
    }

    y -= segment.gapAfter ?? 0;
  }

  if (pageCommands.length > 0) {
    flushPage();
  }

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("<< /Type /Pages /Count 0 /Kids [] >>");
  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageIds: number[] = [];

  for (const commands of pages) {
    const content = commands.join("\n");
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export default function ResultPage() {
  const router = useRouter();
  const [billText, setBillText] = useState("");
  const [billImageData, setBillImageData] = useState("");
  const [fileName, setFileName] = useState("medical-bill");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [copiedScript, setCopiedScript] = useState<"phone" | "email" | "">("");
  const [shareFeedback, setShareFeedback] = useState("");
  const [scriptExpanded, setScriptExpanded] = useState(true);
  const [emailExpanded, setEmailExpanded] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
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
      return;
    }

    setIsUnlocked(storedUnlockState);
  }, [billImageData, billText, fileName, hasHydrated]);

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

  useEffect(() => {
    if (!hasHydrated || hasAutoStarted.current || (!billText.trim() && !billImageData.trim())) {
      return;
    }

    hasAutoStarted.current = true;
    void generateAnalysis(billText, billImageData);
  }, [billImageData, billText, hasHydrated]);

  const analyzedDate = useMemo(() => formatAnalysisDate(), []);
  const isPaid = PAYWALL_ENABLED ? isUnlocked : true;
  const scriptLines = report ? splitScript(report.call_script) : [];
  const concernTone = report ? getConcernTone(report.concern_level.level) : getConcernTone("MEDIUM");

  const analysisJson = useMemo<AnalysisJson | null>(() => {
    if (!report) {
      return null;
    }

    const estimatedOverpaymentRaw = getTopSavingsAmount(report.potential_savings.range);
    const estimatedOverpayment = parseCurrencyValue(estimatedOverpaymentRaw) ?? 0;
    const totalBill = extractLikelyTotalBill(billText);

    return {
      total_bill: totalBill,
      estimated_overpayment: estimatedOverpayment,
      confidence:
        report.concern_level.level === "HIGH"
          ? "high"
          : report.concern_level.level === "LOW"
            ? "low"
            : "medium",
      issues: report.key_findings.map((finding, index) => ({
        title: finding.title,
        description: directifyText(finding.impact),
        impact_range: buildIssueImpactRange(finding.impact, estimatedOverpaymentRaw, index),
      })),
      call_script:
        report.personalized_call_scripts?.detailed_version ||
        report.personalized_call_scripts?.short_version ||
        report.call_script,
      action_steps: report.priority_actions.slice(0, 3),
    };
  }, [billText, report]);

  async function handleDownloadPdf() {
    if (!report || !analysisJson) {
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const pdfBlob = buildPdf({
        fileName,
        analyzedDate,
        report,
        analysisJson,
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName.replace(/\.[^/.]+$/, "") || "billfixa-report"}-audit-report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  async function handleCopyScript(value: string, variant: "phone" | "email") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedScript(variant);
      window.setTimeout(() => setCopiedScript(""), 1800);
    } catch {
      setCopiedScript("");
    }
  }

  async function handleShareSummary() {
    if (!report || !analysisJson) {
      return;
    }

    const summaryText = [
      "BillFixa Medical Bill Audit Report",
      `${overpaymentText} estimated overpayment identified.`,
      `Priority action: ${buildPriorityAction(report)}`,
      `Expected outcome: ${buildExpectedOutcome(report)}`,
    ].join(" ");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "BillFixa Medical Bill Audit Report",
          text: summaryText,
        });
        setShareFeedback("Shared");
      } else {
        await navigator.clipboard.writeText(summaryText);
        setShareFeedback("Summary copied");
      }
    } catch {
      setShareFeedback("");
      return;
    }

    window.setTimeout(() => setShareFeedback(""), 1800);
  }

  const overpaymentText = analysisJson ? formatCurrency(analysisJson.estimated_overpayment) : "$162.72";
  const totalBillText = analysisJson ? formatCurrency(analysisJson.total_bill) : "Not clearly stated";
  const confidenceText = report ? getConcernLabel(report.concern_level.level) : "High Confidence";
  const quickVerdict = report ? buildQuickVerdict(report) : "This bill likely contains pricing or billing errors.";
  const meaningText = report ? buildMeaningText(report) : "";
  const detailedScript =
    report?.personalized_call_scripts?.detailed_version || report?.call_script || "Not clearly stated";
  const phoneScriptSections =
    report && analysisJson ? buildDisputePhoneScript(report, analysisJson) : [];
  const disputeEmail =
    report && analysisJson
      ? buildDisputeEmail(report, analysisJson)
      : { subject: "Billing review request", body: "Not clearly stated" };
  const likelihoodScore = report ? getLikelihoodScore(report.concern_level.level, analysisJson?.issues.length || 0) : 84;
  const confidenceScore = report
    ? getConfidenceScore(report.concern_level.level, analysisJson?.issues.length || 0)
    : 82;
  const confidenceBarLabel = getConfidenceLabel(confidenceScore);
  const riskScore = report ? getRiskScore(report.concern_level.level, analysisJson?.issues.length || 0) : 86;
  const riskBarLabel = getRiskLabel(riskScore);
  const riskColor =
    riskScore > 70 ? "bg-red-500" : riskScore > 40 ? "bg-yellow-400" : "bg-green-500";
  const priorityAction = report ? buildPriorityAction(report) : "Call the billing department and request an itemized review before making payment.";
  const expectedOutcome = report ? buildExpectedOutcome(report) : "You may receive a corrected balance or a clearer explanation of what you owe.";
  const resolutionTime = report ? buildEstimatedResolutionTime(report) : "10-15 minutes for the first call, then 1-2 business days for follow-up.";
  const preparationList = analysisJson
    ? buildPreparationList(fileName, totalBillText, analysisJson.issues)
    : [];
  const possibleOutcomes = report ? buildPossibleOutcomes(report) : [];
  const professionalInsight =
    report && analysisJson
      ? buildProfessionalInsight(report, analysisJson)
      : "Based on the billing patterns identified, this bill shows characteristics commonly associated with charges that warrant clarification before payment.";

  const baseCardClass =
    "audit-card rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-150 ease-out hover:-translate-y-[1px] hover:shadow-md";
  const primaryButtonClass =
    "audit-button w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 ease-out hover:bg-blue-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-wait disabled:opacity-70";
  const secondaryButtonClass =
    "audit-button w-full rounded-xl bg-gray-100 px-5 py-3 text-sm font-medium text-gray-800 transition-all duration-200 ease-out hover:bg-gray-200 active:scale-[0.99]";
  const utilityButtonClass =
    "audit-button inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-all duration-200 ease-out hover:bg-gray-50";
  const confidenceClass =
    report?.concern_level.level === "HIGH"
      ? "bg-red-100 text-red-700"
      : report?.concern_level.level === "LOW"
        ? "bg-gray-100 text-gray-700"
        : "bg-red-100 text-red-700";

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-[1280px] space-y-6 px-6 py-16 lg:px-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="text-lg font-semibold tracking-tight text-gray-950">BillFixa</div>
            <div className="text-sm text-gray-500">Generated by BillFixa.com</div>
          </div>

          <div className="audit-actions flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
            {!PAYWALL_ENABLED ? (
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                Test Mode — Full report visible
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {!report ? (
          <section className={`${baseCardClass} flex items-center gap-4`}>
            <div className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
            <div className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight text-gray-950">Generating your audit report</h2>
              <p className="text-sm text-gray-700">
                {isLoading
                  ? "Reviewing charges, denials, and payment risk now..."
                  : "Waiting for bill data to start analysis."}
              </p>
            </div>
          </section>
        ) : null}

        {report && analysisJson ? (
          <div className="space-y-4">
            <section className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Potential Overcharge Detected
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-950">
                      Potential Overcharge Detected
                    </h1>
                  </div>

                  <div className="audit-hero-meta space-y-3">
                    <div className="text-sm text-gray-500">
                      Date generated
                    </div>
                    <div className="text-sm text-gray-700">{analyzedDate}</div>
                    <div className="text-sm text-gray-500">Prepared by BillFixa</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="space-y-4 rounded-xl border border-green-100 bg-green-50 p-6">
                      <div>
                        <div className="text-4xl font-bold tracking-tight text-green-600 md:text-5xl">
                          {overpaymentText}
                        </div>
                        <div className="text-sm text-gray-500">Estimated Overpayment</div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">Confidence Level</p>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${confidenceScore}%` }}
                          />
                        </div>
                        <p className="text-sm font-medium text-gray-900">{confidenceBarLabel}</p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">Billing Risk Level</p>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div className={`h-2 rounded-full ${riskColor}`} style={{ width: `${riskScore}%` }} />
                        </div>
                        <p className="text-sm font-medium text-gray-900">{riskBarLabel}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`rounded-full px-3 py-1 text-xs font-medium ${confidenceClass}`}>
                        {confidenceText}
                      </div>
                      <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                        Review Recommended
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-gray-200" />

                  <div className="space-y-3">
                    <p className="max-w-[60ch] text-sm text-gray-700">{quickVerdict}</p>
                    <p className="text-sm font-semibold text-red-700">
                      Do not pay this bill before reviewing the issues below.
                    </p>
                    <p className="max-w-[60ch] text-sm text-gray-500">
                      Many patients identify billing errors before payment using similar analysis.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
              <article className={baseCardClass}>
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-950">Summary</h2>
                  <p className="max-w-[60ch] text-sm text-gray-700">{quickVerdict}</p>
                  <p className="max-w-[60ch] text-sm text-gray-700">
                    {report.concern_level.reason}
                  </p>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-950">Key Findings</h2>
                  <div className="space-y-4">
                    {analysisJson.issues.map((issue) => (
                      <div
                        key={issue.title}
                        className="flex gap-4 rounded-xl border border-red-100 bg-red-50 p-4 transition duration-150 ease-out hover:-translate-y-[1px] hover:shadow-sm"
                      >
                        <div className="w-[4px] rounded-full bg-red-500" />
                        <div className="min-w-0 space-y-3">
                          <div className="text-lg font-semibold tracking-tight text-gray-950">
                            {normalizeIssueTitle(issue.title)}
                          </div>
                          <p className="max-w-[60ch] text-sm text-gray-700">
                            {normalizeIssueDescription(issue.title, issue.description)}
                          </p>
                          <div className="text-sm font-semibold text-gray-900">
                            Estimated impact: {issue.impact_range}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-950">
                    Professional Review Insight
                  </h2>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                    <p className="max-w-[60ch] text-sm text-gray-700">
                      {professionalInsight}
                    </p>
                  </div>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-950">What This Means</h2>
                  <p className="max-w-[60ch] text-sm text-gray-700">{meaningText}</p>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-950">Diagnostic Overview</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="text-sm font-medium text-gray-500">Likelihood Score</div>
                      <div className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
                        {likelihoodScore}
                        <span className="text-lg text-gray-400">/100</span>
                      </div>
                      <p className="mt-2 max-w-[36ch] text-sm text-gray-700">
                        Indicates how strongly the identified patterns support a billing issue.
                      </p>
                    </div>

                    <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                      <div className="text-sm font-medium text-gray-500">Confidence Level</div>
                      <div className="mt-2 text-base font-semibold tracking-tight text-gray-950">{confidenceText}</div>
                      <p className="mt-2 max-w-[36ch] text-sm text-gray-700">
                        Based on how clearly the document shows charge patterns worth reviewing.
                      </p>
                    </div>

                    <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                      <div className="text-sm font-medium text-gray-500">Priority Action</div>
                      <div className="mt-2 text-base font-semibold tracking-tight text-gray-950">{priorityAction}</div>
                    </div>

                    <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                      <div className="text-sm font-medium text-gray-500">Expected Outcome</div>
                      <div className="mt-2 text-base font-semibold tracking-tight text-gray-950">{expectedOutcome}</div>
                    </div>

                    <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 sm:col-span-2">
                      <div className="text-sm font-medium text-gray-500">Estimated Resolution Time</div>
                      <div className="mt-2 text-base font-semibold tracking-tight text-gray-950">{resolutionTime}</div>
                    </div>
                  </div>
                </div>
              </article>
              </div>

              <div className="space-y-4 lg:sticky lg:top-6">
              <article className={baseCardClass}>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                        Copy and read this directly
                      </div>
                      <h2 className="text-lg font-semibold tracking-tight text-gray-950">What to Say When You Call</h2>
                      <div className="text-sm text-gray-700">
                        Use this script to explain the issue clearly and request a review.
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                      <button
                        className={`${secondaryButtonClass} sm:w-auto`}
                        type="button"
                        onClick={() => setScriptExpanded((value) => !value)}
                      >
                        {scriptExpanded ? "Collapse" : "Expand"}
                      </button>
                      <button
                        className={`${secondaryButtonClass} sm:w-auto`}
                        type="button"
                        onClick={() =>
                          void handleCopyScript(
                            phoneScriptSections.join("\n\n"),
                            "phone",
                          )
                        }
                      >
                        {copiedScript === "phone" ? "Copied" : "Copy Script"}
                      </button>
                    </div>
                  </div>

                  {scriptExpanded ? (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                            Opening line
                          </div>
                          <p className="mt-2 max-w-[60ch] text-sm text-gray-700">
                            {phoneScriptSections[0]}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                            Issue statement
                          </div>
                          <p className="mt-2 max-w-[60ch] text-sm text-gray-700">
                            {phoneScriptSections[1]}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                            Request for review
                          </div>
                          <p className="mt-2 max-w-[60ch] text-sm text-gray-700">
                            {phoneScriptSections[2]}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                            Fallback if denied
                          </div>
                          <p className="mt-2 max-w-[60ch] text-sm text-gray-700">
                            {phoneScriptSections[3]}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                            Closing statement
                          </div>
                          <p className="mt-2 max-w-[60ch] text-sm text-gray-700">
                            {phoneScriptSections[4]}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="max-w-[60ch] text-sm text-gray-500">Tip: Have your bill in front of you when calling.</div>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Ready to send
                      </div>
                      <h2 className="text-lg font-semibold tracking-tight text-gray-950">Written Dispute Email</h2>
                      <div className="text-sm text-gray-700">
                        Subject line and email body generated from the issues identified in this bill.
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                      <button
                        className={`${secondaryButtonClass} sm:w-auto`}
                        type="button"
                        onClick={() => setEmailExpanded((value) => !value)}
                      >
                        {emailExpanded ? "Collapse" : "Expand"}
                      </button>
                      <button
                        className={`${secondaryButtonClass} sm:w-auto`}
                        type="button"
                        onClick={() =>
                          void handleCopyScript(
                            `Subject: ${disputeEmail.subject}\n\n${disputeEmail.body}`,
                            "email",
                          )
                        }
                      >
                        {copiedScript === "email" ? "Copied" : "Copy Email"}
                      </button>
                    </div>
                  </div>

                  {emailExpanded ? (
                    <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Subject line
                          </div>
                          <p className="mt-2 max-w-[60ch] text-sm text-gray-700">
                            {disputeEmail.subject}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Email body
                          </div>
                          <div className="mt-2 whitespace-pre-line text-sm text-gray-700">
                            {disputeEmail.body}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-950">Recommended Steps</h2>
                  <div className="space-y-2">
                    {[
                      "Contact the billing department",
                      "Request an itemized review",
                      "Reference the issues identified above",
                      "Request a corrected statement",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-gray-700">
                        <span className="mt-0.5 text-blue-600">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-4">
                  <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-950">Download</h2>
                  <p className="max-w-[60ch] text-sm text-gray-700">
                    Save this report for your records before you call or email the billing department.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {isPaid ? (
                      <button
                        className={primaryButtonClass}
                        type="button"
                        onClick={() => void handleDownloadPdf()}
                        disabled={isDownloadingPdf}
                      >
                        {isDownloadingPdf ? "Preparing PDF..." : "Download Full Report (PDF)"}
                      </button>
                    ) : null}
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => void handleShareSummary()}
                    >
                      {shareFeedback || "Share Summary"}
                    </button>
                  </div>
                </div>
              </article>

              <article className={`${baseCardClass} border-blue-100`}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold tracking-tight text-gray-950">Next best step</h2>
                    <p className="text-sm text-gray-700">
                      Keep this report open while you call billing so you can reference the issues immediately.
                    </p>
                  </div>
                  <button
                    className={primaryButtonClass}
                    type="button"
                    onClick={() => void handleDownloadPdf()}
                    disabled={isDownloadingPdf}
                  >
                    {isDownloadingPdf ? "Preparing PDF..." : "Download Report and Start Review"}
                  </button>
                </div>
              </article>

              {!isPaid ? (
                <article className={baseCardClass}>
                  <div className="space-y-4">
                    <div className="text-xl font-semibold tracking-tight text-gray-950">Unlock Full Report</div>
                    <p className="max-w-[60ch] text-sm leading-relaxed text-gray-600">
                      See the full breakdown, exact next steps, and downloadable audit report.
                    </p>
                    <button
                      className={primaryButtonClass}
                      type="button"
                      onClick={() => void handleUnlockReport()}
                      disabled={isStartingCheckout}
                    >
                      {isStartingCheckout ? "Processing..." : "Unlock Full Report — $4.99"}
                    </button>
                  </div>
                </article>
              ) : null}
              </div>
            </section>

          </div>
        ) : null}
      </div>
    </main>
  );
}
