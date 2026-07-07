import { z } from "zod";
import {
  buildGradeUserPrompt,
  EXTRACT_SYSTEM_PROMPT,
  EXTRACT_USER_PROMPT,
  GRADE_SYSTEM_PROMPT,
} from "./prompts";
import {
  buildVisionUserContent,
  createGroqJsonCompletion,
} from "./groq";
import {
  analysisResultSchema,
  extractResultSchema,
  gradeResultSchema,
  type AnalysisImage,
} from "./types";

const MAX_JSON_ATTEMPTS = 2;

function parseJsonObject(content: string) {
  return JSON.parse(content) as unknown;
}

async function parseWithRetry<T>(
  operation: () => Promise<string>,
  schema: z.ZodType<T>,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_JSON_ATTEMPTS; attempt += 1) {
    try {
      const content = await operation();
      return schema.parse(parseJsonObject(content));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function analyzeRecallImages(
  sourceImage: AnalysisImage,
  answerImage: AnalysisImage,
) {
  const extract = await parseWithRetry(
    () =>
      createGroqJsonCompletion([
        {
          role: "system",
          content: EXTRACT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildVisionUserContent(
            EXTRACT_USER_PROMPT,
            sourceImage,
            answerImage,
          ),
        },
      ]),
    extractResultSchema,
  );

  const grade = await parseWithRetry(
    () =>
      createGroqJsonCompletion([
        {
          role: "system",
          content: GRADE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildGradeUserPrompt(extract),
        },
      ]),
    gradeResultSchema.refine(
      (result) =>
        result.units.length === extract.answerUnits.length &&
        result.units.every(
          (unit, index) => unit.id === extract.answerUnits[index]?.id,
        ),
      "Grade units must preserve answer unit order and ids.",
    ),
  );

  return analysisResultSchema.parse({ extract, grade });
}
