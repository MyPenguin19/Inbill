"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

const loadingSteps = [
  "Reading your statement",
  "Cross-checking line items",
  "Reviewing possible billing errors",
  "Preparing your action plan",
];

const findings = [
  {
    tone: "critical",
    icon: "🚨",
    title: "Duplicate facility fee detected",
    description: "Two nearly identical emergency department charges appear to reference the same visit window.",
  },
  {
    tone: "warning",
    icon: "⚠️",
    title: "Out-of-network rate may be misapplied",
    description: "Your explanation of benefits suggests negotiated pricing should apply to at least one imaging line item.",
  },
  {
    tone: "info",
    icon: "🩺",
    title: "Provider billing notes need clarification",
    description: "The physician fee description is too broad to verify whether professional and facility charges overlap.",
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"upload" | "notes">("upload");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState("");
  const [notesText, setNotesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleStep, setVisibleStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLElement | null>(null);

  const fileSummary = useMemo(() => {
    if (!selectedFile) {
      return "";
    }

    const sizeInMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
    return `${selectedFile.name} • ${sizeInMb} MB`;
  }, [selectedFile]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    setVisibleStep(0);
    const interval = window.setInterval(() => {
      setVisibleStep((current) => {
        if (current >= loadingSteps.length - 1) {
          window.clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, 850);

    const completeTimer = window.setTimeout(() => {
      setLoading(false);
      setShowResults(true);
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }, 3800);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(completeTimer);
    };
  }, [loading]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Unable to read the selected file."));
      reader.readAsDataURL(file);
    });

  const handleSelectedFile = async (file: File | null) => {
    setError("");
    setShowResults(false);

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

  const handleAnalyze = () => {
    setError("");

    if (activeTab === "upload" && !selectedFile) {
      setError("Choose a bill file before starting the review.");
      return;
    }

    if (activeTab === "notes" && !notesText.trim()) {
      setError("Paste a few bill details first so the analysis has something to review.");
      return;
    }

    setShowResults(false);
    setLoading(true);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setSelectedFileData("");
    setError("");
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&display=swap");

        :root {
          --bg: #f7f4ef;
          --surface: #ffffff;
          --surface-secondary: #f0ece4;
          --text: #1a1612;
          --muted: #6b6359;
          --accent: #1e5c4f;
          --accent-light: #e8f2ef;
          --warning: #c5522a;
          --border: #ddd8cf;
          --shadow-soft: 0 8px 48px rgba(26, 22, 18, 0.13);
          --radius-card: 20px;
          --radius-panel: 16px;
          --radius-input: 12px;
          --radius-button: 12px;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(30, 92, 79, 0.08), transparent 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0)),
            var(--bg);
          color: var(--text);
          font-family: "DM Sans", sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        input,
        textarea {
          font: inherit;
        }
      `}</style>

      <main className="front-shell">
        <nav className="front-nav">
          <a className="brand" href="#top">
            <span className="brand-mark" />
            <span className="brand-text">Inbill</span>
          </a>

          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#results">Results</a>
            <a href="#trust">Trust</a>
          </div>

          <a className="nav-cta" href="#action-card">
            Start Review
          </a>
        </nav>

        <section className="hero-section" id="top">
          <div className="hero-badge">Medical Bill Review, Reframed</div>
          <h1>
            Find the costly details hiding inside your medical bill before you <em>pay too much</em>.
          </h1>
          <p className="hero-subtitle">
            A calmer, clearer way to review confusing charges, surface likely errors, and prepare your next
            call with confidence.
          </p>

          <div className="trust-row" id="trust">
            <div className="trust-item">🔒 Private review flow</div>
            <div className="trust-item">⚡ Fast upload experience</div>
            <div className="trust-item">💸 Savings-focused guidance</div>
            <div className="trust-item">🧾 Structured findings</div>
          </div>
        </section>

        <section className="action-card" id="action-card">
          <div className="tab-switcher" role="tablist" aria-label="Review mode">
            <button
              className={activeTab === "upload" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveTab("upload")}
              type="button"
            >
              Upload Bill
            </button>
            <button
              className={activeTab === "notes" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveTab("notes")}
              type="button"
            >
              Paste Notes
            </button>
          </div>

          {activeTab === "upload" ? (
            <div className="tab-panel">
              <label
                className={dragActive ? "drop-zone drag-active" : "drop-zone"}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDrop={handleDrop}
              >
                <input accept=".pdf,image/*,.txt" className="hidden-file-input" onChange={handleFileInput} type="file" />
                <div className="upload-icon">⬆</div>
                <h2>Drag and drop your statement</h2>
                <p>PDF, image, or text. We keep everything in-memory for a lightweight review experience.</p>
                <span className="drop-zone-link">Browse files</span>
              </label>

              {selectedFile ? (
                <div className="file-preview-bar">
                  <div>
                    <strong>Ready for review</strong>
                    <p>{fileSummary}</p>
                  </div>
                  <button className="remove-file" onClick={removeFile} type="button">
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="tab-panel">
              <div className="notes-card">
                <label className="notes-label" htmlFor="bill-notes">
                  Paste claim notes or billing details
                </label>
                <textarea
                  id="bill-notes"
                  onChange={(event) => setNotesText(event.target.value)}
                  placeholder="Example: ER visit billed twice, insurer marked imaging as out of network, physician fee unclear..."
                  rows={6}
                  value={notesText}
                />
              </div>
            </div>
          )}

          {error ? <p className="form-error">{error}</p> : null}
          <button className="main-cta" onClick={handleAnalyze} type="button">
            Analyze My Bill
          </button>

          {selectedFileData ? <p className="hidden-helper">File encoded locally via FileReader for in-browser handling.</p> : null}
        </section>

        <section className={loading ? "loading-section visible" : "loading-section"} aria-hidden={!loading}>
          <div className="spinner" />
          <div className="progress-list">
            {loadingSteps.map((step, index) => (
              <div className={index <= visibleStep ? "progress-step active" : "progress-step"} key={step}>
                <span className="progress-dot" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={showResults ? "results-section visible" : "results-section"} id="results" ref={resultsRef}>
          <div className="results-header">
            <div>
              <p className="section-label">Review Snapshot</p>
              <h2>What deserves your attention now</h2>
            </div>
            <span className="results-badge">Action-ready summary</span>
          </div>

          <div className="stats-grid">
            <article className="stat-card stat-red">
              <strong>3</strong>
              <span>Potential Issues</span>
            </article>
            <article className="stat-card stat-amber">
              <strong>Moderate</strong>
              <span>Negotiation Risk</span>
            </article>
            <article className="stat-card stat-green">
              <strong>$482</strong>
              <span>Possible Savings</span>
            </article>
          </div>

          <div className="findings-list">
            {findings.map((finding) => (
              <article className={`finding-card ${finding.tone}`} key={finding.title}>
                <div className="finding-icon">{finding.icon}</div>
                <div>
                  <h3>{finding.title}</h3>
                  <p>{finding.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="summary-box">
            <span className="summary-label">AI Summary</span>
            <div className="summary-content">
              The bill appears to combine one legitimate emergency visit with at least one charge that should be
              clarified or disputed. The fastest path is to request an itemized statement, confirm network status
              for imaging, and ask whether the physician fee overlaps with the facility charge.
            </div>
          </div>

          <div className="results-actions">
            <button className="action-outline" type="button">
              Download Notes
            </button>
            <button className="action-outline" type="button">
              Email Summary
            </button>
            <button className="action-filled" type="button">
              Start Another Review
            </button>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <p className="section-label">How It Works</p>
          <h2>A clear path from confusion to action</h2>
          <p className="section-copy">
            The flow is designed to feel more like a financial review desk than a generic upload form.
          </p>

          <div className="how-grid">
            {[
              ["01", "Upload or paste", "Bring in the statement itself or the billing notes you already have."],
              ["02", "Surface the risks", "Spot duplicate charges, unclear fees, and likely coverage mismatches."],
              ["03", "Prepare your call", "Turn findings into a calmer script for the provider or insurer."],
              ["04", "Decide next steps", "Know what to dispute, what to verify, and what may actually be owed."],
            ].map(([number, title, copy]) => (
              <article className="how-card" key={number}>
                <span className="how-number">{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="stats-banner">
          <div className="stats-banner-grid">
            <article>
              <strong>27%</strong>
              <span>Average line items that need clarification</span>
            </article>
            <article>
              <strong>4 min</strong>
              <span>Time to produce an action-oriented review</span>
            </article>
            <article>
              <strong>1 plan</strong>
              <span>Simple next steps for your next billing call</span>
            </article>
          </div>
        </section>

        <footer className="front-footer">
          <div className="footer-links">
            <a href="#top">Home</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#results">Results</a>
          </div>
          <p>© 2026 Inbill. Built for clearer billing conversations.</p>
          <p className="footer-disclaimer">
            This interface is an informational review tool and does not replace legal, medical, or insurance advice.
          </p>
        </footer>
      </main>

      <style jsx>{`
        .front-shell {
          min-height: 100vh;
        }

        .front-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
          padding: 0 24px;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(10px);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .brand-mark {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          background: var(--accent);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
        }

        .brand-text,
        h1,
        h2,
        h3,
        .stat-card strong,
        .stats-banner strong {
          font-family: "Playfair Display", serif;
        }

        .brand-text {
          color: var(--accent);
          font-size: 1.35rem;
          font-weight: 800;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
          color: var(--muted);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .nav-cta {
          padding: 8px 14px;
          border-radius: 10px;
          background: var(--accent);
          color: #fff;
          font-size: 0.92rem;
          font-weight: 600;
        }

        .hero-section,
        .action-card,
        .how-section,
        .stats-banner,
        .front-footer,
        .results-section,
        .loading-section {
          width: min(1120px, calc(100vw - 32px));
          margin: 0 auto;
        }

        .hero-section {
          display: grid;
          justify-items: center;
          padding: 5rem 0 2.5rem;
          text-align: center;
        }

        .hero-badge,
        .results-badge,
        .section-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 14px;
          border-radius: 999px;
          background: var(--accent-light);
          color: var(--accent);
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        h1 {
          max-width: 900px;
          margin: 20px 0 18px;
          font-size: clamp(2.4rem, 5vw, 3.8rem);
          font-weight: 900;
          line-height: 1.08;
          letter-spacing: -1px;
        }

        h1 em {
          color: var(--accent);
          font-style: italic;
        }

        .hero-subtitle,
        .section-copy {
          max-width: 560px;
          margin: 0;
          color: var(--muted);
          font-size: 1.1rem;
          line-height: 1.7;
        }

        .trust-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 28px;
        }

        .trust-item {
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.7);
          color: var(--muted);
          font-size: 0.92rem;
        }

        .action-card {
          padding: 28px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
          box-shadow: var(--shadow-soft);
        }

        .tab-switcher {
          display: inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 999px;
          background: var(--surface-secondary);
        }

        .tab-button {
          padding: 10px 16px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: var(--muted);
          font-weight: 600;
          cursor: pointer;
        }

        .tab-button.active {
          background: #fff;
          color: var(--text);
          box-shadow: 0 6px 20px rgba(26, 22, 18, 0.1);
        }

        .tab-panel {
          margin-top: 22px;
        }

        .drop-zone,
        .notes-card {
          display: grid;
          justify-items: center;
          gap: 10px;
          padding: 34px 24px;
          border: 2px dashed var(--border);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(240, 236, 228, 0.45), rgba(255, 255, 255, 0.8));
          text-align: center;
          transition:
            border-color 160ms ease,
            transform 160ms ease,
            background 160ms ease;
          cursor: pointer;
        }

        .drop-zone:hover,
        .drop-zone.drag-active {
          border-color: var(--accent);
          background: linear-gradient(180deg, rgba(232, 242, 239, 0.8), rgba(255, 255, 255, 0.92));
          transform: translateY(-2px);
        }

        .upload-icon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: var(--accent-light);
          color: var(--accent);
          font-size: 1.35rem;
          font-weight: 700;
        }

        .drop-zone h2,
        .how-section h2,
        .results-header h2 {
          margin: 0;
          font-size: 2rem;
        }

        .drop-zone p,
        .notes-card p,
        .how-card p,
        .finding-card p,
        .front-footer p {
          margin: 0;
          color: var(--muted);
          line-height: 1.65;
        }

        .drop-zone-link {
          color: var(--accent);
          font-weight: 700;
        }

        .hidden-file-input {
          display: none;
        }

        .notes-card {
          justify-items: stretch;
          text-align: left;
          cursor: default;
        }

        .notes-label {
          font-weight: 700;
        }

        .notes-card textarea {
          resize: vertical;
          min-height: 170px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-input);
          background: #fff;
          color: var(--text);
        }

        .file-preview-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 18px;
          padding: 16px 18px;
          border: 1px solid #cfe1db;
          border-radius: 16px;
          background: var(--accent-light);
        }

        .file-preview-bar strong,
        .finding-card h3,
        .how-card h3 {
          display: block;
          margin: 0 0 4px;
          color: var(--text);
        }

        .file-preview-bar p {
          margin: 0;
          color: var(--muted);
          font-size: 0.95rem;
        }

        .remove-file,
        .action-outline {
          padding: 11px 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-button);
          background: transparent;
          color: var(--text);
          font-weight: 600;
          cursor: pointer;
        }

        .main-cta,
        .action-filled {
          width: 100%;
          margin-top: 18px;
          padding: 16px;
          border: none;
          border-radius: var(--radius-button);
          background: var(--accent);
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(30, 92, 79, 0.18);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .main-cta:hover,
        .action-filled:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px rgba(30, 92, 79, 0.22);
        }

        .form-error,
        .hidden-helper {
          margin: 14px 2px 0;
          color: var(--warning);
          font-size: 0.95rem;
        }

        .hidden-helper {
          color: var(--muted);
        }

        .loading-section,
        .results-section {
          display: none;
          margin-top: 24px;
        }

        .loading-section.visible,
        .results-section.visible {
          display: grid;
        }

        .loading-section {
          justify-items: center;
          gap: 20px;
          padding: 26px 0 8px;
        }

        .spinner {
          width: 46px;
          height: 46px;
          border: 4px solid rgba(30, 92, 79, 0.16);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .progress-list {
          display: grid;
          gap: 12px;
          width: min(480px, 100%);
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--muted);
          opacity: 0.42;
          transition: opacity 220ms ease;
        }

        .progress-step.active {
          opacity: 1;
        }

        .progress-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(30, 92, 79, 0.22);
          animation: pulse 1.4s ease-in-out infinite;
        }

        .progress-step.active .progress-dot {
          background: var(--accent);
        }

        .results-section {
          gap: 24px;
          padding-top: 24px;
        }

        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .stat-card {
          padding: 22px;
          border-radius: 18px;
          border: 1px solid transparent;
        }

        .stat-card strong {
          display: block;
          font-size: 2rem;
        }

        .stat-card span {
          display: block;
          margin-top: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .stat-red {
          background: #faece8;
          color: #8f3416;
        }

        .stat-amber {
          background: #fbf3df;
          color: #8c6720;
        }

        .stat-green {
          background: #e8f2ef;
          color: var(--accent);
        }

        .findings-list {
          display: grid;
          gap: 14px;
        }

        .finding-card {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 14px;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid var(--border);
        }

        .finding-card.critical {
          background: #fbefea;
        }

        .finding-card.warning {
          background: #fbf5e5;
        }

        .finding-card.info {
          background: #edf6f3;
        }

        .finding-icon {
          font-size: 1.35rem;
          line-height: 1;
        }

        .summary-box {
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--surface-secondary);
        }

        .summary-label {
          display: inline-block;
          margin-bottom: 12px;
          color: var(--muted);
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .summary-content {
          padding: 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--text);
          font-family: "Courier New", monospace;
          line-height: 1.75;
        }

        .results-actions {
          display: flex;
          gap: 12px;
        }

        .action-filled {
          width: auto;
          margin-top: 0;
        }

        .how-section {
          padding: 90px 0 48px;
          text-align: center;
        }

        .how-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 18px;
          margin-top: 34px;
        }

        .how-card {
          position: relative;
          padding: 1.8rem;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          text-align: left;
        }

        .how-number {
          display: inline-block;
          margin-bottom: 22px;
          color: var(--border);
          font-family: "Playfair Display", serif;
          font-size: 3rem;
          font-weight: 800;
          line-height: 1;
        }

        .stats-banner {
          margin-top: 24px;
          padding: 32px 20px;
          border-radius: 24px;
          background: var(--accent);
        }

        .stats-banner-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .stats-banner strong {
          display: block;
          color: #a8d5cb;
          font-size: 2.2rem;
        }

        .stats-banner span {
          display: block;
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.5;
        }

        .front-footer {
          margin-top: 28px;
          padding: 36px 0 48px;
          border-radius: 24px 24px 0 0;
          background: #1a1612;
          text-align: center;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 18px;
          margin-bottom: 14px;
          color: rgba(255, 255, 255, 0.9);
        }

        .front-footer p {
          color: rgba(255, 255, 255, 0.72);
        }

        .footer-disclaimer {
          max-width: 640px;
          margin: 14px auto 0;
          color: rgba(255, 255, 255, 0.5);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        @media (max-width: 900px) {
          .results-header,
          .results-actions {
            flex-direction: column;
            align-items: flex-start;
          }

          .stats-grid,
          .stats-banner-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .front-nav {
            padding: 0 16px;
          }

          .nav-links {
            display: none;
          }

          .hero-section {
            padding-top: 4rem;
          }

          .action-card {
            padding: 20px;
          }

          .tab-switcher {
            width: 100%;
          }

          .tab-button {
            flex: 1;
          }

          .file-preview-bar,
          .results-actions {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </>
  );
}
