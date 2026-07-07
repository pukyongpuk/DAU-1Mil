"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Status = "correct" | "partial" | "incorrect" | "unsupported" | "unreadable";

type SourceKeyPoint = {
  id: string;
  text: string;
};

type AnswerUnit = {
  id: string;
  text: string;
};

type GradeKeyPoint = {
  id: string;
  status: Status;
  matchedAnswerUnitIds: string[];
  reason: string;
  correction: string | null;
};

type GradeAnswerUnit = {
  id: string;
  coveredKeyPointIds: string[];
  unsupportedReason: string | null;
};

type MissedKeyPoint = {
  id: string;
  text: string;
  reason: string;
};

type AnalysisResult = {
  extract: {
    sourceKeyPoints: SourceKeyPoint[];
    answerUnits: AnswerUnit[];
  };
  grade: {
    score: number;
    keyPoints: GradeKeyPoint[];
    answerUnits: GradeAnswerUnit[];
    missedKeyPoints: MissedKeyPoint[];
  };
};

type UploadKind = "source" | "answer";

type ViewState = "idle" | "loading" | "result" | "error";

const onboardingSteps = [
  "학습 자료를 올립니다.",
  "백지 복습 답안을 올립니다.",
  "답안별 피드백을 확인합니다.",
];

const loadingStages = [
  "이미지를 읽는 중...",
  "핵심 개념을 추출하는 중...",
  "답안 내용을 비교하는 중...",
  "피드백을 정리하는 중...",
];

const statusMeta: Record<
  Status,
  { label: string; className: string; dotClassName: string }
> = {
  correct: {
    label: "맞음",
    className: "border-[#86efac] bg-[#ecfdf3] text-[#166534]",
    dotClassName: "bg-[#16a34a]",
  },
  partial: {
    label: "일부 맞음",
    className: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
    dotClassName: "bg-[#f59e0b]",
  },
  incorrect: {
    label: "틀림",
    className: "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]",
    dotClassName: "bg-[#dc2626]",
  },
  unsupported: {
    label: "근거 없음",
    className: "border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3]",
    dotClassName: "bg-[#4f46e5]",
  },
  unreadable: {
    label: "읽기 어려움",
    className: "border-outline-variant bg-surface-container text-on-surface-variant",
    dotClassName: "bg-outline",
  },
};

function getFileLabel(file: File | null) {
  if (!file) {
    return "아직 선택되지 않았습니다.";
  }

  const sizeMb = file.size / 1024 / 1024;
  return `${file.name} · ${sizeMb.toFixed(1)}MB`;
}

function getRelatedKeyPoints(
  answerUnit: AnswerUnit,
  result: AnalysisResult,
): GradeKeyPoint[] {
  const gradeAnswerUnit = result.grade.answerUnits.find(
    (unit) => unit.id === answerUnit.id,
  );
  const coveredIds = new Set(gradeAnswerUnit?.coveredKeyPointIds ?? []);

  return result.grade.keyPoints.filter((keyPoint) => coveredIds.has(keyPoint.id));
}

function getAnswerUnitStatus(answerUnit: AnswerUnit, result: AnalysisResult): Status {
  const gradeAnswerUnit = result.grade.answerUnits.find(
    (unit) => unit.id === answerUnit.id,
  );

  if (gradeAnswerUnit?.unsupportedReason) {
    return "unsupported";
  }

  const relatedKeyPoints = getRelatedKeyPoints(answerUnit, result);

  if (relatedKeyPoints.length === 0) {
    return "incorrect";
  }

  if (relatedKeyPoints.some((keyPoint) => keyPoint.status === "unreadable")) {
    return "unreadable";
  }

  if (relatedKeyPoints.some((keyPoint) => keyPoint.status === "unsupported")) {
    return "unsupported";
  }

  if (
    relatedKeyPoints.some(
      (keyPoint) =>
        keyPoint.status === "partial" || keyPoint.status === "incorrect",
    )
  ) {
    return "partial";
  }

  return "correct";
}

function getAnswerUnitReason(answerUnit: AnswerUnit, result: AnalysisResult) {
  const gradeAnswerUnit = result.grade.answerUnits.find(
    (unit) => unit.id === answerUnit.id,
  );

  if (gradeAnswerUnit?.unsupportedReason) {
    return gradeAnswerUnit.unsupportedReason;
  }

  const relatedKeyPoints = getRelatedKeyPoints(answerUnit, result);
  const nonCorrect = relatedKeyPoints.find(
    (keyPoint) => keyPoint.status !== "correct",
  );

  return nonCorrect?.reason ?? relatedKeyPoints[0]?.reason ?? "채점 근거가 부족합니다.";
}

function getAnswerUnitCorrection(answerUnit: AnswerUnit, result: AnalysisResult) {
  return (
    getRelatedKeyPoints(answerUnit, result).find(
      (keyPoint) => keyPoint.correction,
    )?.correction ?? null
  );
}

function UploadCard({
  title,
  description,
  file,
  inputRef,
  onChange,
}: {
  title: string;
  description: string;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest p-5 text-center transition-colors hover:bg-surface-container">
      <input
        accept="image/*"
        capture="environment"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        ref={inputRef}
        type="file"
      />
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-2xl text-primary">
        {file ? "✓" : "+"}
      </span>
      <span className="text-base font-bold text-on-surface">{title}</span>
      <span className="mt-2 max-w-64 text-sm leading-6 text-on-surface-variant">
        {description}
      </span>
      <span className="mt-4 max-w-full truncate text-sm font-semibold text-secondary">
        {getFileLabel(file)}
      </span>
    </label>
  );
}

function LoadingView({ elapsedSeconds }: { elapsedSeconds: number }) {
  const stageIndex = Math.min(
    loadingStages.length - 1,
    Math.floor(elapsedSeconds / 7),
  );
  const progress = Math.min(92, 18 + elapsedSeconds * 2.2);

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
      </div>
      <h1 className="text-2xl font-bold text-on-surface">
        이미지를 비교 분석하고 있어요
      </h1>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">
        손글씨와 학습 자료를 함께 읽는 중입니다.
      </p>
      <div className="mt-10 w-full rounded-full bg-surface-container-highest">
        <div
          className="h-1.5 rounded-full bg-primary transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-6 animate-pulse text-sm font-semibold text-outline">
        {loadingStages[stageIndex]}
      </p>
      {elapsedSeconds >= 30 ? (
        <p className="mt-4 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm leading-6 text-on-surface-variant">
          사진 속 글자가 많으면 30초 이상 걸릴 수 있습니다. 같은 화면에서 계속
          기다려 주세요.
        </p>
      ) : null}
    </section>
  );
}

function ResultView({
  result,
  onReset,
}: {
  result: AnalysisResult;
  onReset: () => void;
}) {
  const score = Math.round(result.grade.score);

  return (
    <main className="min-h-screen bg-background text-on-background">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-secondary">Blank Recall</p>
            <h1 className="mt-2 text-2xl font-bold text-on-surface">
              분석 결과
            </h1>
          </div>
          <button
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface"
            onClick={onReset}
            type="button"
          >
            새로 분석
          </button>
        </header>

        <section className="flex flex-col items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
          <div
            className="flex h-40 w-40 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${score * 3.6}deg, var(--surface-container-highest) 0deg)`,
            }}
          >
            <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-background">
              <span className="text-4xl font-bold text-on-surface">{score}</span>
              <span className="text-sm font-semibold text-secondary">점</span>
            </div>
          </div>
          <p className="mt-4 text-center text-sm leading-6 text-on-surface-variant">
            핵심 개념 {result.grade.keyPoints.length}개를 기준으로 답안 전체를
            비교했습니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-on-surface">답안별 피드백</h2>
          {result.extract.answerUnits.map((answerUnit) => {
            const status = getAnswerUnitStatus(answerUnit, result);
            const meta = statusMeta[status];
            const correction = getAnswerUnitCorrection(answerUnit, result);

            return (
              <article
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
                key={answerUnit.id}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${meta.dotClassName}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs font-semibold text-outline">
                        {answerUnit.id}
                      </span>
                    </div>
                    <p className="mt-3 text-base font-semibold leading-7 text-on-surface">
                      {answerUnit.text}
                    </p>
                    {status === "correct" ? (
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                        {getAnswerUnitReason(answerUnit, result)}
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2 text-sm leading-6">
                        <p className="text-on-surface-variant">
                          {getAnswerUnitReason(answerUnit, result)}
                        </p>
                        {correction ? (
                          <p className="rounded-lg border border-[#ffb4ab] bg-[#ffdad6] px-3 py-2 text-[#93000a]">
                            {correction}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {result.grade.missedKeyPoints.length > 0 ? (
          <section className="rounded-lg border border-outline-variant bg-surface-container p-4">
            <h2 className="text-lg font-bold text-on-surface">놓친 내용</h2>
            <div className="mt-3 space-y-3">
              {result.grade.missedKeyPoints.map((keyPoint) => (
                <div
                  className="rounded-lg bg-surface-container-lowest p-3"
                  key={keyPoint.id}
                >
                  <p className="text-sm font-bold text-on-surface">
                    {keyPoint.text}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    {keyPoint.reason}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

export default function Home() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const canAnalyze = Boolean(sourceFile && answerFile && viewState !== "loading");

  useEffect(() => {
    if (viewState !== "loading") {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [viewState]);

  const buttonText = useMemo(() => {
    if (viewState === "loading") {
      return "분석 중입니다";
    }

    if (!sourceFile || !answerFile) {
      return "사진 2장을 올리면 분석할 수 있어요";
    }

    return "비교 분석하기";
  }, [answerFile, sourceFile, viewState]);

  async function analyze() {
    if (!sourceFile || !answerFile) {
      return;
    }

    const formData = new FormData();
    formData.append("sourceImage", sourceFile);
    formData.append("answerImage", answerFile);

    setElapsedSeconds(0);
    setViewState("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as unknown;
      const errorPayload = payload as { error?: string };

      if (!response.ok || typeof errorPayload.error === "string") {
        throw new Error(
          errorPayload.error ? errorPayload.error : "분석에 실패했습니다.",
        );
      }

      setResult(payload as AnalysisResult);
      setViewState("result");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "분석에 실패했습니다.",
      );
      setViewState("error");
    }
  }

  function resetAll() {
    setSourceFile(null);
    setAnswerFile(null);
    setResult(null);
    setErrorMessage(null);
    setViewState("idle");

    if (sourceInputRef.current) {
      sourceInputRef.current.value = "";
    }

    if (answerInputRef.current) {
      answerInputRef.current.value = "";
    }
  }

  if (viewState === "loading") {
    return <LoadingView elapsedSeconds={elapsedSeconds} />;
  }

  if (viewState === "result" && result) {
    return <ResultView onReset={resetAll} result={result} />;
  }

  return (
    <main className="min-h-screen bg-background text-on-background">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8 sm:px-8">
        <header className="mb-8">
          <p className="text-sm font-semibold text-secondary">Blank Recall</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-on-background sm:text-4xl">
            사진 두 장으로 복습 답안을 점검하세요
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
            학습 자료와 백지 복습 답안을 올리면 핵심 개념 누락, 근거 없는 답변,
            최소 수정 문장을 한 번에 확인할 수 있습니다.
          </p>
        </header>

        <ol className="mb-8 grid gap-3 sm:grid-cols-3">
          {onboardingSteps.map((step, index) => (
            <li
              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
              key={step}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold leading-6 text-on-surface">
                {step}
              </p>
            </li>
          ))}
        </ol>

        <div className="grid gap-4 sm:grid-cols-2">
          <UploadCard
            description="교재, 필기, 강의 자료처럼 기준이 되는 내용을 촬영하거나 선택하세요."
            file={sourceFile}
            inputRef={sourceInputRef}
            onChange={setSourceFile}
            title="학습 자료 사진"
          />
          <UploadCard
            description="기억나는 대로 쓴 백지 복습 답안을 촬영하거나 선택하세요."
            file={answerFile}
            inputRef={answerInputRef}
            onChange={setAnswerFile}
            title="백지 답안 사진"
          />
        </div>

        {viewState === "error" ? (
          <div className="mt-5 rounded-lg border border-[#ffb4ab] bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">
            <p className="font-bold">분석에 실패했습니다.</p>
            <p className="mt-1">{errorMessage}</p>
            <button
              className="mt-3 rounded-lg bg-[#93000a] px-4 py-2 text-sm font-bold text-white"
              disabled={!sourceFile || !answerFile}
              onClick={analyze}
              type="button"
            >
              같은 사진으로 다시 시도
            </button>
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-5 mt-auto bg-surface-container-lowest px-5 py-4 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-8">
          <button
            className="h-12 w-full rounded-lg bg-primary px-5 text-base font-semibold text-on-primary transition active:scale-[0.99] disabled:bg-surface-container-highest disabled:text-outline sm:w-auto"
            disabled={!canAnalyze}
            onClick={analyze}
            type="button"
          >
            {buttonText}
          </button>
        </div>
      </section>
    </main>
  );
}
