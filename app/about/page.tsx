import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "About BillFixa",
  description: "Learn why BillFixa was built to help patients fix medical bill errors before they pay.",
};

const faqs = [
  {
    question: "Do you store my medical bill?",
    answer: "No. Files are processed temporarily and not stored.",
  },
  {
    question: "Is this accurate?",
    answer: "It’s based on AI and common billing patterns. Always verify.",
  },
  {
    question: "Why should I trust this?",
    answer: "Billing errors are common. This tool helps identify them.",
  },
  {
    question: "Do I need an account?",
    answer: "No.",
  },
  {
    question: "Is this a subscription?",
    answer: "No, one-time payment.",
  },
  {
    question: "Can this save me money?",
    answer: "Identifying one issue can offset the cost.",
  },
] as const;

export default function AboutPage() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <section style={styles.heroCard}>
          <div style={styles.eyebrow}>About BillFixa</div>
          <h1 style={styles.title}>Why we built BillFixa</h1>
          <p style={styles.subtitle}>
            Medical bills are confusing, inconsistent, and often wrong. We built BillFixa to help people
            understand what they’re paying — before they overpay.
          </p>
        </section>

        <section style={styles.section}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>The problem</h2>
            <div style={styles.list}>
              <div style={styles.listItem}>Medical bills are hard to understand.</div>
              <div style={styles.listItem}>Insurance denials and errors are common.</div>
              <div style={styles.listItem}>Many people pay without questioning charges.</div>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>The solution</h2>
            <div style={styles.list}>
              <div style={styles.listItem}>AI-powered bill analysis.</div>
              <div style={styles.listItem}>Plain English explanation.</div>
              <div style={styles.listItem}>Highlights potential issues.</div>
              <div style={styles.listItem}>Provides action steps.</div>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>What makes us different</h2>
            <div style={styles.list}>
              <div style={styles.listItem}>No subscriptions.</div>
              <div style={styles.listItem}>No account required.</div>
              <div style={styles.listItem}>No data storage.</div>
              <div style={styles.listItem}>Fast and simple.</div>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Trust and privacy</h2>
            <div style={styles.list}>
              <div style={styles.listItem}>We do NOT store uploaded documents.</div>
              <div style={styles.listItem}>We do NOT share data.</div>
              <div style={styles.listItem}>Secure processing.</div>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.noticeCard}>
            <h2 style={styles.sectionTitle}>Reality check</h2>
            <p style={styles.bodyText}>
              This tool is not a replacement for professionals. It helps you ask better questions before
              paying and gives you a clearer starting point when something looks wrong.
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>FAQ</h2>
            <div style={styles.faqList}>
              {faqs.map((item) => (
                <article key={item.question} style={styles.faqItem}>
                  <h3 style={styles.faqQuestion}>Q: {item.question}</h3>
                  <p style={styles.faqAnswer}>A: {item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100%",
  },
  container: {
    width: "100%",
    maxWidth: 900,
    margin: "0 auto",
  },
  heroCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "28px 24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginBottom: 24,
  },
  eyebrow: {
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
  title: {
    margin: "0 0 12px",
    fontSize: "clamp(2rem, 5vw, 3rem)",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    fontWeight: 800,
    color: "#111827",
  },
  subtitle: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.8,
    color: "#475569",
    maxWidth: 720,
  },
  section: {
    marginTop: 24,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  noticeCard: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#111827",
  },
  list: {
    display: "grid",
    gap: 10,
  },
  listItem: {
    color: "#334155",
    fontSize: 16,
    lineHeight: 1.7,
    fontWeight: 600,
  },
  bodyText: {
    margin: 0,
    color: "#475569",
    fontSize: 16,
    lineHeight: 1.8,
  },
  faqList: {
    display: "grid",
    gap: 16,
  },
  faqItem: {
    paddingBottom: 16,
    borderBottom: "1px solid #e5e7eb",
  },
  faqQuestion: {
    margin: "0 0 8px",
    fontSize: 18,
    lineHeight: 1.4,
    fontWeight: 700,
    color: "#111827",
  },
  faqAnswer: {
    margin: 0,
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.8,
  },
};
