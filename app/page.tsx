"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BILL_IMAGE_STORAGE_KEY,
  BILL_STORAGE_KEY,
  FILE_NAME_STORAGE_KEY,
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

export default function HomePage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      const dataUrl = file.type.startsWith("image/")
        ? await compressImageDataUrl(rawDataUrl)
        : rawDataUrl;
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
    setError("");
  };

  return (
    <main style={styles.page}>
      <style jsx global>{`
        .site-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          margin-bottom: 28px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
          backdrop-filter: blur(10px);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 22px;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
        }

        .nav-link {
          color: inherit;
          text-decoration: none;
        }

        .nav-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          border-radius: 12px;
          background: #16a34a;
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 8px 18px rgba(22, 163, 74, 0.18);
        }

        .hamburger {
          display: none;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          color: #0f172a;
          font-size: 20px;
          font-weight: 800;
        }

        .mobile-menu {
          display: none;
          margin-bottom: 18px;
          padding: 18px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
        }

        .mobile-menu.open {
          display: grid;
          gap: 14px;
        }

        .mobile-link {
          color: #334155;
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
        }

        .mobile-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin-top: 6px;
          padding: 14px 18px;
          border-radius: 12px;
          background: #16a34a;
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 8px 18px rgba(22, 163, 74, 0.18);
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

        .landing-card {
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .landing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }

        @media (max-width: 760px) {
          .nav-links,
          .nav-cta {
            display: none;
          }

          .hamburger {
            display: inline-flex;
          }

          .landing-grid-2,
          .landing-grid-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={styles.container}>
        <header className="site-nav">
          <div style={styles.logo}>InBill</div>

          <nav className="nav-links" aria-label="Primary">
            <a className="nav-link" href="#how-it-works">
              How it works
            </a>
            <a className="nav-link" href="#sample-report">
              Sample report
            </a>
            <a className="nav-link" href="#pricing">
              Pricing
            </a>
            <a className="nav-cta" href="#analyze">
              Check My Bill Now — $4.99
            </a>
          </nav>

          <button
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="hamburger"
            onClick={() => setMobileMenuOpen((value) => !value)}
            type="button"
          >
            ☰
          </button>
        </header>

        <div className={mobileMenuOpen ? "mobile-menu open" : "mobile-menu"}>
          <a className="mobile-link" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
            How it works
          </a>
          <a className="mobile-link" href="#sample-report" onClick={() => setMobileMenuOpen(false)}>
            Sample report
          </a>
          <a className="mobile-link" href="#pricing" onClick={() => setMobileMenuOpen(false)}>
            Pricing
          </a>
          <a className="mobile-cta" href="#analyze" onClick={() => setMobileMenuOpen(false)}>
            Check My Bill Now — $4.99
          </a>
        </div>

        <section style={styles.heroSection}>
          <div style={styles.kicker}>Medical Bill Checker</div>
          <h1 style={styles.headline}>You Might Be Overpaying Your Medical Bill</h1>
          <p style={styles.subheadline}>
            Upload your bill and instantly find errors, overcharges, and how to dispute them.
          </p>
          <div style={styles.heroAlertCard}>
            <p style={styles.heroAlertLine}>Most patients overpay their medical bills — and don’t realize it.</p>
            <p style={styles.heroAlertSubline}>This checks your bill before you lose money.</p>
          </div>

          <div style={styles.heroStats}>
            <div style={styles.statCard}>
              <strong style={styles.statNumber}>80%</strong>
              <span style={styles.statLabel}>of medical bills contain errors</span>
            </div>
          </div>
        </section>

        <section className="landing-grid-2" id="analyze" style={styles.section}>
          <div className="landing-card" style={styles.mainUploadCard}>
            <h2 style={styles.cardTitle}>Analyze your bill</h2>
            <p style={styles.cardText}>
              Upload your statement, EOB, or screenshot and get a premium report in minutes.
            </p>

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
              <input
                accept=".pdf,image/*,.txt"
                onChange={handleFileInput}
                style={styles.hiddenInput}
                type="file"
              />
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
              {loading ? "Preparing..." : "Check My Bill Now — $4.99"}
            </button>
          </div>

          <div style={styles.sideColumn}>
            <div className="landing-card" style={styles.trustCard}>
              <h3 style={styles.sideTitle}>Why patients trust this</h3>
              <div style={styles.trustList}>
                <div style={styles.trustItem}>🔒 Secure upload</div>
                <div style={styles.trustItem}>🧼 No data stored</div>
                <div style={styles.trustItem}>⚡ Instant analysis</div>
                <div style={styles.trustItem}>🫶 Built for real patients</div>
              </div>
            </div>

            <div className="landing-card" id="pricing" style={styles.pricingCard}>
              <div style={styles.pricingLabel}>Simple pricing</div>
              <div style={styles.price}>$9.99</div>
              <p style={styles.pricingText}>One-time payment. No subscription. No recurring charges.</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>What we typically find</h2>
          </div>
          <div className="landing-grid-2">
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.infoIcon}>🧾</div>
              <h3 style={styles.infoTitle}>Duplicate charges</h3>
              <p style={styles.infoText}>The same service may show up more than once on the bill.</p>
            </article>
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.infoIcon}>🏷️</div>
              <h3 style={styles.infoTitle}>Incorrect billing codes</h3>
              <p style={styles.infoText}>Coding mistakes can change what insurance covers and what you owe.</p>
            </article>
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.infoIcon}>❌</div>
              <h3 style={styles.infoTitle}>Services not received</h3>
              <p style={styles.infoText}>Some patients are billed for items they do not recognize.</p>
            </article>
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.infoIcon}>🛡️</div>
              <h3 style={styles.infoTitle}>Insurance errors</h3>
              <p style={styles.infoText}>Claims can be denied or misapplied because of insurance mistakes.</p>
            </article>
          </div>
        </section>

        <section style={styles.section}>
          <div className="landing-card" style={styles.trustDataCard}>
            <h2 style={styles.sectionTitle}>Your data is safe</h2>
            <div style={styles.trustDataList}>
              <div style={styles.trustDataItem}>• Not stored</div>
              <div style={styles.trustDataItem}>• Not shared</div>
              <div style={styles.trustDataItem}>• Secure processing</div>
            </div>
          </div>
        </section>

        <section id="how-it-works" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>How It Works</h2>
          </div>
          <div className="landing-grid-3">
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.infoTitle}>Upload</h3>
              <p style={styles.infoText}>Add your medical bill, EOB, or screenshot.</p>
            </article>
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.infoTitle}>Analyze</h3>
              <p style={styles.infoText}>We review it for likely errors, unclear charges, and red flags.</p>
            </article>
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.infoTitle}>Save Money</h3>
              <p style={styles.infoText}>Use the report and script to challenge costs before you pay.</p>
            </article>
          </div>
        </section>

        <section id="sample-report" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>What You Get</h2>
          </div>
          <div className="landing-grid-3">
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.infoIcon}>🧾</div>
              <h3 style={styles.infoTitle}>Plain English breakdown</h3>
              <p style={styles.infoText}>Understand your bill without needing to know medical billing language.</p>
            </article>
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.infoIcon}>🚨</div>
              <h3 style={styles.infoTitle}>Overcharges flagged</h3>
              <p style={styles.infoText}>Spot duplicate charges, vague fees, and likely billing mistakes.</p>
            </article>
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.infoIcon}>💵</div>
              <h3 style={styles.infoTitle}>What you owe</h3>
              <p style={styles.infoText}>See a simpler view of what may actually be your responsibility.</p>
            </article>
          </div>
          <div className="landing-grid-2" style={styles.secondaryGrid}>
            <article className="landing-card" style={styles.infoCard}>
              <div style={styles.infoIcon}>❓</div>
              <h3 style={styles.infoTitle}>Questions to ask</h3>
              <p style={styles.infoText}>Use sharper follow-up questions with billing and insurance teams.</p>
            </article>
            <article className="landing-card" style={styles.highlightCard}>
              <div style={styles.infoIcon}>📞</div>
              <h3 style={styles.infoTitle}>CALL SCRIPT</h3>
              <p style={styles.infoText}>
                Get the exact language to use when you call to dispute the bill or ask for corrections.
              </p>
            </article>
          </div>
        </section>

        <section className="landing-grid-2" style={styles.section}>
          <div className="landing-card" style={styles.testimonialCard}>
            <div style={styles.quoteMark}>“</div>
            <p style={styles.testimonialText}>
              This helped me realize I was about to pay a bill that still had insurance issues on it. The call
              script made the conversation much easier.
            </p>
            <div style={styles.testimonialAuthor}>Patient report preview</div>
          </div>

          <div className="landing-card" style={styles.proofCard}>
            <div style={styles.proofStat}>80%</div>
            <p style={styles.proofText}>of medical bills contain errors or issues worth reviewing before payment.</p>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Sample Report</h2>
          </div>
          <div className="landing-card" style={styles.sampleCard}>
            <div style={styles.sampleBadges}>
              <span style={styles.issueBadge}>Issues Found</span>
              <span style={styles.scriptBadge}>Call Script</span>
            </div>
            <div style={styles.samplePanel}>
              <h3 style={styles.sampleTitle}>Potential Issues</h3>
              <ul style={styles.sampleList}>
                <li>Possible duplicate lab charge for the same service date</li>
                <li>Insurance denial may point to incorrect primary insurance information</li>
                <li>Patient balance may be overstated until the claim is corrected</li>
              </ul>
            </div>
            <div style={styles.scriptBox}>
              <h3 style={styles.sampleTitle}>Call Script</h3>
              <p style={styles.scriptLine}>
                “Hi, I&apos;m calling because I received a bill and I&apos;d like an itemized explanation of the charges.”
              </p>
              <p style={styles.scriptLine}>
                “Can you confirm whether my insurance was billed correctly before I make payment?”
              </p>
            </div>
          </div>
        </section>

        <section style={styles.finalCtaSection}>
          <div className="landing-card" style={styles.finalCtaCard}>
            <h2 style={styles.finalCtaTitle}>Catch errors before you pay</h2>
            <p style={styles.finalCtaText}>
              Upload your bill, get your report, and know exactly what to question before sending money.
            </p>
            <button
              disabled={loading}
              onClick={handleAnalyze}
              style={{
                ...styles.finalCtaButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              type="button"
            >
              {loading ? "Preparing..." : "Check My Bill Now — $4.99"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#0f172a",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: "32px 16px 64px",
  },
  container: {
    width: "100%",
    maxWidth: 800,
    margin: "0 auto",
  },
  logo: {
    fontSize: 22,
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#0f172a",
  },
  heroSection: {
    textAlign: "center",
    paddingTop: 12,
  },
  kicker: {
    display: "inline-block",
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
    margin: "0 auto 12px",
    maxWidth: 760,
    fontSize: "clamp(2.4rem, 5vw, 4rem)",
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
    fontWeight: 800,
  },
  subheadline: {
    margin: "0 auto 16px",
    maxWidth: 680,
    fontSize: 19,
    lineHeight: 1.65,
    color: "#475569",
  },
  heroStats: {
    display: "flex",
    justifyContent: "center",
  },
  heroAlertCard: {
    margin: "0 auto 18px",
    maxWidth: 620,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "16px 18px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  heroAlertLine: {
    margin: "0 0 6px",
    color: "#0f172a",
    fontSize: 18,
    lineHeight: 1.6,
    fontWeight: 700,
  },
  heroAlertSubline: {
    margin: 0,
    color: "#0f766e",
    fontSize: 16,
    lineHeight: 1.6,
    fontWeight: 700,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px 18px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
  },
  statNumber: {
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 800,
    color: "#0f766e",
  },
  statLabel: {
    fontSize: 14,
    lineHeight: 1.5,
    color: "#334155",
    fontWeight: 600,
  },
  section: {
    marginTop: 28,
  },
  mainUploadCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 24,
    lineHeight: 1.2,
    fontWeight: 800,
  },
  cardText: {
    margin: "0 0 16px",
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
    background: "#0f766e",
    color: "#ffffff",
    padding: "16px 18px",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15, 118, 110, 0.18)",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "wait",
  },
  sideColumn: {
    display: "grid",
    gap: 18,
  },
  trustCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  sideTitle: {
    margin: "0 0 14px",
    fontSize: 20,
    lineHeight: 1.2,
    fontWeight: 800,
  },
  trustList: {
    display: "grid",
    gap: 12,
  },
  trustItem: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 1.6,
    fontWeight: 600,
  },
  pricingCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    textAlign: "left",
  },
  pricingLabel: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 8,
  },
  price: {
    fontSize: 40,
    lineHeight: 1,
    fontWeight: 800,
    marginBottom: 10,
  },
  pricingText: {
    margin: 0,
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.7,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  infoCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 999,
    background: "#ecfeff",
    color: "#0f766e",
    display: "grid",
    placeItems: "center",
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 24,
    marginBottom: 12,
  },
  infoTitle: {
    margin: "0 0 8px",
    fontSize: 18,
    lineHeight: 1.3,
    fontWeight: 700,
  },
  infoText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.7,
    fontSize: 15,
  },
  secondaryGrid: {
    marginTop: 18,
  },
  trustDataCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  trustDataList: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  trustDataItem: {
    color: "#334155",
    fontSize: 16,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  highlightCard: {
    background: "#ecfeff",
    border: "1px solid #99f6e4",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  testimonialCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  quoteMark: {
    fontSize: 36,
    lineHeight: 1,
    color: "#0f766e",
    marginBottom: 10,
    fontWeight: 800,
  },
  testimonialText: {
    margin: 0,
    color: "#334155",
    fontSize: 16,
    lineHeight: 1.8,
  },
  testimonialAuthor: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
    fontWeight: 600,
  },
  proofCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    display: "grid",
    alignContent: "center",
  },
  proofStat: {
    fontSize: 44,
    lineHeight: 1,
    fontWeight: 800,
    color: "#0f766e",
    marginBottom: 10,
  },
  proofText: {
    margin: 0,
    color: "#334155",
    fontSize: 16,
    lineHeight: 1.8,
  },
  sampleCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  sampleBadges: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  issueBadge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: 700,
  },
  scriptBadge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#ecfeff",
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 700,
  },
  samplePanel: {
    marginBottom: 16,
  },
  sampleTitle: {
    margin: "0 0 10px",
    fontSize: 18,
    lineHeight: 1.3,
    fontWeight: 700,
  },
  sampleList: {
    margin: 0,
    paddingLeft: 20,
    color: "#334155",
    lineHeight: 1.8,
  },
  scriptBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 16,
  },
  scriptLine: {
    margin: "0 0 10px",
    color: "#334155",
    lineHeight: 1.8,
    fontSize: 14,
  },
  finalCtaSection: {
    marginTop: 28,
  },
  finalCtaCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    textAlign: "center",
  },
  finalCtaTitle: {
    margin: "0 0 8px",
    fontSize: 26,
    lineHeight: 1.15,
    fontWeight: 800,
  },
  finalCtaText: {
    margin: "0 auto 16px",
    maxWidth: 560,
    color: "#475569",
    fontSize: 16,
    lineHeight: 1.7,
  },
  finalCtaButton: {
    border: "none",
    borderRadius: 12,
    background: "#0f766e",
    color: "#ffffff",
    padding: "16px 20px",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15, 118, 110, 0.18)",
  },
};
