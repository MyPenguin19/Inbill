"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  ClipboardList,
  FileSearch,
  FileText,
  Receipt,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

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
    icon: AlertTriangle,
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
    title: "AI analyzes it instantly",
    description: "Finds errors, duplicates, and pricing issues",
  },
  {
    icon: ClipboardList,
    title: "Get exact errors + what to say before paying",
    description: "A report built to help you question the balance before you send money",
  },
] as const;

const trustItems = [
  "Files auto-deleted after analysis",
  "No data stored",
  "No account required",
  "Secure processing",
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

  return (
    <main style={styles.page}>
      <style jsx global>{`
        .landing-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(360px, 0.98fr);
          gap: 28px;
          align-items: start;
        }

        .landing-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .landing-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .landing-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .landing-card {
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .landing-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
        }

        .audit-scroll {
          max-height: 244px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .audit-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .audit-scroll::-webkit-scrollbar-thumb {
          background: #c9d4df;
          border-radius: 999px;
        }

        @media (max-width: 920px) {
          .landing-grid-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .landing-hero-grid,
          .landing-grid-2,
          .landing-grid-3,
          .landing-grid-4 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={styles.container}>
        <section style={styles.heroSection}>
          <div className="landing-hero-grid">
            <div style={styles.heroCopy}>
              <div style={styles.kicker}>Medical Bill Audit</div>
              <h1 style={styles.headline}>Don&apos;t Pay Your Medical Bill Until You Check This</h1>
              <p style={styles.subheadline}>
                We find hidden charges, duplicate fees, and insurance errors in under 60 seconds.
              </p>

              <div style={styles.heroActions}>
                <button
                  disabled={loading}
                  onClick={handleAnalyze}
                  style={{
                    ...styles.heroButton,
                    ...(loading ? styles.buttonDisabled : {}),
                  }}
                  type="button"
                >
                  {loading ? "Preparing..." : "Check My Bill Before I Pay — $4.99"}
                </button>
                <div style={styles.trustRow}>
                  <span>No account required</span>
                  <span>Secure processing</span>
                  <span>Files automatically deleted</span>
                </div>
              </div>
            </div>

            <div className="landing-card" style={styles.reportPreview}>
              <div style={styles.reportPreviewHeader}>
                <div>
                  <div style={styles.previewEyebrow}>Bill audit preview</div>
                  <div style={styles.previewHeading}>Potential Savings: $320</div>
                </div>
                <div style={styles.previewRisk}>Review before paying</div>
              </div>

              <div className="audit-scroll" style={styles.previewTableWrap}>
                <div style={styles.previewTable}>
                  <div style={styles.previewTableHeader}>
                    <span>Code</span>
                    <span>Description</span>
                    <span>Amount</span>
                  </div>

                  <div style={styles.previewRow}>
                    <span>85025</span>
                    <span>CBC, platelet differential</span>
                    <span>$52.05</span>
                  </div>
                  <div style={{ ...styles.previewRow, ...styles.previewRowAlert }}>
                    <span>85025</span>
                    <span>Duplicate CBC, platelet differential</span>
                    <span>$52.05</span>
                  </div>
                  <div style={styles.previewRow}>
                    <span>36415</span>
                    <span>Collection of venous blood</span>
                    <span>$18.00</span>
                  </div>
                  <div style={styles.previewRow}>
                    <span>80053</span>
                    <span>Comprehensive metabolic panel</span>
                    <span>$92.40</span>
                  </div>
                  <div style={{ ...styles.previewRow, ...styles.previewRowWarn }}>
                    <span>Adj.</span>
                    <span>Insurance adjustment missing from patient balance</span>
                    <span>$215.50</span>
                  </div>
                  <div style={styles.previewRow}>
                    <span>Denial</span>
                    <span>Claim appears denied as billed to patient</span>
                    <span>$108.00</span>
                  </div>
                </div>
              </div>

              <div style={styles.previewFlagBox}>
                <div style={styles.previewFlagTitle}>Flagged</div>
                <ul style={styles.previewFlagList}>
                  <li>Duplicate charge likely inflated the balance</li>
                  <li>Insurance adjustment appears missing before patient billing</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.proofStripSection}>
          <div style={styles.proofStrip}>
            <div style={styles.proofItem}>
              <div style={styles.proofValue}>1,200+</div>
              <div style={styles.proofLabel}>medical bills reviewed</div>
            </div>
            <div style={styles.proofItem}>
              <div style={styles.proofValue}>$287</div>
              <div style={styles.proofLabel}>average savings identified</div>
            </div>
            <div style={styles.proofItem}>
              <div style={styles.proofValue}>#1</div>
              <div style={styles.proofLabel}>duplicate lab charges found most often</div>
            </div>
          </div>
        </section>

        <section id="analyze" style={styles.section}>
          <div className="landing-card" style={styles.uploadCard}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Check your bill before you send money</h2>
              <p style={styles.cardText}>
                Upload a PDF, screenshot, or photo. The review is designed to catch costs you should challenge before paying.
              </p>
            </div>

            <label
              style={{
                ...styles.uploadZone,
                ...(dragActive ? styles.uploadZoneActive : {}),
              }}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDrop={handleDrop}
            >
              <input accept=".pdf,image/*,.txt" onChange={handleFileInput} style={styles.hiddenInput} type="file" />
              <div style={styles.uploadIcon}>↑</div>
              <div style={styles.uploadZoneTitle}>Drag and drop your bill</div>
              <div style={styles.uploadZoneText}>PDF, image, or screenshot</div>
            </label>

            {selectedFile ? (
              <div style={styles.fileCard}>
                <div>
                  <div style={styles.fileName}>{selectedFile.name}</div>
                  <div style={styles.fileMeta}>{fileSummary}</div>
                </div>
                <button onClick={removeFile} style={styles.removeButton} type="button">
                  Remove
                </button>
              </div>
            ) : null}

            {error ? <div style={styles.errorText}>{error}</div> : null}

            <button
              disabled={loading}
              onClick={handleAnalyze}
              style={{
                ...styles.ctaButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              type="button"
            >
              {loading ? "Preparing..." : "Check My Bill Before I Pay — $4.99"}
            </button>
          </div>
        </section>

        <section id="what-we-find" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Where Your Money Gets Lost</h2>
          </div>

          <div className="landing-grid-4">
            {moneyLossCards.map((item) => (
              <article key={item.title} className="landing-card" style={styles.problemCard}>
                <div style={styles.problemTop}>
                  <div style={styles.problemIcon}>
                    <item.icon size={20} />
                  </div>
                  <div style={styles.problemImpact}>{item.impact}</div>
                </div>
                <h3 style={styles.problemTitle}>{item.title}</h3>
                <p style={styles.problemText}>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div className="landing-card" style={styles.beforeAfterCard}>
            <div style={styles.beforeAfterHeader}>
              <h2 style={styles.sectionTitle}>Before You Pay — Check This First</h2>
              <div style={styles.beforeAfterHighlight}>You could be overpaying by $320</div>
            </div>

            <div className="landing-grid-2">
              <div style={styles.comparePanel}>
                <div style={styles.compareLabel}>Total Bill</div>
                <div style={styles.compareValue}>$2,140</div>
              </div>
              <div style={{ ...styles.comparePanel, ...styles.comparePanelAccent }}>
                <div style={styles.compareLabel}>After Review</div>
                <div style={styles.compareValue}>$1,820</div>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>How It Works</h2>
          </div>

          <div className="landing-grid-3">
            {steps.map((item) => (
              <article key={item.title} className="landing-card" style={styles.stepCard}>
                <div style={styles.stepIcon}>
                  <item.icon size={20} />
                </div>
                <h3 style={styles.stepTitle}>{item.title}</h3>
                <p style={styles.stepText}>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div className="landing-card" style={styles.sampleCard}>
            <div style={styles.sampleHeader}>
              <div>
                <div style={styles.sampleEyebrow}>Sample Report</div>
                <h2 style={styles.sectionTitle}>What you can challenge before you pay</h2>
              </div>
              <Link href="/sample" style={styles.secondaryButton}>
                See Full Example
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="landing-grid-3">
              <div style={styles.sampleBlock}>
                <div style={styles.sampleLabel}>Issue</div>
                <p style={styles.sampleText}>Duplicate lab charge</p>
                <div style={styles.sampleImpact}>Impact: +$120</div>
              </div>
              <div style={styles.sampleBlock}>
                <div style={styles.sampleLabel}>Recommendation</div>
                <p style={styles.sampleText}>Ask billing department to verify duplicate CPT code entry.</p>
              </div>
              <div style={styles.sampleBlock}>
                <div style={styles.sampleLabel}>Call Script</div>
                <p style={styles.sampleText}>
                  &quot;I&apos;m calling about a charge that appears duplicated. Can you verify this before I make payment?&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div className="landing-card" style={styles.trustCard}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Private. Secure. Built for Sensitive Data</h2>
            </div>

            <div className="landing-grid-2">
              {trustItems.map((item) => (
                <div key={item} style={styles.trustItem}>
                  <div style={styles.trustIcon}>
                    <ShieldCheck size={18} />
                  </div>
                  <div style={styles.trustText}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.finalSection}>
          <div className="landing-card" style={styles.finalCard}>
            <h2 style={styles.finalTitle}>Check Your Bill Before You Pay It</h2>
            <p style={styles.finalText}>
              Most medical bills contain errors. Takes 60 seconds. Could save you hundreds.
            </p>
            <button
              disabled={loading}
              onClick={handleAnalyze}
              style={{
                ...styles.finalButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              type="button"
            >
              {loading ? "Preparing..." : "Analyze My Bill — $4.99"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100%",
  },
  container: {
    width: "100%",
    maxWidth: 900,
    margin: "0 auto",
  },
  heroSection: {
    paddingTop: 26,
  },
  heroCopy: {
    paddingTop: 6,
  },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    border: "1px solid #d5dce3",
    borderRadius: 999,
    background: "#ffffff",
    color: "#475569",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 16,
  },
  headline: {
    margin: "0 0 14px",
    maxWidth: 560,
    fontSize: "clamp(2.9rem, 5vw, 4.7rem)",
    lineHeight: 0.96,
    letterSpacing: "-0.05em",
    fontWeight: 900,
    color: "#0f172a",
  },
  subheadline: {
    margin: "0 0 20px",
    maxWidth: 560,
    fontSize: 18,
    lineHeight: 1.65,
    color: "#334155",
  },
  heroActions: {
    display: "grid",
    gap: 14,
    justifyItems: "flex-start",
  },
  heroButton: {
    border: "1px solid #0b6a4d",
    borderRadius: 10,
    background: "#0f7757",
    color: "#ffffff",
    padding: "16px 22px",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15, 119, 87, 0.2)",
  },
  trustRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 600,
  },
  proofStripSection: {
    marginTop: 24,
  },
  proofStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 0,
    border: "1px solid #d7dee5",
    borderRadius: 12,
    background: "#ffffff",
    overflow: "hidden",
    boxShadow: "0 12px 24px rgba(15,23,42,0.04)",
  },
  proofItem: {
    padding: "18px 20px",
    borderRight: "1px solid #e7edf2",
  },
  proofValue: {
    color: "#0f172a",
    fontSize: 28,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 900,
    marginBottom: 6,
  },
  proofLabel: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
    fontWeight: 600,
  },
  section: {
    marginTop: 48,
  },
  finalSection: {
    marginTop: 52,
    marginBottom: 8,
  },
  reportPreview: {
    background: "#ffffff",
    border: "1px solid #d7dee5",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 20px 36px rgba(15,23,42,0.08)",
    display: "grid",
    gap: 16,
  },
  reportPreviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    paddingBottom: 14,
    borderBottom: "1px solid #e5e7eb",
  },
  previewEyebrow: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  previewHeading: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },
  previewRisk: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid #f3c0c0",
    background: "#fff3f3",
    color: "#b42318",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  previewTableWrap: {
    border: "1px solid #e7edf2",
    borderRadius: 10,
    background: "#fafcfd",
    padding: "12px 12px 8px",
  },
  previewTable: {
    display: "grid",
    gap: 8,
  },
  previewTableHeader: {
    display: "grid",
    gridTemplateColumns: "70px minmax(0, 1fr) 84px",
    gap: 12,
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    paddingBottom: 2,
  },
  previewRow: {
    display: "grid",
    gridTemplateColumns: "70px minmax(0, 1fr) 84px",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #eef2f6",
    color: "#1e293b",
    fontSize: 13,
    lineHeight: 1.5,
  },
  previewRowAlert: {
    color: "#991b1b",
    fontWeight: 800,
  },
  previewRowWarn: {
    color: "#92400e",
    fontWeight: 700,
  },
  previewFlagBox: {
    border: "1px solid #f2d1d1",
    background: "#fff8f8",
    borderRadius: 10,
    padding: 14,
  },
  previewFlagTitle: {
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  previewFlagList: {
    margin: 0,
    paddingLeft: 18,
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
  },
  uploadCard: {
    background: "#ffffff",
    border: "1px solid #d7dee5",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 14px 28px rgba(15,23,42,0.06)",
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 24,
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#111827",
  },
  cardText: {
    margin: 0,
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.7,
  },
  uploadZone: {
    display: "grid",
    justifyItems: "center",
    gap: 10,
    padding: "28px 18px",
    border: "1.5px dashed #b8c4d0",
    borderRadius: 10,
    background: "#f8fafc",
    cursor: "pointer",
  },
  uploadZoneActive: {
    borderColor: "#0f7757",
    background: "#f1f8f5",
  },
  hiddenInput: {
    display: "none",
  },
  uploadIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    background: "#eef3f7",
    color: "#0f172a",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    fontWeight: 700,
  },
  uploadZoneTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: "#0f172a",
  },
  uploadZoneText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
  fileCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  fileName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
  },
  fileMeta: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 14,
  },
  removeButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  errorText: {
    marginTop: 14,
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: 14,
  },
  ctaButton: {
    width: "100%",
    marginTop: 16,
    border: "1px solid #0b6a4d",
    borderRadius: 10,
    background: "#0f7757",
    color: "#ffffff",
    padding: "16px 18px",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15, 118, 110, 0.18)",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "wait",
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    color: "#111827",
  },
  problemCard: {
    background: "#ffffff",
    border: "1px solid #d7dee5",
    borderRadius: 12,
    padding: 18,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  problemTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 14,
  },
  problemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "#f6f8fb",
    color: "#0f172a",
  },
  problemImpact: {
    color: "#b42318",
    fontSize: 30,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 900,
  },
  problemTitle: {
    margin: "0 0 8px",
    fontSize: 18,
    lineHeight: 1.25,
    fontWeight: 800,
    color: "#111827",
  },
  problemText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.7,
    fontSize: 14,
  },
  beforeAfterCard: {
    background: "#ffffff",
    border: "1px solid #d7dee5",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  beforeAfterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  beforeAfterHighlight: {
    color: "#0f7757",
    fontSize: 19,
    fontWeight: 900,
  },
  comparePanel: {
    border: "1px solid #d7dee5",
    borderRadius: 12,
    background: "#f8fafc",
    padding: 24,
    textAlign: "center",
  },
  comparePanelAccent: {
    background: "#f1f8f5",
    borderColor: "#b7dfd0",
  },
  compareLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  compareValue: {
    color: "#0f172a",
    fontSize: "clamp(2.4rem, 6vw, 3.4rem)",
    lineHeight: 1,
    letterSpacing: "-0.05em",
    fontWeight: 900,
  },
  stepCard: {
    background: "#ffffff",
    border: "1px solid #d7dee5",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "#f6f8fb",
    color: "#0f172a",
    marginBottom: 14,
  },
  stepTitle: {
    margin: "0 0 8px",
    fontSize: 18,
    lineHeight: 1.25,
    fontWeight: 800,
    color: "#111827",
  },
  stepText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.7,
    fontSize: 14,
  },
  sampleCard: {
    background: "#ffffff",
    border: "1px solid #d7dee5",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  sampleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  sampleEyebrow: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  sampleBlock: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#f8fafc",
    padding: 16,
  },
  sampleLabel: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sampleText: {
    margin: 0,
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.7,
  },
  sampleImpact: {
    marginTop: 10,
    color: "#b42318",
    fontSize: 15,
    fontWeight: 800,
  },
  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
    textDecoration: "none",
  },
  trustCard: {
    background: "#ffffff",
    border: "1px solid #d7dee5",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
  },
  trustIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "#eef7f2",
    color: "#0f7757",
    flexShrink: 0,
  },
  trustText: {
    color: "#1e293b",
    fontSize: 15,
    lineHeight: 1.6,
    fontWeight: 700,
  },
  finalCard: {
    background: "#ffffff",
    border: "1px solid #d7dee5",
    borderRadius: 12,
    padding: 28,
    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
    textAlign: "center",
  },
  finalTitle: {
    margin: "0 0 10px",
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 900,
    color: "#111827",
    letterSpacing: "-0.03em",
  },
  finalText: {
    margin: "0 0 18px",
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  finalButton: {
    border: "1px solid #0b6a4d",
    borderRadius: 10,
    background: "#0f7757",
    color: "#ffffff",
    padding: "16px 22px",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15, 118, 110, 0.18)",
  },
};
