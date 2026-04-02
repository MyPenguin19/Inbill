"use client";

import type { SummaryCardProps } from "@/components/results/types";

export default function SummaryCard({
  label,
  title,
  amount,
  amountLabel,
  confidenceScore,
  confidenceLabel,
  riskScore,
  riskLabel,
  verdict,
}: SummaryCardProps) {
  const riskColor =
    riskScore > 70 ? "bg-red-500" : riskScore > 40 ? "bg-yellow-400" : "bg-green-500";

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="space-y-2">
        {label ? <div className="text-xs text-gray-400">{label}</div> : null}
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-950">{title}</h1>
      </div>

      <div className="rounded-2xl border border-green-100 bg-green-50 p-6 space-y-4">
        <div>
          <div className="text-4xl md:text-5xl font-semibold tracking-tight text-green-600">{amount}</div>
          <div className="text-sm text-gray-500">{amountLabel}</div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-500">Confidence Level</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${confidenceScore}%` }} />
          </div>
          <p className="text-sm font-medium text-gray-900">{confidenceLabel}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-500">Billing Risk Level</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full ${riskColor}`} style={{ width: `${riskScore}%` }} />
          </div>
          <p className="text-sm font-medium text-gray-900">{riskLabel}</p>
        </div>
      </div>

      <p className="max-w-[60ch] text-sm text-gray-700">{verdict}</p>
    </section>
  );
}
