"use client";

import { useEffect, useState } from "react";

import { ReportView } from "@/components/report-view";
import { BILL_STORAGE_KEY, FILE_NAME_STORAGE_KEY } from "@/lib/bill";
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
  const [fileName, setFileName] = useState("medical bill");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedBill = window.sessionStorage.getItem(BILL_STORAGE_KEY);
    const savedFileName = window.sessionStorage.getItem(FILE_NAME_STORAGE_KEY);

    setBillText(savedBill || "");
    setFileName(savedFileName || "uploaded-medical-bill");
  }, []);

  const handleGenerateAnalysis = async () => {
    if (!billText.trim()) {
      setError("We could not find uploaded bill text for this session. Please upload your file again.");
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

  return (
    <div className="result-shell">
      <div className="status-card">
        <p className="eyebrow">Analysis workspace</p>
        <h1>Ready to analyze your bill</h1>
        <p>Reviewing {fileName}. Generate the report when you are ready.</p>
        <button className="primary-button" type="button" onClick={handleGenerateAnalysis} disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate Analysis"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <div className="preview-card">
        <p className="eyebrow">Input preview</p>
        <pre>{billText || "No uploaded bill text found in this browser session yet."}</pre>
      </div>

      {report ? <ReportView report={report} /> : null}
    </div>
  );
}
