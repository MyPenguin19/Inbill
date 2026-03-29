import { NextResponse } from "next/server";

import { analyzeMedicalBill } from "@/lib/analysis";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      extractedText?: string;
      sessionId?: string;
    };

    if (!body.extractedText?.trim()) {
      return NextResponse.json({ error: "Missing extracted bill text." }, { status: 400 });
    }

    const report = await analyzeMedicalBill(body.extractedText);

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
