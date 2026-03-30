"use client";

import { useEffect, useRef, useState } from "react";

import { ReportView } from "@/components/report-view";
import {
  BILL_IMAGE_STORAGE_KEY,
  BILL_STORAGE_KEY,
  FILE_NAME_STORAGE_KEY,
} from "@/lib/bill";
import { clearPendingBillPayload, getPendingBillPayload } from "@/lib/client-bill-session";
import type { AnalysisReport } from "@/lib/types";

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.ok
        ? "The server returned an unexpected response."
        : `Server error (${response.status}). Please redeploy and try again.`,
    );
  }

  return JSON.parse(bodyText) as T;
}

type ResultClientProps = {
  isPaid?: boolean;
  sessionId?: string;
};

export function ResultClient({ isPaid = true, sessionId }: ResultClientProps = {}) {
  const [billText, setBillText] = useState("");
  const [billImageData, setBillImageData] = useState("");
  const [fileName, setFileName] = useState("medical bill");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydratedInput, setHasHydratedInput] = useState(false);
  const hasAutoTriggered = useRef(false);

  useEffect(() => {
    const pendingPayload = getPendingBillPayload();

    if (pendingPayload) {
      setBillText(pendingPayload.billText);
      setBillImageData(pendingPayload.billImageData);
      setFileName(pendingPayload.fileName || "uploaded-medical-bill");
      clearPendingBillPayload();
      setHasHydratedInput(true);
      return;
    }

    const savedBill = window.sessionStorage.getItem(BILL_STORAGE_KEY);
    const savedImage = window.sessionStorage.getItem(BILL_IMAGE_STORAGE_KEY);
    const savedFileName = window.sessionStorage.getItem(FILE_NAME_STORAGE_KEY);

    setBillText(savedBill || "");
    setBillImageData(savedImage || "");
    setFileName(savedFileName || "uploaded-medical-bill");
    setHasHydratedInput(true);
  }, []);

  const handleGenerateAnalysis = async (nextBillText = billText, nextBillImageData = billImageData) => {
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
          sessionId,
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
            ? "Analysis timed out. Please try a smaller or clearer image."
            : analysisError.message
          : "Something went wrong while generating the analysis.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (
      hasHydratedInput &&
      !hasAutoTriggered.current &&
      !report &&
      !isLoading &&
      (billText.trim() || billImageData.trim())
    ) {
      hasAutoTriggered.current = true;
      void handleGenerateAnalysis(billText, billImageData);
    }
  }, [billImageData, billText, hasHydratedInput, isLoading, report]);

  return (
    <div className="result-shell">
      <div className="result-top-grid">
        <div className="result-hero-card">
          <p className="eyebrow">Analysis workspace</p>
          <h1>Reviewing your uploaded bill</h1>
          <p>
            Your report is generated from {fileName}. It focuses on likely patient responsibility, billing red
            flags, practical questions, and your next call steps.
          </p>

          <div className="result-metrics">
            <article className="result-metric-card issues">
              <strong>{report ? "Ready" : "Pending"}</strong>
              <span>Report status</span>
            </article>
            <article className="result-metric-card review">
              <strong>{billImageData ? "Image" : "Text"}</strong>
              <span>Document type</span>
            </article>
            <article className="result-metric-card ready">
              <strong>{isLoading ? "Running" : "Live"}</strong>
              <span>Analyzer state</span>
            </article>
          </div>
        </div>

        <div className="status-card">
          <p className="eyebrow">Actions</p>
          <p>Use this if you update the file or want to retry once your API setup is fixed.</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => void handleGenerateAnalysis()}
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Generate Analysis Again"}
          </button>
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>

      <div className="preview-card">
        <p className="eyebrow">Document preview</p>
        {billImageData ? (
          <img alt="Uploaded medical bill preview" className="bill-preview-image" src={billImageData} />
        ) : (
          <pre>{billText || "No uploaded bill text found in this browser session yet."}</pre>
        )}
      </div>

      {report ? <ReportView report={report} /> : null}
    </div>
  );
}
