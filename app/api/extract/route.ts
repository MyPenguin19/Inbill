import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";

import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/bill";

function validateFile(file: File) {
  if (!file.size) {
    throw new Error("The uploaded file is empty.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Please upload a file smaller than 10MB.");
  }
}

async function extractTextFromPdf(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });

  try {
    const parsed = await parser.getText();
    return parsed.text.trim();
  } finally {
    await parser.destroy();
  }
}

async function extractTextFromTextFile(file: File) {
  return (await file.text()).trim();
}

async function extractTextFromImage(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const worker = await createWorker("eng");

  try {
    const result = await worker.recognize(buffer);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const maybeFile = formData.get("file");

    if (!(maybeFile instanceof File)) {
      return NextResponse.json({ error: "Missing uploaded file." }, { status: 400 });
    }

    validateFile(maybeFile);

    let extractedText = "";

    if (maybeFile.type === "application/pdf") {
      extractedText = await extractTextFromPdf(maybeFile);
    } else if (maybeFile.type.startsWith("image/")) {
      extractedText = await extractTextFromImage(maybeFile);
    } else {
      extractedText = await extractTextFromTextFile(maybeFile);
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "We could not extract readable text from that file." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      extractedText,
      fileName: maybeFile.name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to extract bill text.",
      },
      { status: 500 },
    );
  }
}
