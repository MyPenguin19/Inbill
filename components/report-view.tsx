import type { AnalysisReport } from "@/lib/types";

export function ReportView({ report }: { report: AnalysisReport }) {
  return (
    <section className="report-section report-markdown">
      <p className="eyebrow">Structured report</p>
      <div className="report-group">
        <h2>Summary</h2>
        <div className="report-group-body">{report.summary}</div>
      </div>
    </section>
  );
}
