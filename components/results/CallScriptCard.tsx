"use client";

export default function CallScriptCard({
  sections,
  copied,
  onCopy,
}: {
  sections: readonly string[];
  copied: boolean;
  onCopy?: () => void;
}) {
  const labels = [
    "Opening line",
    "Issue statement",
    "Request for review",
    "Fallback if denied",
    "Closing statement",
  ];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight text-gray-950">What to Say When You Call</h2>
          <p className="text-sm text-gray-700">Use this script to explain the issue clearly and request a review.</p>
        </div>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-200"
          >
            {copied ? "Copied" : "Copy Script"}
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 space-y-4">
        {sections.map((section, index) => (
          <div key={`${labels[index] || "Step"}-${index}`} className="space-y-2">
            <div className="text-xs text-blue-700 font-semibold uppercase tracking-[0.14em]">
              {labels[index] || "Script"}
            </div>
            <p className="text-sm text-gray-700">{section}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
