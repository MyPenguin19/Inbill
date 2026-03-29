import { NextResponse } from "next/server";

import { analyzeMedicalBill } from "@/lib/analysis";
import { verifyMedicalBillSession } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      extractedText?: string;
      sessionId?: string;
    };

    if (!body.sessionId) {
      return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });
    }

    if (!body.extractedText?.trim()) {
      return NextResponse.json({ error: "Missing extracted bill text." }, { status: 400 });
    }

    const isPaid = await verifyMedicalBillSession(body.sessionId);

    if (!isPaid) {
      return NextResponse.json(
        { error: "Payment has not been verified for this session." },
        { status: 402 },
      );
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
