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
const DISPUTE_LETTER_PDF_ID = "dispute-letter-pdf-content";

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

  const baseCardClass =
    "audit-card rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-150 ease-out hover:-translate-y-[1px] hover:shadow-md md:p-8";
  const primaryButtonClass =
    "audit-button w-full rounded-xl bg-black text-sm font-semibold text-white py-3 transition-all duration-150 ease-out hover:opacity-90 active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait";
  const secondaryButtonClass =
    "audit-button w-full rounded-xl border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 transition-all duration-150 ease-out hover:bg-gray-100 active:scale-[0.99]";
  const utilityButtonClass =
    "audit-button rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-150 ease-out hover:bg-gray-100";
  const confidenceClass =
    report?.concern_level.level === "HIGH"
      ? "bg-green-100 text-green-700"
      : report?.concern_level.level === "LOW"
        ? "bg-gray-100 text-gray-700"
        : "bg-amber-100 text-amber-700";

  async function handleDownloadLetterPdf() {
    if (!report) {
      return;
    }

    setIsDownloadingLetterPdf(true);

    try {
      const element = document.getElementById(DISPUTE_LETTER_PDF_ID);

      if (!element) {
        throw new Error("The dispute letter is not ready to download yet.");
      }

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;

      await html2pdf()
        .set({
          margin: 0.5,
          filename: `${fileName.replace(/\.[^/.]+$/, "") || "billfixa"}-dispute-letter.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
          },
          jsPDF: {
            unit: "in",
            format: "letter",
            orientation: "portrait",
          },
          pagebreak: {
            mode: ["css", "legacy"],
          },
        })
        .from(element)
        .save();
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to generate the dispute letter PDF right now.",
      );
    } finally {
      setIsDownloadingLetterPdf(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-100 px-4 py-12">
      <div className="mx-auto max-w-[720px] bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.03),transparent_60%)]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold tracking-tight text-gray-950">BillFixa</div>
            <div className="mt-1 text-sm font-medium text-gray-500">Generated by BillFixa.com</div>
          </div>

          <div className="audit-actions flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
            {!PAYWALL_ENABLED ? (
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                Test Mode — Full report visible
              </div>
            ) : null}
            {isPaid ? (
              <button
                className={`${primaryButtonClass} audit-mobile-full sm:w-auto sm:px-5`}
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={isDownloadingPdf}
              >
                {isDownloadingPdf ? "Preparing PDF..." : "Download Full Report (PDF)"}
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {error}
          </div>
        ) : null}

        {!report ? (
          <section className={`${baseCardClass} flex items-center gap-4`}>
            <div className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-gray-950">Generating your audit report</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                {isLoading
                  ? "Reviewing charges, denials, and payment risk now..."
                  : "Waiting for bill data to start analysis."}
              </p>
            </div>
          </section>
        ) : null}

        {report && analysisJson ? (
          <div className="space-y-10">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-gray-200 md:p-8">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:to-gray-100 before:opacity-30 before:content-[''] md:p-8">
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Medical Bill Audit Report
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
                      Prepared analysis of your medical charges
                    </h1>
                  </div>

                  <div className="audit-hero-meta space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Date generated
                    </div>
                    <div className="text-sm font-medium text-gray-900">{analyzedDate}</div>
                    <div className="text-sm text-gray-500">Prepared by BillFixa</div>
                  </div>
                </div>

                <div className="relative mt-8 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="space-y-2">
                      <div className="text-5xl font-semibold tracking-tight text-gray-950 md:text-6xl">
                        {overpaymentText}
                      </div>
                      <div className="text-sm text-gray-500">Estimated Overpayment</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`rounded-full px-3 py-1 text-sm font-semibold ${confidenceClass}`}>
                        {confidenceText}
                      </div>
                      <div className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                        Review Recommended
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-gray-200" />

                  <div className="space-y-2">
                    <div className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Verdict
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-gray-700">{quickVerdict}</p>
                    <p className="text-sm leading-relaxed text-gray-500">
                      This analysis is based on patterns commonly found in medical billing discrepancies.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-10">
              <article className={baseCardClass}>
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold tracking-tight text-gray-950">Key Findings</h2>
                  <div className="space-y-4">
                    {analysisJson.issues.map((issue) => (
                      <div
                        key={issue.title}
                        className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 transition duration-150 ease-out hover:-translate-y-[1px] hover:bg-gray-50 hover:shadow-sm"
                      >
                        <div className="w-[3px] rounded-full bg-red-500" />
                        <div className="min-w-0 space-y-2">
                          <div className="text-base font-semibold tracking-tight text-gray-950">{issue.title}</div>
                          <p className="text-sm leading-relaxed text-gray-600">{issue.description}</p>
                          <div className="text-sm font-semibold text-gray-900">Impact: {issue.impact_range}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight text-gray-950">What This Means</h2>
                  <p className="text-sm leading-relaxed text-gray-600">{meaningText}</p>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold tracking-tight text-gray-950">Recommended Next Steps</h2>
                  <div className="space-y-4">
                    {analysisJson.action_steps.map((step, index) => (
                      <div key={step} className="grid grid-cols-[28px_minmax(0,1fr)] gap-4 border-t border-gray-200 pt-4">
                        <div className="text-base font-semibold text-gray-950">{index + 1}.</div>
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-gray-900">
                            {index === 0
                              ? "Contact billing department"
                              : index === 1
                                ? "Request itemized review"
                                : index === 2
                                  ? "Reference specific issues"
                                  : "Request corrected statement"}
                          </div>
                          <div className="text-sm leading-relaxed text-gray-600">
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
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold tracking-tight text-gray-950">Suggested Call Script</h2>
                      <div className="text-sm leading-relaxed text-gray-600">{scriptConfidenceNote}</div>
                    </div>
                    <button
                      className={`${utilityButtonClass} audit-mobile-full sm:w-auto`}
                      type="button"
                      onClick={() => void handleCopyScript(detailedScript, "detailed")}
                    >
                      {copiedScript === "detailed" ? "Copied" : "Copy Script"}
                    </button>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
                    {splitScript(detailedScript).map((line) => (
                      <p
                        key={line}
                        className="mb-3 text-sm leading-relaxed text-gray-800 last:mb-0"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight text-gray-950">Negotiation Tip</h2>
                  <p className="text-sm leading-relaxed text-gray-600">{negotiationTip}</p>
                </div>
              </article>

              <article className={baseCardClass}>
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold tracking-tight text-gray-950">Written Dispute (Ready to Send)</h2>
                      <div className="text-sm leading-relaxed text-gray-600">
                        This letter can be sent as email or printed for formal follow-up.
                      </div>
                    </div>
                    <div className="audit-actions flex w-full flex-wrap gap-3 sm:w-auto">
                      <button
                        className={`${utilityButtonClass} audit-mobile-full sm:w-auto`}
                        type="button"
                        onClick={() => void handleCopyLetter(formalLetter, "formal")}
                      >
                        {copiedLetter === "formal" ? "Copied" : "Copy Letter"}
                      </button>
                      <button
                        className={`${secondaryButtonClass} audit-mobile-full sm:w-auto sm:px-5`}
                        type="button"
                        onClick={() => void handleDownloadLetterPdf()}
                        disabled={isDownloadingLetterPdf}
                      >
                        {isDownloadingLetterPdf ? "Preparing PDF..." : "Download PDF"}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Name</span>
                      <input
                        value={senderDetails.name}
                        onChange={(event) =>
                          setSenderDetails((current) => ({ ...current, name: event.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                        placeholder="Optional"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Email</span>
                      <input
                        value={senderDetails.email}
                        onChange={(event) =>
                          setSenderDetails((current) => ({ ...current, email: event.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                        placeholder="Optional"
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Address</span>
                      <textarea
                        value={senderDetails.address}
                        onChange={(event) =>
                          setSenderDetails((current) => ({ ...current, address: event.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                        placeholder="Optional"
                        rows={3}
                      />
                    </label>
                  </div>

                  <div
                    id={DISPUTE_LETTER_PDF_ID}
                    className="rounded-xl border border-gray-200 bg-white p-6 text-sm leading-relaxed text-gray-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <div className="mb-6 border-b border-gray-200 pb-4">
                      <div className="text-base font-semibold tracking-tight text-gray-950">
                        Medical Bill Dispute Letter
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Generated by BillFixa.com</div>
                    </div>

                    <div className="space-y-3 whitespace-pre-line">
                      {formalLetter.split("\n").map((line, index) => (
                        <p key={`${line}-${index}`} className="m-0">
                          {line || "\u00A0"}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>

              {!isPaid ? (
                <article className={baseCardClass}>
                  <div className="space-y-4">
                    <div className="text-xl font-semibold tracking-tight text-gray-950">Unlock Full Report</div>
                    <p className="text-sm leading-relaxed text-gray-600">
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
            </section>

            <footer className="flex flex-wrap items-center justify-between gap-3 pb-2 text-xs font-medium text-gray-500">
              <div>Generated by BillFixa</div>
              <div>For informational purposes only</div>
            </footer>
          </div>
        ) : null}
      </div>
    </main>
  );
}
