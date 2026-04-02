export type ReportIssue = {
  title: string;
  description: string;
  impact: string;
};

export type SummaryCardProps = {
  label?: string;
  title: string;
  amount: string;
  amountLabel: string;
  confidenceScore: number;
  confidenceLabel: string;
  riskScore: number;
  riskLabel: string;
  verdict: string;
};
