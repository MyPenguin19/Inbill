export type AnalysisReport = {
  summary: string;
  concern_level: {
    level: "HIGH" | "MEDIUM" | "LOW";
    reason: string;
  };
  potential_savings: {
    range: string;
    reason: string;
  };
  key_findings: Array<{
    title: string;
    impact: string;
    action: string;
  }>;
  priority_actions: string[];
  call_script: string;
  risk_if_ignored: string;
};
