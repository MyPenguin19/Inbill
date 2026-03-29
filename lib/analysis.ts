import { getOpenAIClient } from "@/lib/openai";
import type { AnalysisReport } from "@/lib/types";

const sectionInstructions = `
You are a medical billing advocate assistant for consumers.
Review the medical bill text and provide a helpful, cautious analysis.
Do not claim legal certainty.
Be clear, concise, and practical.
Return valid JSON only with these exact keys:
- summary
- likelyOwe
- potentialIssues
- questionsToAsk
- nextSteps
- callScript
`;

export async function analyzeMedicalBill(
  extractedText: string,
): Promise<AnalysisReport> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: sectionInstructions,
      },
      {
        role: "user",
        content: `Analyze this medical bill text and return JSON with the required keys only:\n\n${extractedText}`,
      },
    ],
  });

  const output = response.choices[0]?.message.content;

  if (!output) {
    throw new Error("OpenAI response did not include structured output.");
  }

  return JSON.parse(output) as AnalysisReport;
}
