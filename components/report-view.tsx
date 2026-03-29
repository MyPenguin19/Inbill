import type { AnalysisReport } from "@/lib/types";

export function ReportView({ report }: { report: AnalysisReport }) {
  return (
    <section className="report-section report-markdown">
      <pre>{report}</pre>
    </section>
  );
}
