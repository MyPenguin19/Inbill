import type { AnalysisReport } from "@/lib/types";

const sectionOrder: Array<{ key: keyof AnalysisReport; title: string }> = [
  { key: "summary", title: "Summary" },
  { key: "likelyOwe", title: "What You Likely Owe" },
  { key: "potentialIssues", title: "Potential Issues" },
  { key: "questionsToAsk", title: "Questions to Ask" },
  { key: "nextSteps", title: "Next Steps" },
  { key: "callScript", title: "Call Script" },
];

export function ReportView({ report }: { report: AnalysisReport }) {
  return (
    <div className="report-grid">
      {sectionOrder.map((section) => (
        <section className="report-section" key={section.key}>
          <h2>{section.title}</h2>
          <p>{report[section.key]}</p>
        </section>
      ))}
    </div>
  );
}
