import type { ExtractResult } from "./types";

export const EXTRACT_SYSTEM_PROMPT = [
  "You extract study material key points and handwritten recall answers.",
  "Return only valid JSON. Do not wrap the JSON in markdown.",
  "Keep all text in Korean unless the image clearly contains another language.",
].join("\n");

export const EXTRACT_USER_PROMPT = [
  "두 이미지를 분석하세요.",
  "첫 번째 이미지는 학습 자료이고, 두 번째 이미지는 사용자의 백지 복습 답안입니다.",
  "학습 자료에서 채점 기준이 되는 원자적 핵심 개념을 sourceKeyPoints로 여러 개 추출하세요.",
  "sourceKeyPoints는 문단 요약이 아니라 하나씩 채점할 수 있는 최소 개념 단위여야 합니다.",
  "사용자 답안은 의미 단위별 answerUnits로 나누되, 이미지에 보이는 순서를 반드시 유지하세요.",
  "answerUnits는 기계적으로 줄마다 쪼개지 말고, 같은 bullet/괄호/하위 줄이 하나의 개념을 설명하면 하나의 answerUnit으로 합치세요.",
  "단, 서로 다른 주제의 bullet이나 문장은 별도 answerUnit으로 분리하세요.",
  "짧은 제목 줄과 바로 다음 설명 줄이 같은 개념이면 합쳐서 자연스러운 문장으로 전사하세요.",
  "두 번째 이미지에서 answerUnits를 반드시 1개 이상 추출하세요.",
  "손글씨가 일부 읽기 어려워도 비우지 말고, 보이는 단어와 줄 배치를 근거로 가능한 만큼 전사하세요.",
  "answerUnits를 독립 채점 단위로 간주하지 말고, 이후 전체 답안 커버리지 판단에 쓸 원문 단위로만 추출하세요.",
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
    "아래 extract JSON만 근거로 sourceKeyPoints를 채점하세요.",
    "중요: answerUnits 각각을 독립적으로 채점하지 마세요.",
    "각 sourceKeyPoint가 전체 answerUnits 중 어디에서든 충분히 언급되었는지 전역적으로 판단하세요.",
    "사용자가 한 문장에 빠뜨린 내용을 다음 문장이나 다른 answerUnit에 썼다면 맞은 근거로 인정하세요.",
    "keyPoints는 sourceKeyPoints의 순서와 id를 그대로 유지하세요.",
    "answerUnits는 사용자가 쓴 문장/줄 단위의 순서와 id를 그대로 유지하세요.",
    "keyPoints[].matchedAnswerUnitIds에는 해당 핵심 개념을 뒷받침하는 모든 answerUnit id를 넣으세요.",
    "answerUnits[].coveredKeyPointIds에는 해당 답안 문장이 커버하는 sourceKeyPoint id를 모두 넣으세요.",
    "answerUnits[].unsupportedReason은 해당 답안 문장에 원문 근거가 없는 일반 지식이나 오답 주장이 있을 때만 1문장으로 쓰고, 없으면 null로 두세요.",
    "status는 correct, partial, incorrect, unsupported, unreadable 중 하나만 사용하세요.",
    "sourceKeyPoint가 전체 답안 어디에도 없으면 incorrect로 처리하세요.",
    "sourceKeyPoint가 일부만 있거나 중요한 조건이 빠졌으면 partial로 처리하세요.",
    "sourceKeyPoint가 답안에 있지만 원문에 없는 일반 지식으로 왜곡되었으면 unsupported로 처리하세요.",
    "읽기 어려워 의미를 확정할 수 없는 경우 unreadable로 처리하세요.",
    "correct는 reason을 짧게 쓰고 correction은 null로 두세요.",
    "partial, incorrect, unsupported, unreadable은 reason 1문장과 최소 수정 문장 correction을 제공하세요.",
    "missedKeyPoints에는 incorrect 또는 partial 중 보완이 필요한 sourceKeyPoint만 id, text, reason으로 넣으세요.",
    "score는 전체 답안 품질을 0~100 숫자로 산정하세요.",
    "출력 JSON 형식:",
    '{"score":80,"keyPoints":[{"id":"kp-1","status":"partial","matchedAnswerUnitIds":["au-1","au-2"],"reason":"이유","correction":"최소 수정 문장"}],"answerUnits":[{"id":"au-1","coveredKeyPointIds":["kp-1"],"unsupportedReason":null}],"missedKeyPoints":[{"id":"kp-1","text":"핵심 개념","reason":"보완 이유"}]}',
    "extract JSON:",
    JSON.stringify(extract),
  ].join("\n");
}
