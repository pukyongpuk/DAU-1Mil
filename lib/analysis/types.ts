import { z } from "zod";

export const answerUnitStatusSchema = z.enum([
  "correct",
  "partial",
  "incorrect",
  "unsupported",
  "unreadable",
]);

export const extractResultSchema = z.object({
  sourceKeyPoints: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .min(1),
  answerUnits: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .min(1),
});

export const gradeResultSchema = z.object({
  score: z.number().min(0).max(100),
  units: z
    .array(
      z.object({
        id: z.string().min(1),
        status: answerUnitStatusSchema,
        reason: z.string().min(1),
        correction: z.string().nullable(),
      }),
    )
    .min(1),
  missedKeyPoints: z.array(z.string().min(1)),
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
