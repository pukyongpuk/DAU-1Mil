import { z } from "zod";
import type { AnalysisImage } from "./types";

type GroqContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string | GroqContent[];
};

const groqChatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable(),
        }),
      }),
    )
    .min(1),
});

export class GroqRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: string,
  ) {
    super(message);
    this.name = "GroqRequestError";
  }
}

export function getGroqVisionModel() {
  return (
    process.env.GROQ_VISION_MODEL?.trim() ||
    "meta-llama/llama-4-scout-17b-16e-instruct"
  );
}

export function buildVisionUserContent(
  prompt: string,
  sourceImage: AnalysisImage,
  answerImage: AnalysisImage,
): GroqContent[] {
  return [
    { type: "text", text: prompt },
    { type: "text", text: "첫 번째 이미지: 학습 자료" },
    {
      type: "image_url",
      image_url: {
        url: sourceImage.dataUrl,
      },
    },
    { type: "text", text: "두 번째 이미지: 사용자의 백지 복습 답안" },
    {
      type: "image_url",
      image_url: {
        url: answerImage.dataUrl,
      },
    },
  ];
}

export async function createGroqJsonCompletion(messages: GroqMessage[]) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getGroqVisionModel(),
      messages,
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_completion_tokens: 2048,
      stream: false,
    }),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new GroqRequestError(
      "Groq chat completion request failed.",
      response.status,
      responseBody,
    );
  }

  const parsed = groqChatCompletionSchema.parse(JSON.parse(responseBody));
  const content = parsed.choices[0]?.message.content;

  if (!content) {
    throw new Error("Groq chat completion returned an empty message.");
  }

  return content;
}
