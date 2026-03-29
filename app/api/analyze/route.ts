import { NextResponse } from "next/server";

import {
  analyzeMedicalBillFromImage,
  analyzeMedicalBillFromText,
} from "@/lib/analysis";

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
        error:
          error instanceof Error ? error.message : "Unable to generate medical bill analysis.",
      },
      { status: 500 },
    );
  }
}
