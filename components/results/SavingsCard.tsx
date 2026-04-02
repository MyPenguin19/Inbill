"use client";

export default function SavingsCard({
  amount,
  insight,
  meaning,
}: {
  amount: string;
  insight: string;
  meaning: string;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-gray-950">Savings and Interpretation</h2>
      <p className="text-3xl font-semibold tracking-tight text-green-600">{amount}</p>
      <p className="max-w-[60ch] text-sm text-gray-700">{insight}</p>
      <p className="max-w-[60ch] text-sm text-gray-700">{meaning}</p>
    </section>
  );
}
