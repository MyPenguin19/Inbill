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

OUTPUT FORMAT (STRICT — FOLLOW EXACTLY):

### 1. Summary (Plain English)
Explain in simple terms:
- What this bill is for
- What services were provided (if identifiable)
- Why the total cost might be high

Keep it short and clear.

---

### 2. What You Likely Owe
Break down:
- Total billed amount
- Insurance paid (if visible)
- Patient responsibility (estimate if unclear)

If unclear, explain why.

---

### 3. Potential Issues or Red Flags
List 3–6 specific items such as:
- Duplicate charges
- Unclear or vague descriptions
- High-cost line items
- Out-of-network indicators
- Billing codes that commonly cause confusion

For each:
- Explain WHY it may be an issue
- Keep it practical, not theoretical

---

### 4. Questions You Should Ask
Provide 5–7 VERY SPECIFIC questions the user can ask their provider or insurer.

---

### 5. Suggested Next Steps
Give 3–5 clear actions:
- Request documents
- Call billing department
- Verify insurance coverage
- Ask for discounts or payment plans

---

### 6. Call Script (HIGH VALUE — THIS IS CRITICAL)
Write a short, confident script the user can read when calling.

Structure:
- Opening line
- Key questions to ask
- Pushback line if needed
- Closing

Tone:
- Calm
- Assertive
- Not aggressive

---

### 7. Important Note
Add a short disclaimer:
"This analysis is for informational purposes only and does not constitute medical or legal advice. Please verify all details with your provider or insurance company."

---

STYLE:
- Clean formatting
- Bullet points where helpful
- No long paragraphs
- No jargon unless explained
`;

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
  });

  const output = response.choices[0]?.message.content;

  if (!output) {
    throw new Error("OpenAI response did not include analysis output.");
  }

  return output;
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
  });

  const output = response.choices[0]?.message.content;

  if (!output) {
    throw new Error("OpenAI response did not include analysis output.");
  }

  return output;
}
