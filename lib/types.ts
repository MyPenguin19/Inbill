export type AnalysisSectionKey =
  | "summary"
  | "likelyOwe"
  | "potentialIssues"
  | "questionsToAsk"
  | "nextSteps"
  | "callScript";

export type AnalysisReport = Record<AnalysisSectionKey, string>;
