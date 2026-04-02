"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ClipboardList, FileSearch, FileText } from "lucide-react";

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

const steps = [
  {
    icon: FileText,
    title: "Upload your bill",
    description: "PDF, screenshot, or photo",
  },
  {
    icon: FileSearch,
    title: "We analyze for common billing issues",
    description: "Duplicate charges, denial patterns, and pricing problems",
  },
  {
    icon: ClipboardList,
    title: "See what to question before paying",
    description: "A clear breakdown of what deserves a second look",
  },
] as const;

const valuePoints = [
  "Flags duplicate charges and billing mistakes",
  "Highlights charges worth questioning before payment",
  "Gives you a script you can use when calling billing",
  "Creates a faster path to a corrected statement",
] as const;

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    <main className="min-h-screen py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="mx-auto w-full max-w-[1280px] space-y-10 px-6 lg:px-12">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div className="space-y-6">
              <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Medical Bill Review
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl font-semibold tracking-tight text-gray-950 md:text-6xl">
                  You could be overpaying your medical bill by{" "}
                  <span className="text-blue-600">$500-$2,000</span>
                </h1>
                <p className="max-w-[60ch] text-sm leading-relaxed text-gray-600 md:text-base">
                  Scan your bill in seconds and detect errors before you pay.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex w-full max-w-sm rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                  type="button"
                >
                  Upload Your Bill
                </button>
                <div className="text-sm text-gray-500">Takes less than 60 seconds • No account required</div>
                <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                  <span>No signup required</span>
                  <span>•</span>
                  <span>Secure & private</span>
                  <span>•</span>
                  <span>Results in seconds</span>
                </div>
                <div className="max-w-[60ch] text-sm leading-relaxed text-gray-500">
                  Many patients find billing errors before payment using similar reviews.
                </div>
              </div>
            </div>

            <div id="analyze" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight text-gray-950">Upload your bill</h2>
                  <p className="text-sm leading-relaxed text-gray-600">
                    Drag and drop a PDF or image to start your review.
                  </p>
                </div>

                <label
                  className={`grid cursor-pointer justify-items-center gap-3 rounded-2xl border border-dashed p-8 text-center transition ${
                    dragActive ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
                  }`}
                  onDragLeave={() => setDragActive(false)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    accept=".pdf,image/*,.txt"
                    onChange={handleFileInput}
                    className="hidden"
                    type="file"
                  />
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                    Drag & drop or click to upload
                  </div>
                  <div className="text-sm font-medium text-gray-900">Upload your bill here</div>
                  <div className="text-sm text-gray-500">Accepted files: PDF, JPG, PNG</div>
                </label>

                {selectedFile ? (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-950">{selectedFile.name}</div>
                      <div className="text-sm text-gray-500">{fileSummary}</div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-900 transition-all duration-200 hover:border-gray-400 hover:bg-gray-100"
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
                  className="w-full rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                  type="button"
                >
                  {loading ? "Preparing..." : "Analyze My Bill — $4.99"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Example result</div>
              <h2 className="text-3xl font-semibold tracking-tight text-gray-950">$162.72 potential overcharge</h2>
              <p className="max-w-[60ch] text-sm leading-relaxed text-gray-600">
                A quick review can surface the exact items worth questioning before payment.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex w-full max-w-sm rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.99]"
                type="button"
              >
                Analyze My Bill — $4.99
              </button>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                  <div className="text-sm font-semibold text-blue-700">Negotiation Strategy</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    Ask for an itemized review and request clarification on charges before payment is expected.
                  </p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 p-5">
                  <div className="text-sm font-semibold text-green-700">Suggested Script</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    I reviewed my bill and found charges that need clarification before I make payment.
                  </p>
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">
                  <div className="text-sm font-semibold text-purple-700">Next Steps</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    Contact billing, reference the flagged charges, and request a corrected statement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">How it works</h2>
            <p className="text-sm leading-relaxed text-gray-600">Three quick steps to check the bill before you pay it.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((item) => (
              <article key={item.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-700">
                  <item.icon size={18} />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-gray-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">What you get</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                A focused review designed to help you spot costly issues before sending payment.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {valuePoints.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <span className="mt-0.5 text-green-600">
                    <CheckCircle2 size={16} />
                  </span>
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">Built for private medical documents</h2>
            <p className="max-w-[60ch] text-sm leading-relaxed text-gray-600">
              BillFixa is designed to help patients review sensitive billing documents quickly, without adding signup friction or unnecessary steps.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">Check your bill before you pay it</h2>
              <p className="text-sm leading-relaxed text-gray-600">Upload once, review the issues, and decide what to question before sending money.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex w-full sm:w-auto rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                type="button"
              >
                Analyze My Bill — $4.99
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
