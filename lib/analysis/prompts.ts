import type { ExtractResult } from "./types";

export const EXTRACT_SYSTEM_PROMPT = [
  "You extract study material key points and handwritten recall answers.",
  "Return only valid JSON. Do not wrap the JSON in markdown.",
  "Keep all text in Korean unless the image clearly contains another language.",
].join("\n");

export const EXTRACT_USER_PROMPT = [
  "두 이미지를 분석하세요.",
  "첫 번째 이미지는 학습 자료이고, 두 번째 이미지는 사용자의 백지 복습 답안입니다.",
  "학습 자료에서 채점 기준이 되는 핵심 개념을 sourceKeyPoints로 추출하세요.",
  "사용자 답안은 의미 단위별 answerUnits로 나누되, 이미지에 보이는 순서를 반드시 유지하세요.",
  "각 id는 sourceKeyPoints는 kp-1, kp-2 형식, answerUnits는 au-1, au-2 형식으로 부여하세요.",
  "출력 JSON 형식:",
  '{"sourceKeyPoints":[{"id":"kp-1","text":"핵심 개념"}],"answerUnits":[{"id":"au-1","text":"사용자 답안 단위"}]}',
].join("\n");

export const GRADE_SYSTEM_PROMPT = [
  "You grade blank recall answers against extracted source key points.",
  "Return only valid JSON. Do not wrap the JSON in markdown.",
  "Do not use general knowledge that is not grounded in sourceKeyPoints.",
].join("\n");

export function buildGradeUserPrompt(extract: ExtractResult) {
  return [
    "아래 extract JSON만 근거로 사용자 answerUnits를 채점하세요.",
    "answerUnits의 순서와 id를 그대로 유지하세요.",
    "status는 correct, partial, incorrect, unsupported, unreadable 중 하나만 사용하세요.",
    "원문 핵심 개념에 없는 일반 지식 또는 이미지에 근거가 불충분한 내용은 unsupported로 처리하세요.",
    "읽기 어려워 의미를 확정할 수 없는 답안은 unreadable로 처리하세요.",
    "correct는 reason을 짧게 쓰고 correction은 null로 두세요.",
    "partial, incorrect, unsupported, unreadable은 reason 1문장과 최소 수정 문장 correction을 제공하세요.",
    "score는 전체 답안 품질을 0~100 숫자로 산정하세요.",
    "출력 JSON 형식:",
    '{"score":80,"units":[{"id":"au-1","status":"partial","reason":"이유","correction":"최소 수정 문장"}],"missedKeyPoints":["놓친 핵심 내용"]}',
    "extract JSON:",
    JSON.stringify(extract),
  ].join("\n");
}
