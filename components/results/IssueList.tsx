"use client";

import type { ReportIssue } from "@/components/results/types";

export default function IssueList({ issues }: { issues: readonly ReportIssue[] }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 space-y-6">
      <h2 className="text-lg font-semibold tracking-tight text-gray-950">Issues Found</h2>
      <div className="space-y-4">
        {issues.map((issue) => (
          <div key={issue.title} className="flex gap-4 rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="w-[4px] rounded-full bg-red-500" />
            <div className="space-y-2">
              <div className="text-lg font-semibold tracking-tight text-gray-950">{issue.title}</div>
              <p className="text-sm text-gray-700">{issue.description}</p>
              <p className="text-sm font-semibold text-gray-900">{issue.impact}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
