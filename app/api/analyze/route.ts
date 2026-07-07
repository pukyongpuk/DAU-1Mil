import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { analyzeRecallImages } from "../../../lib/analysis/analyze";
import { GroqRequestError } from "../../../lib/analysis/groq";
import type { AnalysisImage } from "../../../lib/analysis/types";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_FIELD_ALIASES = {
  source: ["sourceImage", "studyImage", "materialImage"],
  answer: ["answerImage", "recallImage", "blankRecallImage"],
} as const;

function getImageFile(formData: FormData, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = formData.get(alias);

    if (value instanceof File) {
      return value;
    }
  }

  return null;
}

async function toAnalysisImage(file: File): Promise<AnalysisImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image files must be 3MB or smaller.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    dataUrl: `data:${file.type};base64,${buffer.toString("base64")}`,
    mimeType: file.type,
  };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sourceFile = getImageFile(formData, IMAGE_FIELD_ALIASES.source);
    const answerFile = getImageFile(formData, IMAGE_FIELD_ALIASES.answer);

    if (!sourceFile || !answerFile) {
      return errorResponse(
        "sourceImage and answerImage image files are required.",
        400,
      );
    }

    const result = await analyzeRecallImages(
      await toAnalysisImage(sourceFile),
      await toAnalysisImage(answerFile),
    );

    return NextResponse.json(result);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }

    if (error instanceof GroqRequestError) {
      return errorResponse("Analysis request failed.", 502);
    }

    if (error instanceof ZodError) {
      return errorResponse("Analysis response was not valid JSON.", 502);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Analysis response was not valid JSON.", 502);
    }

    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }

    return errorResponse("Unexpected analysis error.", 500);
  }
}
