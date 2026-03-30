import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import {
  analyzeMedicalBillFromImage,
  analyzeMedicalBillFromText,
} from "@/lib/analysis";
import type { AnalysisReport } from "@/lib/types";

const analysisCache = new Map<string, AnalysisReport>();

function getCacheKey(input: { extractedText?: string; imageDataUrl?: string }) {
  const normalizedInput = JSON.stringify({
    extractedText: input.extractedText?.trim() || "",
    imageDataUrl: input.imageDataUrl?.trim() || "",
  });

  return createHash("sha256").update(normalizedInput).digest("hex");
}

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

    const cacheKey = getCacheKey(body);
    const cachedReport = analysisCache.get(cacheKey);

    if (cachedReport) {
      return NextResponse.json({ report: cachedReport });
    }

    const report = body.imageDataUrl?.trim()
      ? await analyzeMedicalBillFromImage(body.imageDataUrl)
      : await analyzeMedicalBillFromText(body.extractedText!.trim());

    analysisCache.set(cacheKey, report);

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
