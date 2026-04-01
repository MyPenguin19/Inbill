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
  "provider_name": "Visible provider, hospital, or billing entity name. If unclear, return Not clearly stated",
  "total_bill": "Visible total bill amount. If unclear, return Not clearly stated",
  "cpt_codes": ["Visible CPT codes only"],
  "dates_of_service": ["Visible dates of service only"],
  "charge_descriptions": ["Visible charge descriptions only"],
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
  "personalized_call_scripts": {
    "short_version": "Short version under 120 words using the bill details below.",
    "detailed_version": "Detailed version under 120 words using 1-2 identified issues, provider name, bill amount, codes or dates if visible.",
    "confidence_note": "This script is based on issues found in your bill"
  },
  "dispute_letter": {
    "email_version": "Shorter email-ready dispute letter under 200 words.",
    "formal_letter_version": "Formal printable dispute letter under 200 words."
  },
  "risk_if_ignored": "Explain what happens if they just pay (loss of dispute rights, overpaying, etc.)"
}

Rules:
- Return valid JSON only
- Do not wrap the JSON in markdown
- concern_level.level must be HIGH, MEDIUM, or LOW
- priority_actions should contain exactly 3 action-focused steps
- key_findings should contain 3 to 5 findings
- call_script should mention the bill amount when visible
- personalized_call_scripts.short_version and personalized_call_scripts.detailed_version must sound like a real patient calling a billing department
- personalized_call_scripts.detailed_version should mention 1-2 identified issues and use provider name, total bill, CPT codes, dates of service, or charge descriptions when clearly visible
- if there are no strong issues, use a softer review script asking for a detailed review of the charges
- dispute_letter.email_version and dispute_letter.formal_letter_version must be ready to send and based on the visible bill details
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

CALL SCRIPT PROMPTING RULES:
- Generate a SHORT, NATURAL phone script the patient can read when calling the billing department
- Use specific details from the bill
- Mention at least 1-2 identified issues
- Sound confident but polite
- Keep each version under 120 words
- Avoid legal language
- Make it sound like a real human
- Include an opening line, an issue mention, and a request for review or correction

DISPUTE LETTER PROMPTING RULES:
- Write a clear, professional dispute letter addressed to the billing department
- Use real bill details when visible
- Mention specific issues found
- Keep tone polite but firm
- Keep each version under 200 words
- Avoid legal threats or aggressive language
- Make it ready to send as email or print
- Use this structure: opening, issue explanation, request for review or correction, closing
- If the analysis is weak, generate a general review request asking for a detailed review of the bill
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
  const personalizedScripts = record.personalized_call_scripts as Record<string, unknown> | undefined;
  const disputeLetter = record.dispute_letter as Record<string, unknown> | undefined;
  const toStringArray = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

  const level = concernLevel?.level;

  return {
    summary: toString(record.summary) || "Not clearly stated",
    provider_name: toString(record.provider_name) || "Not clearly stated",
    total_bill: toString(record.total_bill) || "Not clearly stated",
    cpt_codes: toStringArray(record.cpt_codes),
    dates_of_service: toStringArray(record.dates_of_service),
    charge_descriptions: toStringArray(record.charge_descriptions),
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
    personalized_call_scripts: {
      short_version:
        toString(personalizedScripts?.short_version) ||
        toString(record.call_script) ||
        "Not clearly stated",
      detailed_version:
        toString(personalizedScripts?.detailed_version) ||
        toString(record.call_script) ||
        "Not clearly stated",
      confidence_note:
        toString(personalizedScripts?.confidence_note) ||
        "This script is based on issues found in your bill",
    },
    dispute_letter: {
      email_version:
        toString(disputeLetter?.email_version) ||
        "I am requesting a detailed review of my medical bill and any charges that may be incorrect.",
      formal_letter_version:
        toString(disputeLetter?.formal_letter_version) ||
        "Dear Billing Department,\n\nI am requesting a detailed review of my medical bill and any charges that may be incorrect.\n\nSincerely,\nPatient",
    },
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
