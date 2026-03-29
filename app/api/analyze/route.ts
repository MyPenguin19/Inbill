import { NextResponse } from "next/server";

import {
  analyzeMedicalBillFromImage,
  analyzeMedicalBillFromText,
} from "@/lib/analysis";

function getReadableError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to generate medical bill analysis.";
  }

  const message = error.message;

  if (
    message.toLowerCase().includes("quota") ||
    message.toLowerCase().includes("insufficient_quota")
  ) {
    return "OpenAI project quota or billing limit reached. Verify OPENAI_PROJECT_ID, billing, and model access for the project tied to this API key.";
  }

  return message;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      extractedText?: string;
      imageDataUrl?: string;
    };

    if (!body.extractedText?.trim() && !body.imageDataUrl?.trim()) {
      return NextResponse.json(
        { error: "Missing extracted bill text or image input." },
        { status: 400 },
      );
    }

    const report = body.imageDataUrl?.trim()
      ? await analyzeMedicalBillFromImage(body.imageDataUrl)
      : await analyzeMedicalBillFromText(body.extractedText!.trim());

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      {
        error: getReadableError(error),
      },
      { status: 500 },
    );
  }
}
