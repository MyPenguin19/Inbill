import { getOpenAIClient } from "@/lib/openai";
import type { AnalysisReport } from "@/lib/types";

const analysisPrompt = `
You are an expert medical billing analyst.

Your job is to analyze a medical bill or insurance EOB (Explanation of Benefits) and produce a clear, structured, actionable report for a patient with no medical or billing knowledge.

IMPORTANT RULES:
- Do NOT provide medical or legal advice.
- Do NOT guarantee errors or outcomes.
- Use cautious language like "may", "potential", "commonly seen".
- Focus on helping the user understand and take action.
- Be specific, not generic.
- Avoid fluff.

Return valid JSON only with exactly these keys:
- summary: string
- owed: string[]
- issues: string[]
- questions: string[]
- steps: string[]
- script: string[]

Field rules:
- summary should be a short plain-English paragraph
- owed should contain 3-4 short lines about total billed, insurance paid, and patient responsibility
- issues should contain 3-6 practical red flags
- questions should contain 5-7 specific questions
- steps should contain 3-5 clear next actions
- script should contain 4-6 short lines for a call script
- Do not wrap the JSON in markdown
`;

function normalizeReport(data: unknown): AnalysisReport {
  if (!data || typeof data !== "object") {
    throw new Error("OpenAI response did not include a valid analysis object.");
  }

  const record = data as Record<string, unknown>;
  const toStringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

  return {
    summary: typeof record.summary === "string" ? record.summary : "",
    owed: toStringArray(record.owed),
    issues: toStringArray(record.issues),
    questions: toStringArray(record.questions),
    steps: toStringArray(record.steps),
    script: toStringArray(record.script),
  };
}

function parseReportJson(output: string): AnalysisReport {
  try {
    return normalizeReport(JSON.parse(output));
  } catch {
    throw new Error("OpenAI response was not valid JSON.");
  }
}

export async function analyzeMedicalBillFromText(
  extractedText: string,
): Promise<AnalysisReport> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: analysisPrompt,
      },
      {
        role: "user",
        content: `INPUT:\nThe following is a medical bill or EOB:\n\n${extractedText}`,
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

export async function analyzeMedicalBillFromImage(
  imageDataUrl: string,
): Promise<AnalysisReport> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
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
            text: "INPUT: Analyze the medical bill or EOB shown in this image. If some text is unclear, say that clearly in the report.",
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
