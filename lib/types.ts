export type AnalysisReport = {
  summary: string;
  provider_name?: string;
  total_bill?: string;
  cpt_codes?: string[];
  dates_of_service?: string[];
  charge_descriptions?: string[];
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
  personalized_call_scripts?: {
    short_version: string;
    detailed_version: string;
    confidence_note: string;
  };
  dispute_letter?: {
    email_version: string;
    formal_letter_version: string;
  };
  risk_if_ignored: string;
};
