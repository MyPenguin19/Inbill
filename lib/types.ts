export type AnalysisReport = {
  summary: string;
  concern: {
    level: "HIGH" | "MEDIUM" | "LOW";
    explanation: string;
  };
  savings: string;
  owed: string[];
  issues: string[];
  questions: string[];
  steps: string[];
  script: string[];
  ifPayNow: string[];
};
