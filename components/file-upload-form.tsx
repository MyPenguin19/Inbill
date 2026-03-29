"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import {
  BILL_STORAGE_KEY,
  FILE_NAME_STORAGE_KEY,
  isAcceptedBillFile,
} from "@/lib/bill";

async function extractTextFromImage(file: File) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    const result = await worker.recognize(file);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}

export function FileUploadForm() {
  const [selectedFileName, setSelectedFileName] = useState("No file selected yet.");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setSelectedFileName(nextFile?.name ?? "No file selected yet.");
    setError("");
    setStatusMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setStatusMessage("");

    try {
      if (!file) {
        throw new Error("Please upload a PDF, image, or text file before checkout.");
      }

      if (!isAcceptedBillFile(file)) {
        throw new Error("Unsupported file type. Please upload a PDF, image, or text file.");
      }

      let extractedText = "";

      if (file.type.startsWith("image/")) {
        setStatusMessage("Reading text from image...");
        extractedText = await extractTextFromImage(file);
      } else {
        setStatusMessage("Extracting bill text...");

        const extractForm = new FormData();
        extractForm.set("file", file);

        const extractResponse = await fetch("/api/extract", {
          method: "POST",
          body: extractForm,
        });

        const extractPayload = (await extractResponse.json()) as {
          extractedText?: string;
          error?: string;
          fileName?: string;
        };

        if (!extractResponse.ok || !extractPayload.extractedText) {
          throw new Error(extractPayload.error || "Unable to extract bill text.");
        }

        extractedText = extractPayload.extractedText;
      }

      if (!extractedText.trim()) {
        throw new Error("We could not extract readable text from that file.");
      }

      window.sessionStorage.setItem(BILL_STORAGE_KEY, extractedText);
      window.sessionStorage.setItem(FILE_NAME_STORAGE_KEY, file.name);

      setStatusMessage("Redirecting to secure checkout...");

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to start checkout.");
      }

      window.location.href = payload.url;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while starting checkout.",
      );
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="upload-card" onSubmit={handleSubmit}>
      <label className="upload-label" htmlFor="bill-upload">
        Upload your bill
      </label>
      <input
        id="bill-upload"
        name="bill-upload"
        type="file"
        accept=".pdf,image/*,.txt"
        onChange={handleFileChange}
      />
      <p className="helper-text">
        Accepted formats: PDF, image, or text. Files are processed in memory only and are never stored.
      </p>
      <p className="selected-file">{selectedFileName}</p>
      {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Redirecting to Checkout..." : "Analyze My Bill"}
      </button>
    </form>
  );
}
