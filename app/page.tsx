"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  ClipboardCheck,
  FileText,
  Receipt,
  ShieldAlert,
  Sparkles,
  Stethoscope,
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

const findings = [
  {
    icon: Receipt,
    title: "Duplicate charges",
    description: "Catch repeated line items that may appear more than once on the same bill.",
  },
  {
    icon: ShieldAlert,
    title: "Insurance denials",
    description: "Spot denied or misapplied claims before the full balance lands on you.",
  },
  {
    icon: BadgeDollarSign,
    title: "Overpriced items",
    description: "Flag charges that look unusually high for routine services or lab work.",
  },
  {
    icon: AlertTriangle,
    title: "Missing adjustments",
    description: "Find cases where discounts or insurance adjustments may not have been applied.",
  },
] as const;

const steps = [
  {
    icon: FileText,
    title: "Upload your bill",
    description: "Add a PDF, screenshot, or medical bill image.",
  },
  {
    icon: Sparkles,
    title: "AI analyzes it",
    description: "We review the bill for costly mistakes and confusing charges.",
  },
  {
    icon: ClipboardCheck,
    title: "Get report + action steps",
    description: "See what looks wrong and what to do next before paying.",
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

  return (
    <main style={styles.page}>
      <style jsx global>{`
        .home-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
          gap: 24px;
          align-items: center;
        }

        .home-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .home-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .home-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .home-card {
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .home-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }

        @media (max-width: 900px) {
          .home-grid-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .home-hero-grid,
          .home-grid-2,
          .home-grid-3,
          .home-grid-4 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={styles.container}>
        <section style={styles.heroSection}>
          <div className="home-hero-grid">
            <div style={styles.heroCopy}>
              <div style={styles.kicker}>Medical Bill Review</div>
              <h1 style={styles.headline}>You Might Be Overpaying Your Medical Bill</h1>
              <p style={styles.subheadline}>
                Upload your bill. Get a clear breakdown, hidden issues, and what to do next — in under 60 seconds.
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
                  {loading ? "Preparing..." : "Analyze My Bill — $4.99"}
                </button>
                <p style={styles.trustLine}>No account required • Secure • No storage</p>
              </div>
            </div>

            <div className="home-card" style={styles.reportMockCard}>
              <div style={styles.mockBadge}>Audit preview</div>
              <div style={styles.mockHeader}>
                <div>
                  <div style={styles.mockTitle}>Potential savings</div>
                  <div style={styles.mockAmount}>$320</div>
                </div>
                <div style={styles.mockStatus}>High concern</div>
              </div>
              <div style={styles.mockFindingCard}>
                <div style={styles.mockFindingIcon}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div style={styles.mockFindingTitle}>Duplicate charge detected</div>
                  <div style={styles.mockFindingText}>
                    The same lab service appears more than once for the same visit date.
                  </div>
                </div>
              </div>
              <div style={styles.mockCallout}>
                <Stethoscope size={18} />
                <span>Action plan included before you call billing.</span>
              </div>
            </div>
          </div>
        </section>

        <section id="analyze" style={styles.section}>
          <div className="home-card" style={styles.uploadCard}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Upload your bill</h2>
              <p style={styles.cardText}>PDF, image, or screenshot. We keep the flow simple, fast, and private.</p>
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
              {loading ? "Preparing..." : "Analyze My Bill — $4.99"}
            </button>
          </div>
        </section>

        <section id="what-we-find" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>What we find</h2>
          </div>
          <div className="home-grid-4">
            {findings.map((item) => (
              <article className="home-card" key={item.title} style={styles.infoCard}>
                <div style={styles.infoIcon}>
                  <item.icon size={22} />
                </div>
                <h3 style={styles.infoTitle}>{item.title}</h3>
                <p style={styles.infoText}>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>How it works</h2>
          </div>
          <div className="home-grid-3">
            {steps.map((item) => (
              <article className="home-card" key={item.title} style={styles.infoCard}>
                <div style={styles.stepIcon}>
                  <item.icon size={22} />
                </div>
                <h3 style={styles.infoTitle}>{item.title}</h3>
                <p style={styles.infoText}>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div className="home-card" style={styles.samplePreviewCard}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Sample preview</h2>
            </div>
            <div className="home-grid-3">
              <div style={styles.previewBlock}>
                <div style={styles.previewLabel}>Summary</div>
                <p style={styles.previewText}>
                  Lab charges may be overstated because the claim appears denied and the balance may not reflect final insurance review.
                </p>
              </div>
              <div style={styles.previewBlock}>
                <div style={styles.previewLabel}>Issue found</div>
                <p style={styles.previewText}>
                  Possible duplicate charge that could increase the patient balance if not corrected.
                </p>
              </div>
              <div style={styles.previewBlock}>
                <div style={styles.previewLabel}>Call script</div>
                <p style={styles.previewText}>
                  “I need this bill reviewed before I pay because I see a denied claim and a charge that may be duplicated.”
                </p>
              </div>
            </div>
            <div style={styles.previewCtaRow}>
              <Link href="/sample" style={styles.secondaryButton}>
                See Full Example
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div className="home-card" style={styles.savingsCard}>
            <div style={styles.savingsValue}>$1,200+ potential savings</div>
            <p style={styles.savingsText}>Based on real analyzed medical bills</p>
          </div>
        </section>

        <section style={styles.finalSection}>
          <div className="home-card" style={styles.finalCard}>
            <h2 style={styles.finalTitle}>Check your bill before you pay it</h2>
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
    paddingTop: 20,
  },
  heroCopy: {
    paddingTop: 10,
  },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#ecfeff",
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 14,
  },
  headline: {
    margin: "0 0 14px",
    maxWidth: 560,
    fontSize: "clamp(2.7rem, 5vw, 4.4rem)",
    lineHeight: 0.98,
    letterSpacing: "-0.05em",
    fontWeight: 800,
    color: "#0f172a",
  },
  subheadline: {
    margin: "0 0 18px",
    maxWidth: 560,
    fontSize: 18,
    lineHeight: 1.75,
    color: "#475569",
  },
  heroActions: {
    display: "grid",
    gap: 14,
    justifyItems: "flex-start",
  },
  heroButton: {
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #16946d, #0f7757)",
    color: "#ffffff",
    padding: "16px 22px",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(15, 119, 87, 0.18)",
  },
  trustLine: {
    margin: 0,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    fontWeight: 600,
  },
  section: {
    marginTop: 60,
  },
  finalSection: {
    marginTop: 60,
    marginBottom: 8,
  },
  reportMockCard: {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbfd 100%)",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
    display: "grid",
    gap: 18,
  },
  mockBadge: {
    display: "inline-flex",
    width: "fit-content",
    alignItems: "center",
    padding: "7px 10px",
    borderRadius: 999,
    background: "#eefbf5",
    color: "#0f7757",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  mockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },
  mockTitle: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
  },
  mockAmount: {
    color: "#0f172a",
    fontSize: 40,
    lineHeight: 1,
    letterSpacing: "-0.05em",
    fontWeight: 900,
  },
  mockStatus: {
    padding: "8px 10px",
    borderRadius: 999,
    background: "#fff7ed",
    color: "#b45309",
    fontSize: 13,
    fontWeight: 800,
  },
  mockFindingCard: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 14,
    background: "#fff7f7",
    border: "1px solid #fecaca",
  },
  mockFindingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "#fee2e2",
    color: "#b91c1c",
    flexShrink: 0,
  },
  mockFindingTitle: {
    color: "#991b1b",
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 4,
  },
  mockFindingText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
  },
  mockCallout: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    color: "#334155",
    fontSize: 14,
    fontWeight: 600,
    padding: "14px 16px",
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
  },
  uploadCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 16px 36px rgba(15,23,42,0.06)",
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 24,
    lineHeight: 1.2,
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
    border: "1.5px dashed #cbd5e1",
    borderRadius: 12,
    background: "#f8fafc",
    cursor: "pointer",
  },
  uploadZoneActive: {
    borderColor: "#0f766e",
    background: "#f0fdfa",
  },
  hiddenInput: {
    display: "none",
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "#ecfeff",
    color: "#0f766e",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    fontWeight: 700,
  },
  uploadZoneTitle: {
    fontSize: 18,
    fontWeight: 700,
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
    borderRadius: 12,
    background: "#f8fafc",
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
    fontWeight: 600,
    cursor: "pointer",
  },
  errorText: {
    marginTop: 14,
    color: "#b91c1c",
    fontWeight: 600,
    fontSize: 14,
  },
  ctaButton: {
    width: "100%",
    marginTop: 16,
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #16946d, #0f7757)",
    color: "#ffffff",
    padding: "16px 18px",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15, 118, 110, 0.18)",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "wait",
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.15,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#111827",
  },
  infoCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginBottom: 14,
    display: "grid",
    placeItems: "center",
    background: "#eff7f3",
    color: "#0f7757",
  },
  infoTitle: {
    margin: "0 0 8px",
    fontSize: 18,
    lineHeight: 1.3,
    fontWeight: 700,
    color: "#111827",
  },
  infoText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.75,
    fontSize: 14,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "#eff7f3",
    color: "#0f7757",
    display: "grid",
    placeItems: "center",
    marginBottom: 14,
  },
  samplePreviewCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
  },
  previewBlock: {
    background: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    border: "1px solid #e5e7eb",
  },
  previewLabel: {
    marginBottom: 8,
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  previewText: {
    margin: 0,
    color: "#334155",
    fontSize: 15,
    lineHeight: 1.7,
  },
  previewCtaRow: {
    marginTop: 16,
  },
  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
  },
  savingsCard: {
    background: "#ffffff",
    border: "1px solid #d1fae5",
    borderRadius: 16,
    padding: "28px 24px",
    boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
    textAlign: "center",
  },
  savingsValue: {
    fontSize: "clamp(2.8rem, 9vw, 4.4rem)",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.06em",
    color: "#0f172a",
    marginBottom: 10,
  },
  savingsText: {
    margin: 0,
    color: "#475569",
    fontSize: 16,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  finalCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
    textAlign: "center",
  },
  finalTitle: {
    margin: "0 0 16px",
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#111827",
  },
  finalButton: {
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #16946d, #0f7757)",
    color: "#ffffff",
    padding: "16px 20px",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15, 118, 110, 0.18)",
  },
};
