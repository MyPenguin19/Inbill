import { getOpenAIClient } from "@/lib/openai";
import type { AnalysisReport } from "@/lib/types";

const analysisPrompt = `
You are a senior medical billing auditor.

Your job is to analyze a medical bill or insurance EOB and produce a HIGH-VALUE report that helps a patient identify potential overcharges and take action BEFORE paying.

Your tone:
- Direct
- Practical
- Slightly assertive
- Focused on saving money

DO NOT:
- Be vague
- Give generic advice
- Sound like a chatbot

Assume common billing issues such as:
- Duplicate charges
- Upcoding with higher-level CPT codes
- Insurance denial errors
- Missing adjustments

Be specific:
- BAD: "This might be incorrect"
- GOOD: "Denied claims are one of the most common reasons patients overpay"

Make the output feel like:
"This could actually save me money"

OUTPUT (STRICT JSON ONLY):
{
  "summary": "Clear explanation of what this bill is and why it exists",
  "concern_level": {
    "level": "HIGH | MEDIUM | LOW",
    "reason": "Specific reason based on patterns like denial, duplicate billing, unusual pricing"
  },
  "potential_savings": {
    "range": "$X - $X",
    "reason": "Estimate based on common billing errors like duplicate charges, upcoding, or denial issues"
  },
  "key_findings": [
    {
      "title": "Short issue title",
      "impact": "Why this could cost the patient money",
      "action": "What to verify or challenge"
    }
  ],
  "priority_actions": [
    "Most important step first",
    "Second action",
    "Third action"
  ],
  "call_script": "A strong, confident script including the bill amount, asking for review, adjustments, or reprocessing. Should feel like the user knows what they're doing.",
  "risk_if_ignored": "Explain what happens if they just pay (loss of dispute rights, overpaying, etc.)"
}

Rules:
- Return valid JSON only
- Do not wrap the JSON in markdown
- concern_level.level must be HIGH, MEDIUM, or LOW
- priority_actions should contain exactly 3 action-focused steps
- key_findings should contain 3 to 5 findings
- call_script should mention the bill amount when visible
- potential_savings.range should be a realistic savings range or a cautious estimate if exact savings are unclear

CONSISTENCY RULES:
- Base all conclusions ONLY on visible document data
- Do NOT guess missing values
- If unclear, return "Not clearly stated"
- Use consistent reasoning for identical patterns
- Avoid rewording the same conclusions differently
- Use fixed phrasing when possible

RULE-BASED LOGIC:
- If insurance_paid = 0 or the claim is explicitly denied, set concern_level.level = HIGH
- If duplicate wording or repeated charge language is detected, include a duplicate charge finding
- If total > $100 and there is no visible coverage, mention overpayment risk
`;

function normalizeReport(data: unknown): AnalysisReport {
  if (!data || typeof data !== "object") {
    throw new Error("OpenAI response did not include a valid analysis object.");
  }

  const record = data as Record<string, unknown>;
  const toString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const concernLevel = record.concern_level as Record<string, unknown> | undefined;
  const potentialSavings = record.potential_savings as Record<string, unknown> | undefined;

  const findings = Array.isArray(record.key_findings)
    ? record.key_findings
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          title: toString(item.title),
          impact: toString(item.impact),
          action: toString(item.action),
        }))
        .filter((item) => item.title && item.impact && item.action)
    : [];

  const priorityActions = Array.isArray(record.priority_actions)
    ? record.priority_actions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const level = concernLevel?.level;

  return {
    summary: toString(record.summary) || "Not clearly stated",
    concern_level: {
      level: level === "HIGH" || level === "MEDIUM" || level === "LOW" ? level : "MEDIUM",
      reason: toString(concernLevel?.reason) || "Not clearly stated",
    },
    potential_savings: {
      range: toString(potentialSavings?.range) || "Not clearly stated",
      reason: toString(potentialSavings?.reason) || "Not clearly stated",
    },
    key_findings: findings,
    priority_actions: priorityActions.slice(0, 3),
    call_script: toString(record.call_script) || "Not clearly stated",
    risk_if_ignored: toString(record.risk_if_ignored) || "Not clearly stated",
  };
}

function parseReportJson(output: string): AnalysisReport {
  try {
    return normalizeReport(JSON.parse(output));
  } catch {
    throw new Error("OpenAI response was not valid JSON.");
  }
}

export async function analyzeMedicalBillFromText(extractedText: string): Promise<AnalysisReport> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    top_p: 1,
    messages: [
      {
        role: "system",
        content: analysisPrompt,
      },
      {
        role: "user",
        content: `INPUT:\n${extractedText}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const output = response.choices[0]?.message.content;

  if (!output) {
    throw new Error("OpenAI response did not include analysis output.");
  }

  return parseReportJson(output);
}

export async function analyzeMedicalBillFromImage(imageDataUrl: string): Promise<AnalysisReport> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    top_p: 1,
    messages: [
      {
        role: "system",
        content: analysisPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "INPUT: Analyze the medical bill or insurance EOB shown in this image. If part of the text is unclear, say that clearly in the JSON.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const output = response.choices[0]?.message.content;

  if (!output) {
    throw new Error("OpenAI response did not include analysis output.");
  }

  return parseReportJson(output);
}
