import type { AnalysisReport } from "@/lib/types";

export function ReportView({ report }: { report: AnalysisReport }) {
  const groups = report
    .split(/(?=### )/)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => {
      const lines = section.split("\n");
      const title = lines[0]?.replace(/^###\s*/, "").trim() || "Analysis";
      const body = lines.slice(1).join("\n").trim();

      return { title, body };
    });

  return (
    <section className="report-section report-markdown">
      <p className="eyebrow">Structured report</p>
      {groups.length ? (
        groups.map((group) => (
          <div className="report-group" key={group.title}>
            <h2>{group.title}</h2>
            <div className="report-group-body">{group.body}</div>
          </div>
        ))
      ) : (
        <pre>{report}</pre>
      )}
    </section>
  );
}
