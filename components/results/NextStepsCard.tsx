"use client";

export default function NextStepsCard({ steps }: { steps: readonly string[] }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-gray-950">Next Steps</h2>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-gray-700">
            {index + 1}. {step}
          </div>
        ))}
      </div>
    </section>
  );
}
