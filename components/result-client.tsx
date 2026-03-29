"use client";

import { useEffect, useState } from "react";

import { ReportView } from "@/components/report-view";
import {
  BILL_IMAGE_STORAGE_KEY,
  BILL_STORAGE_KEY,
  FILE_NAME_STORAGE_KEY,
} from "@/lib/bill";
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

  useEffect(() => {
    const savedBill = window.sessionStorage.getItem(BILL_STORAGE_KEY);
    const savedImage = window.sessionStorage.getItem(BILL_IMAGE_STORAGE_KEY);
    const savedFileName = window.sessionStorage.getItem(FILE_NAME_STORAGE_KEY);

    setBillText(savedBill || "");
    setBillImageData(savedImage || "");
    setFileName(savedFileName || "uploaded-medical-bill");
  }, []);

  const handleGenerateAnalysis = async () => {
    if (!billText.trim() && !billImageData.trim()) {
      setError("We could not find uploaded bill data for this session. Please upload your file again.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extractedText: billText,
          imageDataUrl: billImageData,
          sessionId,
        }),
      });

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
          ? analysisError.message
          : "Something went wrong while generating the analysis.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!report && !isLoading && (billText.trim() || billImageData.trim())) {
      void handleGenerateAnalysis();
    }
  }, [billImageData, billText, isLoading, report]);

  return (
    <div className="result-shell">
      <div className="status-card">
        <p className="eyebrow">Analysis workspace</p>
        <h1>Ready to analyze your bill</h1>
        <p>Reviewing {fileName}. The report will generate automatically when the bill data is ready.</p>
        <button className="primary-button" type="button" onClick={handleGenerateAnalysis} disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate Analysis Again"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <div className="preview-card">
        <p className="eyebrow">Input preview</p>
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
