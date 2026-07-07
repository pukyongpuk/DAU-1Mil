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

const MAX_JSON_ATTEMPTS = 3;

function parseJsonObject(content: string) {
  return JSON.parse(content) as unknown;
}

function summarizeParseError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .slice(0, 8)
      .join("; ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown parse error";
}

function hasSameOrderedIds(
  values: Array<{ id: string }>,
  expected: Array<{ id: string }>,
) {
  return (
    values.length === expected.length &&
    values.every((value, index) => value.id === expected[index]?.id)
  );
}

async function parseWithRetry<T>(
  operation: (previousError: string | null) => Promise<string>,
  schema: z.ZodType<T>,
) {
  let lastError: unknown;
  let previousError: string | null = null;

  for (let attempt = 1; attempt <= MAX_JSON_ATTEMPTS; attempt += 1) {
    try {
      const content = await operation(previousError);
      return schema.parse(parseJsonObject(content));
    } catch (error) {
      lastError = error;
      previousError = summarizeParseError(error);
    }
  }

  throw lastError;
}

export async function analyzeRecallImages(
  sourceImage: AnalysisImage,
  answerImage: AnalysisImage,
) {
  const extract = await parseWithRetry(
    (previousError) =>
      createGroqJsonCompletion([
        {
          role: "system",
          content: EXTRACT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildVisionUserContent(
            previousError
              ? `${EXTRACT_USER_PROMPT}\n\n이전 응답 검증 실패: ${previousError}\n스키마를 정확히 지켜 JSON만 다시 출력하세요.`
              : EXTRACT_USER_PROMPT,
            sourceImage,
            answerImage,
          ),
        },
      ]),
    extractResultSchema,
  );

  const grade = await parseWithRetry(
    (previousError) =>
      createGroqJsonCompletion([
        {
          role: "system",
          content: GRADE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: previousError
            ? `${buildGradeUserPrompt(extract)}\n\n이전 응답 검증 실패: ${previousError}\n스키마, id 순서, 참조 id를 정확히 지켜 JSON만 다시 출력하세요.`
            : buildGradeUserPrompt(extract),
        },
      ]),
    gradeResultSchema.refine(
      (result) => {
        const sourceKeyPointIds = new Set(
          extract.sourceKeyPoints.map((keyPoint) => keyPoint.id),
        );
        const answerUnitIds = new Set(
          extract.answerUnits.map((answerUnit) => answerUnit.id),
        );

        return (
          hasSameOrderedIds(result.keyPoints, extract.sourceKeyPoints) &&
          hasSameOrderedIds(result.answerUnits, extract.answerUnits) &&
          result.keyPoints.every((keyPoint) =>
            keyPoint.matchedAnswerUnitIds.every((id) => answerUnitIds.has(id)),
          ) &&
          result.answerUnits.every((answerUnit) =>
            answerUnit.coveredKeyPointIds.every((id) =>
              sourceKeyPointIds.has(id),
            ),
          ) &&
          result.missedKeyPoints.every((keyPoint) =>
            sourceKeyPointIds.has(keyPoint.id),
          )
        );
      },
      "Grade result must preserve ids and only reference extracted ids.",
    ),
  );

  return analysisResultSchema.parse({ extract, grade });
}
