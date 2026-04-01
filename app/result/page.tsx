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

type SenderDetails = {
  name: string;
  email: string;
  address: string;
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
  if (report.concern_level.level === "HIGH") {
    return "This bill likely contains pricing or billing errors.";
  }

  if (report.concern_level.level === "LOW") {
    return "This bill still deserves a quick correction check before payment.";
  }

  return "This bill likely contains issues worth correcting before you pay.";
}

function buildMeaningText(report: AnalysisReport) {
  if (report.key_findings.length === 0) {
    return "This means your total bill may be higher than it should be. These issues are commonly corrected when patients contact billing.";
  }

  return "This means your total bill may be higher than it should be. These issues are commonly corrected when patients contact billing.";
}

function buildNegotiationTip() {
  return "Do not agree to pay until they review and confirm the charges, explain any denial, and issue a corrected balance if needed.";
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildDisputeLetterText(options: {
  report: AnalysisReport;
  sender: SenderDetails;
  variant: "email" | "formal";
}) {
  const base =
    options.variant === "email"
      ? options.report.dispute_letter?.email_version
      : options.report.dispute_letter?.formal_letter_version;

  const safeBase =
    base ||
    "Dear Billing Department,\n\nI am requesting a detailed review of my medical bill and any charges that may be incorrect.\n\nSincerely,\nPatient";

  const lines: string[] = [];

  if (options.variant === "formal") {
    if (options.sender.name.trim()) {
      lines.push(options.sender.name.trim());
    }

    if (options.sender.address.trim()) {
      lines.push(...options.sender.address.trim().split("\n").map((line) => line.trim()).filter(Boolean));
    }

    if (options.sender.email.trim()) {
      lines.push(options.sender.email.trim());
    }

    if (lines.length > 0) {
      lines.push("");
    }
  }

  lines.push(...safeBase.split("\n"));
  return lines.join("\n");
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
  segments.push({ text: buildNegotiationTip(), font: "F1", size: fontSize.body, gapAfter: 10 });
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

function buildLetterPdf(data: {
  sender: SenderDetails;
  fileName: string;
  letter: string;
}) {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 52;
  const maxWidth = pageWidth - left * 2;

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

  const commands: string[] = [];
  let y = pageHeight - 58;

  const addLine = (line: string, font: "F1" | "F2", size: number) => {
    commands.push(`BT /${font} ${size} Tf 1 0 0 1 ${left} ${y} Tm (${escapePdfText(line)}) Tj ET`);
    y -= size + 7;
  };

  addLine("BillFixa", "F2", 14);
  addLine("Medical Bill Dispute Letter", "F2", 22);
  y -= 6;

  for (const paragraph of data.letter.split("\n")) {
    if (!paragraph.trim()) {
      y -= 6;
      continue;
    }

    const lines = wrapText(paragraph, 11);
    for (const line of lines) {
      addLine(line, "F1", 11);
    }
  }

  y -= 10;
  addLine(`Generated by BillFixa.com`, "F1", 9);
  addLine(`Reference file: ${data.fileName}`, "F1", 9);

  const content = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [5 0 R] >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 5 0 R >>`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

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
  const [isDownloadingLetterPdf, setIsDownloadingLetterPdf] = useState(false);
  const [copiedScript, setCopiedScript] = useState<"short" | "detailed" | "">("");
  const [copiedLetter, setCopiedLetter] = useState<"email" | "formal" | "">("");
  const [senderDetails, setSenderDetails] = useState<SenderDetails>({
    name: "",
    email: "",
    address: "",
  });
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

  async function handleCopyScript(value: string, variant: "short" | "detailed") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedScript(variant);
      window.setTimeout(() => setCopiedScript(""), 1800);
    } catch {
      setCopiedScript("");
    }
  }

  async function handleCopyLetter(value: string, variant: "email" | "formal") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLetter(variant);
      window.setTimeout(() => setCopiedLetter(""), 1800);
    } catch {
      setCopiedLetter("");
    }
  }

  const overpaymentText = analysisJson ? formatCurrency(analysisJson.estimated_overpayment) : "$162.72";
  const totalBillText = analysisJson ? formatCurrency(analysisJson.total_bill) : "Not clearly stated";
  const confidenceText = report ? getConcernLabel(report.concern_level.level) : "High Confidence";
  const quickVerdict = report ? buildQuickVerdict(report) : "This bill likely contains pricing or billing errors.";
  const meaningText = report ? buildMeaningText(report) : "";
  const negotiationTip = buildNegotiationTip();
  const shortScript =
    report?.personalized_call_scripts?.short_version || report?.call_script || "Not clearly stated";
  const detailedScript =
    report?.personalized_call_scripts?.detailed_version || report?.call_script || "Not clearly stated";
  const scriptConfidenceNote =
    report?.personalized_call_scripts?.confidence_note || "This script is based on issues found in your bill";
  const emailLetter = report
    ? buildDisputeLetterText({
        report,
        sender: senderDetails,
        variant: "email",
      })
    : "";
  const formalLetter = report
    ? buildDisputeLetterText({
        report,
        sender: senderDetails,
        variant: "formal",
      })
    : "";

  async function handleDownloadLetterPdf() {
    if (!report) {
      return;
    }

    setIsDownloadingLetterPdf(true);

    try {
      const pdfBlob = buildLetterPdf({
        sender: senderDetails,
        fileName,
        letter: formalLetter,
      });
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName.replace(/\.[^/.]+$/, "") || "billfixa"}-dispute-letter.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setIsDownloadingLetterPdf(false);
    }
  }

  return (
    <main style={styles.page}>
      <style jsx global>{`
        .audit-shell {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
        }

        .audit-card {
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .audit-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 28px rgba(15, 23, 42, 0.08);
        }

      `}</style>

      <div className="audit-shell" style={styles.container}>
        <div style={styles.brandBar}>
          <div>
            <div style={styles.brand}>BillFixa</div>
            <div style={styles.brandSubtext}>Generated by BillFixa.com</div>
          </div>

          <div style={styles.actionsRow}>
            {!PAYWALL_ENABLED && <div style={styles.testModeBanner}>Test Mode — Full report visible</div>}
            {isPaid ? (
              <button
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={isDownloadingPdf}
                style={{
                  ...styles.downloadButton,
                  ...(isDownloadingPdf ? styles.buttonDisabled : {}),
                }}
              >
                {isDownloadingPdf ? "Preparing PDF..." : "Download Full Report (PDF)"}
              </button>
            ) : null}
          </div>
        </div>

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

        {report && analysisJson ? (
          <>
            <section className="audit-card" style={styles.heroCard}>
              <div style={styles.heroHeader}>
                <div>
                  <div style={styles.heroEyebrow}>Medical Bill Audit Report</div>
                  <h1 style={styles.heroTitle}>Prepared analysis of your medical charges</h1>
                </div>

                <div style={styles.headerMeta}>
                  <div style={styles.headerMetaLabel}>Date generated</div>
                  <div style={styles.headerMetaValue}>{analyzedDate}</div>
                  <div style={styles.headerMetaPrepared}>Prepared by BillFixa</div>
                </div>
              </div>

              <div style={styles.executiveBox}>
                <div style={styles.sectionTitle}>Executive Summary</div>
                <div style={styles.metricLabel}>Estimated Overpayment</div>
                <div style={styles.overpaymentValue}>{overpaymentText}</div>
                <div
                  style={{
                    ...styles.confidenceBadge,
                    background: concernTone.badge,
                    borderColor: concernTone.border,
                    color: concernTone.text,
                  }}
                >
                  {confidenceText}
                </div>
                <div style={styles.executiveVerdictLabel}>Verdict</div>
                <p style={styles.executiveVerdict}>{quickVerdict}</p>
                <div style={styles.divider} />
                <div style={styles.executiveFootnote}>
                  This analysis is based on patterns commonly found in medical billing discrepancies.
                </div>
              </div>
            </section>

            <section style={styles.sectionStack}>
              <article className="audit-card" style={styles.card}>
                <h2 style={styles.sectionTitle}>Key Findings</h2>
                <div style={styles.issueList}>
                  {analysisJson.issues.map((issue) => (
                    <div key={issue.title} style={styles.issueCard}>
                      <div style={styles.issueTitle}>{issue.title}</div>
                      <p style={styles.issueDescription}>{issue.description}</p>
                      <div style={styles.issueImpact}>Estimated impact: {issue.impact_range}</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="audit-card" style={styles.card}>
                <h2 style={styles.sectionTitle}>What This Means</h2>
                <p style={styles.bodyText}>{meaningText}</p>
              </article>

              <article className="audit-card" style={styles.card}>
                <h2 style={styles.sectionTitle}>Recommended Next Steps</h2>
                <div style={styles.actionPlan}>
                  {analysisJson.action_steps.map((step, index) => (
                    <div key={step} style={styles.actionRow}>
                      <div style={styles.actionNumber}>{index + 1}</div>
                      <div>
                        <div style={styles.actionTitle}>
                          {index === 0
                            ? "Contact billing department"
                            : index === 1
                              ? "Request itemized review"
                              : index === 2
                                ? "Reference specific issues"
                                : "Request corrected statement"}
                        </div>
                        <div style={styles.actionHint}>
                          {index === 0
                            ? "Call the billing department before making any payment."
                            : index === 1
                              ? "Ask for a line-by-line review of the charges shown on the bill."
                              : index === 2
                                ? "Reference the findings in this report and ask them to verify each item."
                                : "Request a corrected statement after review is complete."}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="audit-card" style={styles.card}>
                <div style={styles.personalizedHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Suggested Call Script</h2>
                    <div style={styles.scriptConfidence}>{scriptConfidenceNote}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopyScript(detailedScript, "detailed")}
                    style={styles.copyButton}
                  >
                    {copiedScript === "detailed" ? "Copied" : "Copy Script"}
                  </button>
                </div>

                <div style={styles.scriptHighlightBox}>
                  {splitScript(detailedScript).map((line) => (
                    <p key={line} style={styles.scriptLine}>
                      {line}
                    </p>
                  ))}
                </div>
              </article>

              <article className="audit-card" style={styles.card}>
                <h2 style={styles.sectionTitle}>Negotiation Tip</h2>
                <p style={styles.bodyText}>{negotiationTip}</p>
              </article>

              <article className="audit-card" style={styles.card}>
                <div style={styles.personalizedHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Written Dispute (Ready to Send)</h2>
                    <div style={styles.scriptConfidence}>
                      This letter can be sent as email or printed for formal follow-up.
                    </div>
                  </div>
                  <div style={styles.letterActions}>
                    <button
                      type="button"
                      onClick={() => void handleCopyLetter(formalLetter, "formal")}
                      style={styles.copyButton}
                    >
                      {copiedLetter === "formal" ? "Copied" : "Copy Letter"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadLetterPdf()}
                      disabled={isDownloadingLetterPdf}
                      style={styles.secondaryCopyButton}
                    >
                      {isDownloadingLetterPdf ? "Preparing PDF..." : "Download PDF"}
                    </button>
                  </div>
                </div>

                <div style={styles.senderGrid}>
                  <label style={styles.field}>
                    <span style={styles.fieldLabel}>Name</span>
                    <input
                      value={senderDetails.name}
                      onChange={(event) =>
                        setSenderDetails((current) => ({ ...current, name: event.target.value }))
                      }
                      style={styles.input}
                      placeholder="Optional"
                    />
                  </label>
                  <label style={styles.field}>
                    <span style={styles.fieldLabel}>Email</span>
                    <input
                      value={senderDetails.email}
                      onChange={(event) =>
                        setSenderDetails((current) => ({ ...current, email: event.target.value }))
                      }
                      style={styles.input}
                      placeholder="Optional"
                    />
                  </label>
                  <label style={{ ...styles.field, ...styles.fullWidthField }}>
                    <span style={styles.fieldLabel}>Address</span>
                    <textarea
                      value={senderDetails.address}
                      onChange={(event) =>
                        setSenderDetails((current) => ({ ...current, address: event.target.value }))
                      }
                      style={styles.textarea}
                      placeholder="Optional"
                      rows={3}
                    />
                  </label>
                </div>

                <div style={styles.letterDocument}>
                  {formalLetter.split("\n").map((line, index) => (
                    <p key={`${line}-${index}`} style={styles.letterLine}>
                      {line || "\u00A0"}
                    </p>
                  ))}
                </div>
              </article>

              {!isPaid ? (
                <article className="audit-card" style={styles.paywallCard}>
                  <div style={styles.paywallTitle}>Unlock Full Report</div>
                  <p style={styles.paywallText}>
                    See the full breakdown, exact next steps, and downloadable audit report.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleUnlockReport()}
                    disabled={isStartingCheckout}
                    style={{
                      ...styles.paywallButton,
                      ...(isStartingCheckout ? styles.buttonDisabled : {}),
                    }}
                  >
                    {isStartingCheckout ? "Processing..." : "Unlock Full Report — $4.99"}
                  </button>
                </article>
              ) : null}
            </section>

            <footer style={styles.footer}>
              <div>Generated by BillFixa.com</div>
              <div>Not medical or legal advice</div>
            </footer>
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
    maxWidth: 720,
    margin: "0 auto",
  },
  brandBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  brand: {
    color: "#0f172a",
    fontSize: 21,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  brandSubtext: {
    marginTop: 6,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.6,
    fontWeight: 700,
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  testModeBanner: {
    border: "1px solid #dbe3ea",
    background: "#f8fafc",
    color: "#475569",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 700,
  },
  downloadButton: {
    border: "none",
    background: "#0f7757",
    color: "#ffffff",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(15, 119, 87, 0.18)",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "wait",
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
    padding: 22,
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
  heroCard: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 24,
    boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
    marginBottom: 20,
  },
  heroHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  heroEyebrow: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(1.8rem, 3vw, 2rem)",
    lineHeight: 1.1,
    letterSpacing: "-0.04em",
    fontWeight: 900,
  },
  headerMeta: {
    display: "grid",
    gap: 4,
    textAlign: "right",
  },
  headerMetaLabel: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  headerMetaValue: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 700,
  },
  headerMetaPrepared: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 1.5,
    fontWeight: 600,
  },
  confidenceBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  executiveBox: {
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    padding: 20,
  },
  metricLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  overpaymentValue: {
    color: "#0f172a",
    fontSize: "clamp(2.5rem, 5vw, 3rem)",
    lineHeight: 1,
    letterSpacing: "-0.06em",
    fontWeight: 900,
    marginBottom: 14,
  },
  executiveVerdictLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  executiveVerdict: {
    margin: 0,
    color: "#111827",
    fontSize: 15,
    lineHeight: 1.7,
    fontWeight: 700,
  },
  divider: {
    height: 1,
    background: "#e5e7eb",
    margin: "16px 0",
  },
  executiveFootnote: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  sectionStack: {
    display: "grid",
    gap: 18,
  },
  card: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 22,
    boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
  },
  sectionTitle: {
    margin: "0 0 16px",
    color: "#0f172a",
    fontSize: 20,
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: "-0.03em",
  },
  issueList: {
    display: "grid",
    gap: 14,
  },
  issueCard: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: 14,
  },
  issueTitle: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 1.3,
    fontWeight: 800,
    marginBottom: 8,
  },
  issueImpact: {
    color: "#111827",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 800,
  },
  issueDescription: {
    margin: "0 0 10px",
    color: "#374151",
    fontSize: 14,
    lineHeight: 1.75,
    fontWeight: 500,
  },
  bodyText: {
    margin: 0,
    color: "#374151",
    fontSize: 15,
    lineHeight: 1.8,
    fontWeight: 500,
  },
  actionPlan: {
    display: "grid",
    gap: 14,
  },
  actionRow: {
    display: "grid",
    gridTemplateColumns: "30px minmax(0, 1fr)",
    gap: 12,
    alignItems: "start",
    paddingTop: 12,
    borderTop: "1px solid #e5e7eb",
  },
  actionNumber: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 1.5,
    fontWeight: 800,
  },
  actionTitle: {
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 1.5,
    fontWeight: 800,
    marginBottom: 4,
  },
  actionHint: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 1.7,
    fontWeight: 500,
  },
  scriptHighlightBox: {
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  scriptLine: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: 14,
    lineHeight: 1.85,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  paywallCard: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 22,
    boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
  },
  paywallTitle: {
    color: "#0f172a",
    fontSize: 22,
    lineHeight: 1.15,
    fontWeight: 900,
    marginBottom: 8,
  },
  paywallText: {
    margin: "0 0 14px",
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  paywallButton: {
    width: "100%",
    border: "none",
    background: "#111827",
    color: "#ffffff",
    borderRadius: 10,
    padding: "14px 16px",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(15, 119, 87, 0.18)",
  },
  personalizedHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  scriptConfidence: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 1.7,
    fontWeight: 600,
    marginTop: -6,
  },
  copyButton: {
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  scriptVariantGrid: {
    display: "grid",
    gap: 12,
  },
  letterActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  scriptVariantCard: {
    display: "grid",
    gap: 10,
  },
  scriptVariantLabel: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 1.4,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  secondaryCopyButton: {
    justifySelf: "start",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  senderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  field: {
    display: "grid",
    gap: 6,
  },
  fullWidthField: {
    gridColumn: "1 / -1",
  },
  fieldLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    border: "1px solid #d7dee5",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 10,
    padding: "11px 12px",
    fontSize: 14,
    lineHeight: 1.5,
  },
  textarea: {
    width: "100%",
    border: "1px solid #d7dee5",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 10,
    padding: "11px 12px",
    fontSize: 14,
    lineHeight: 1.5,
    resize: "vertical",
    fontFamily: "inherit",
  },
  letterBox: {
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    borderRadius: 12,
    padding: 16,
  },
  letterDocument: {
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    borderRadius: 12,
    padding: 20,
  },
  letterLine: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: 14,
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.6,
    fontWeight: 700,
    padding: "6px 2px 0",
  },
};
