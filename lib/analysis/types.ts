import { z } from "zod";

function dropEmptyTextItems(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.filter((item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      "text" in item &&
      typeof item.text === "string"
    ) {
      return item.text.trim().length > 0;
    }

    return true;
  });
}

const nonEmptyTextSchema = z.string().trim().min(1);

export const answerUnitStatusSchema = z.enum([
  "correct",
  "partial",
  "incorrect",
  "unsupported",
  "unreadable",
]);

export const extractResultSchema = z.object({
  sourceKeyPoints: z.preprocess(
    dropEmptyTextItems,
    z
      .array(
        z.object({
          id: nonEmptyTextSchema,
          text: nonEmptyTextSchema,
        }),
      )
      .min(1),
  ),
  answerUnits: z.preprocess(
    dropEmptyTextItems,
    z
      .array(
        z.object({
          id: nonEmptyTextSchema,
          text: nonEmptyTextSchema,
        }),
      )
      .min(1),
  ),
});

export const gradeResultSchema = z.object({
  score: z.number().min(0).max(100),
  keyPoints: z
    .array(
      z.object({
        id: nonEmptyTextSchema,
        status: answerUnitStatusSchema,
        matchedAnswerUnitIds: z.array(nonEmptyTextSchema),
        reason: nonEmptyTextSchema,
        correction: nonEmptyTextSchema.nullable(),
      }),
    )
    .min(1),
  answerUnits: z
    .array(
      z.object({
        id: nonEmptyTextSchema,
        coveredKeyPointIds: z.array(nonEmptyTextSchema),
        unsupportedReason: nonEmptyTextSchema.nullable(),
      }),
    )
    .min(1),
  missedKeyPoints: z.array(
    z.object({
      id: nonEmptyTextSchema,
      text: nonEmptyTextSchema,
      reason: nonEmptyTextSchema,
    }),
  ),
});

export const analysisResultSchema = z.object({
  extract: extractResultSchema,
  grade: gradeResultSchema,
});

export type AnswerUnitStatus = z.infer<typeof answerUnitStatusSchema>;
export type ExtractResult = z.infer<typeof extractResultSchema>;
export type GradeResult = z.infer<typeof gradeResultSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export type AnalysisImage = {
  dataUrl: string;
  mimeType: string;
};
