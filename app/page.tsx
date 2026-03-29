"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";

import {
  BILL_IMAGE_STORAGE_KEY,
  BILL_STORAGE_KEY,
  FILE_NAME_STORAGE_KEY,
  isAcceptedBillFile,
} from "@/lib/bill";

const loadingSteps = [
  "Reading your file",
  "Extracting bill details",
  "Preparing your review workspace",
  "Opening analysis",
];

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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"upload" | "notes">("upload");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState("");
  const [notesText, setNotesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleStep, setVisibleStep] = useState(0);
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

  const handleSelectedFile = async (file: File | null) => {
    setError("");

    if (!file) {
      setSelectedFile(null);
      setSelectedFileData("");
      return;
    }

    setSelectedFile(file);

    try {
      const dataUrl = await readFileAsDataUrl(file);
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

    if (activeTab === "upload" && !selectedFile) {
      setError("Choose a bill file before starting the review.");
      return;
    }

    if (activeTab === "notes" && !notesText.trim()) {
      setError("Paste a few bill details first so the analysis has something to review.");
      return;
    }

    setLoading(true);
    setVisibleStep(0);

    try {
      let extractedText = "";

      if (activeTab === "upload" && selectedFile) {
        if (!isAcceptedBillFile(selectedFile)) {
          throw new Error("Unsupported file type. Please upload a PDF, image, or text file.");
        }

        setVisibleStep(1);

        if (selectedFile.type.startsWith("image/")) {
          window.sessionStorage.setItem(BILL_STORAGE_KEY, "");
          window.sessionStorage.setItem(BILL_IMAGE_STORAGE_KEY, selectedFileData);
        } else {
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
      } else {
        extractedText = notesText.trim();
      }

      if (!extractedText.trim() && !selectedFileData.trim()) {
        throw new Error("We could not extract readable bill text from that input.");
      }

      if (!selectedFile?.type.startsWith("image/")) {
        window.sessionStorage.setItem(BILL_STORAGE_KEY, extractedText);
        window.sessionStorage.removeItem(BILL_IMAGE_STORAGE_KEY);
      } else if (activeTab !== "upload") {
        window.sessionStorage.setItem(BILL_STORAGE_KEY, extractedText);
        window.sessionStorage.removeItem(BILL_IMAGE_STORAGE_KEY);
      }

      window.sessionStorage.setItem(FILE_NAME_STORAGE_KEY, selectedFile?.name || "billing-notes.txt");

      setVisibleStep(2);
      setVisibleStep(3);
      window.location.href = "/result";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to start your review.");
      setLoading(false);
      setVisibleStep(0);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setSelectedFileData("");
    window.sessionStorage.removeItem(BILL_STORAGE_KEY);
    window.sessionStorage.removeItem(BILL_IMAGE_STORAGE_KEY);
    setError("");
  };

  return (
    <main className="marketing-shell">
      <section className="marketing-hero">
        <header className="site-nav">
          <a className="site-brand" href="#top">
            <span className="site-brand-mark" />
            <span>Inbill</span>
          </a>

          <nav className="site-links" aria-label="Primary">
            <a href="#how-it-works">How it works</a>
            <a href="#workspace">Analyzer</a>
            <a href="#faq">Why Inbill</a>
          </nav>

          <a className="site-cta" href="#workspace">
            Analyze a Bill
          </a>
        </header>

        <div className="hero-grid" id="top">
          <div className="hero-copy-panel">
            <span className="hero-kicker">Trusted Medical Bill Review</span>
            <h1>
              Find errors in your medical bill before you <em>pay the wrong amount</em>.
            </h1>
            <p>
              Upload a bill, EOB, or screenshot and get a plain-English breakdown of what may be wrong, what
              you likely owe, and what to ask next.
            </p>

            <div className="hero-trust-row">
              <span>HIPAA-conscious workflow</span>
              <span>No account required</span>
              <span>Actionable patient language</span>
            </div>

            <div className="hero-metrics">
              <article>
                <strong>1 file</strong>
                <span>Upload PDF, image, or text</span>
              </article>
              <article>
                <strong>6 sections</strong>
                <span>Clear report structure</span>
              </article>
              <article>
                <strong>0 storage</strong>
                <span>Files handled in memory only</span>
              </article>
            </div>
          </div>

          <div className="hero-preview-panel">
            <div className="preview-window">
              <div className="preview-window-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-summary-card">
                <p className="preview-label">Sample Findings</p>
                <h2>Potential duplicate lab charge</h2>
                <ul>
                  <li>Charge description appears on two adjacent bill lines</li>
                  <li>Insurance responsibility language is unclear</li>
                  <li>Suggested next step: request an itemized statement</li>
                </ul>
              </div>
              <div className="preview-mini-grid">
                <article>
                  <span>Likely Owe</span>
                  <strong>$162.72</strong>
                </article>
                <article>
                  <span>Red Flags</span>
                  <strong>3 items</strong>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace-section" id="workspace">
        <div className="workspace-header">
          <span className="section-pill">Upload Analyzer</span>
          <h2>Start with your bill or insurance statement</h2>
          <p>
            This MVP runs in a single flow: upload the document, extract bill details, and open the analysis
            workspace automatically.
          </p>
        </div>

        <div className="workspace-card">
          <div className="workspace-tabs" role="tablist" aria-label="Review mode">
            <button
              className={activeTab === "upload" ? "workspace-tab active" : "workspace-tab"}
              onClick={() => setActiveTab("upload")}
              type="button"
            >
              Upload file
            </button>
            <button
              className={activeTab === "notes" ? "workspace-tab active" : "workspace-tab"}
              onClick={() => setActiveTab("notes")}
              type="button"
            >
              Paste notes
            </button>
          </div>

          {activeTab === "upload" ? (
            <div className="tab-panel">
              <label
                className={dragActive ? "upload-drop-zone drag-active" : "upload-drop-zone"}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDrop={handleDrop}
              >
                <input accept=".pdf,image/*,.txt" className="hidden-file-input" onChange={handleFileInput} type="file" />
                <div className="drop-zone-icon">+</div>
                <h3>Drag and drop your medical bill</h3>
                <p>Accepted formats: PDF, image, or text. Files are processed in memory only.</p>
                <span className="drop-zone-trigger">Browse files</span>
              </label>

              {selectedFile ? (
                <div className="selected-file-card">
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <p>{fileSummary}</p>
                  </div>
                  <button className="ghost-button" onClick={removeFile} type="button">
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="tab-panel">
              <div className="notes-panel">
                <label htmlFor="bill-notes">Paste billing notes or claim details</label>
                <textarea
                  id="bill-notes"
                  onChange={(event) => setNotesText(event.target.value)}
                  placeholder="Example: Lab bill says insurance denied claim because another plan is primary. Amount due is $162.72. I need help understanding whether that is correct."
                  rows={7}
                  value={notesText}
                />
              </div>
            </div>
          )}

          {error ? <p className="inline-error">{error}</p> : null}

          <button className="primary-action" onClick={handleAnalyze} type="button">
            Analyze My Bill
          </button>

          <p className="workspace-footnote">No payment required in this version. You’ll go straight to results.</p>
        </div>

        <section className={loading ? "loading-panel visible" : "loading-panel"} aria-hidden={!loading}>
          <div className="loading-spinner" />
          <div className="loading-steps">
            {loadingSteps.map((step, index) => (
              <div className={index <= visibleStep ? "loading-step active" : "loading-step"} key={step}>
                <span className="loading-step-dot" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="benefits-section" id="how-it-works">
        <div className="section-heading">
          <span className="section-pill">How It Works</span>
          <h2>A straightforward review flow for patients</h2>
          <p>Designed to feel more like a financial audit than a generic AI upload form.</p>
        </div>

        <div className="benefits-grid">
          <article>
            <span className="benefit-number">01</span>
            <h3>Upload your document</h3>
            <p>Bring in a bill, EOB, lab statement, or notes from a provider call.</p>
          </article>
          <article>
            <span className="benefit-number">02</span>
            <h3>Surface likely red flags</h3>
            <p>Spot duplicate charges, vague descriptions, and coverage mismatches more quickly.</p>
          </article>
          <article>
            <span className="benefit-number">03</span>
            <h3>Understand what you likely owe</h3>
            <p>Get a simpler view of the amount billed, insurer role, and patient responsibility.</p>
          </article>
          <article>
            <span className="benefit-number">04</span>
            <h3>Prepare your next call</h3>
            <p>Use sharper questions and a calm script when you contact billing or insurance.</p>
          </article>
        </div>
      </section>

      <section className="proof-banner" id="faq">
        <div className="proof-banner-inner">
          <article>
            <strong>Plain English</strong>
            <span>No billing jargon wall</span>
          </article>
          <article>
            <strong>Action Steps</strong>
            <span>Built for your next phone call</span>
          </article>
          <article>
            <strong>In-Memory</strong>
            <span>No file storage in this MVP</span>
          </article>
        </div>
      </section>
    </main>
  );
}
