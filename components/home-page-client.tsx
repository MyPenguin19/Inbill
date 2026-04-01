"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeDollarSign, ClipboardList, FileSearch, FileText, Receipt, ShieldX } from "lucide-react";

import {
  BILL_IMAGE_STORAGE_KEY,
  BILL_STORAGE_KEY,
  FILE_NAME_STORAGE_KEY,
  BILL_UPLOAD_STATE_KEY,
  isAcceptedBillFile,
} from "@/lib/bill";
import { clearPendingBillPayload, setPendingBillPayload } from "@/lib/client-bill-session";

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.ok
        ? "The server returned an unexpected response."
        : `Server error (${response.status}). Please check deployment protection and environment variables.`,
    );
  }

  return JSON.parse(bodyText) as T;
}

const moneyLossCards = [
  {
    icon: Receipt,
    title: "Duplicate Charges",
    description: "Same service billed multiple times",
    impact: "+$180",
  },
  {
    icon: ShieldX,
    title: "Insurance Errors",
    description: "Claims denied or misapplied",
    impact: "+$420",
  },
  {
    icon: BadgeDollarSign,
    title: "Overpriced Services",
    description: "Routine procedures billed above standard rates",
    impact: "+$250",
  },
  {
    icon: ClipboardList,
    title: "Missing Adjustments",
    description: "Discounts or negotiated rates not applied",
    impact: "+$145",
  },
] as const;

const steps = [
  {
    icon: FileText,
    title: "Upload your bill",
    description: "PDF, screenshot, or photo",
  },
  {
    icon: FileSearch,
    title: "AI analyzes it",
    description: "Finds errors, duplicates, and pricing issues",
  },
  {
    icon: ClipboardList,
    title: "Get your report",
    description: "See what to challenge and what to say before paying",
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileSummary = useMemo(() => {
    if (!selectedFile) {
      return "";
    }

    const sizeInMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
    return `${selectedFile.name} • ${sizeInMb} MB`;
  }, [selectedFile]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Unable to read the selected file."));
      reader.readAsDataURL(file);
    });

  const compressImageDataUrl = (dataUrl: string) =>
    new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Unable to prepare the uploaded image."));
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("Unable to process the uploaded image."));
      image.src = dataUrl;
    });

  const handleSelectedFile = async (file: File | null) => {
    setError("");

    if (!file) {
      setSelectedFile(null);
      setSelectedFileData("");
      return;
    }

    setSelectedFile(file);

    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      const dataUrl = file.type.startsWith("image/") ? await compressImageDataUrl(rawDataUrl) : rawDataUrl;
      setSelectedFileData(dataUrl);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Unable to read the selected file.");
      setSelectedFileData("");
    }
  };

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    await handleSelectedFile(file);
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    await handleSelectedFile(file);
  };

  const handleAnalyze = async () => {
    setError("");

    if (!selectedFile) {
      setError("Upload your medical bill to start the analysis.");
      return;
    }

    setLoading(true);

    try {
      if (!isAcceptedBillFile(selectedFile)) {
        throw new Error("Unsupported file type. Please upload a PDF, image, or text file.");
      }

      let extractedText = "";

      if (!selectedFile.type.startsWith("image/")) {
        const extractForm = new FormData();
        extractForm.set("file", selectedFile);

        const extractResponse = await fetch("/api/extract", {
          method: "POST",
          body: extractForm,
        });

        const extractPayload = await readJsonResponse<{
          extractedText?: string;
          error?: string;
        }>(extractResponse);

        if (!extractResponse.ok || !extractPayload.extractedText) {
          throw new Error(extractPayload.error || "Unable to extract bill text.");
        }

        extractedText = extractPayload.extractedText;
      }

      if (!extractedText.trim() && !selectedFileData.trim()) {
        throw new Error("We could not extract readable bill text from that file.");
      }

      if (!selectedFile.type.startsWith("image/")) {
        window.sessionStorage.setItem(BILL_STORAGE_KEY, extractedText);
        window.sessionStorage.removeItem(BILL_IMAGE_STORAGE_KEY);
      } else {
        window.sessionStorage.removeItem(BILL_STORAGE_KEY);
        window.sessionStorage.removeItem(BILL_IMAGE_STORAGE_KEY);
      }

      window.sessionStorage.setItem(FILE_NAME_STORAGE_KEY, selectedFile.name);
      window.sessionStorage.setItem(BILL_UPLOAD_STATE_KEY, "ready");
      window.sessionStorage.setItem("hasFile", "true");

      setPendingBillPayload({
        billText: extractedText,
        billImageData: selectedFile.type.startsWith("image/") ? selectedFileData : "",
        fileName: selectedFile.name,
      });

      router.push("/result");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to start your review.");
      setLoading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setSelectedFileData("");
    clearPendingBillPayload();
    window.sessionStorage.removeItem(BILL_STORAGE_KEY);
    window.sessionStorage.removeItem(BILL_IMAGE_STORAGE_KEY);
    window.sessionStorage.removeItem(FILE_NAME_STORAGE_KEY);
    window.sessionStorage.removeItem(BILL_UPLOAD_STATE_KEY);
    window.sessionStorage.removeItem("hasFile");
    setError("");
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BillFixa",
    description: "Tool to detect and fix medical billing errors before payment",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-100 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 md:px-6 lg:px-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Medical Bill Review
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-gray-950 md:text-5xl">
                  Fix billing errors before you pay
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-gray-600 md:text-base">
                  Upload your bill, find hidden charges, and get a clear action plan in under 60 seconds.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  disabled={loading}
                  onClick={handleAnalyze}
                  className="inline-flex rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                  type="button"
                >
                  {loading ? "Preparing..." : "Fix My Bill — $4.99"}
                </button>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  <span>No account required</span>
                  <span>Secure processing</span>
                  <span>Files automatically deleted</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Example result
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">$320 identified</div>
                  </div>
                  <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    Review recommended
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">85025</span>
                    <span className="font-medium text-gray-900">$52.05</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm">
                    <span className="font-medium text-red-700">Duplicate charge detected</span>
                    <span className="font-semibold text-red-700">+$52.05</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Insurance adjustment missing</span>
                    <span className="font-medium text-gray-900">$215.50</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="analyze" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">Upload your bill</h2>
              <p className="text-sm leading-relaxed text-gray-600">PDF, screenshot, or photo. We’ll prepare the report before you pay.</p>
            </div>

            <label
              className={`grid cursor-pointer justify-items-center gap-3 rounded-2xl border border-dashed p-8 text-center transition ${
                dragActive ? "border-gray-900 bg-gray-100" : "border-gray-300 bg-gray-50"
              }`}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDrop={handleDrop}
            >
              <input accept=".pdf,image/*,.txt" onChange={handleFileInput} className="hidden" type="file" />
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                Upload Your Bill
              </div>
              <div className="text-sm font-medium text-gray-900">Drag and drop your file here</div>
              <div className="text-sm text-gray-500">PDF, image, or screenshot</div>
            </label>

            {selectedFile ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div>
                  <div className="text-sm font-semibold text-gray-950">{selectedFile.name}</div>
                  <div className="text-sm text-gray-500">{fileSummary}</div>
                </div>
                <button
                  onClick={removeFile}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-white"
                  type="button"
                >
                  Remove
                </button>
              </div>
            ) : null}

            {error ? <div className="text-sm font-medium text-red-700">{error}</div> : null}

            <button
              disabled={loading}
              onClick={handleAnalyze}
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
              type="button"
            >
              {loading ? "Preparing..." : "Fix My Bill — $4.99"}
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">How it works</h2>
            <p className="text-sm leading-relaxed text-gray-600">A fast workflow designed to help you review the bill before sending money.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((item) => (
              <article key={item.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900">
                  <item.icon size={18} />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-gray-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">Example result preview</h2>
            <p className="text-sm leading-relaxed text-gray-600">A snapshot of the kind of issues and actions the report highlights.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {moneyLossCards.map((item) => (
              <article key={item.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900">
                    <item.icon size={18} />
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-gray-950">{item.impact}</div>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-gray-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">Check your bill before you pay it</h2>
              <p className="text-sm leading-relaxed text-gray-600">One report, one action plan, one clear next step.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/sample"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                See sample
                <ArrowRight size={16} />
              </Link>
              <button
                disabled={loading}
                onClick={handleAnalyze}
                className="inline-flex rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                type="button"
              >
                {loading ? "Preparing..." : "Fix My Bill — $4.99"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
