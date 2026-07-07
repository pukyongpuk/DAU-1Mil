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

type ViewState = "idle" | "loading" | "result" | "error";

const loadingStages = [
  "데이터를 처리하는 중...",
  "핵심 개념을 추출하는 중...",
  "답안 내용을 비교하는 중...",
  "피드백을 정리하는 중...",
];

const statusMeta: Record<
  Status,
  {
    label: string;
    icon: string;
    iconClassName: string;
    badgeClassName: string;
  }
> = {
  correct: {
    label: "맞음",
    icon: "✓",
    iconClassName: "bg-[#10B981] text-white",
    badgeClassName: "bg-[#D1FAE5] text-[#065F46]",
  },
  partial: {
    label: "일부 맞음",
    icon: "!",
    iconClassName: "bg-[#F59E0B] text-white",
    badgeClassName: "bg-[#FEF3C7] text-[#92400E]",
  },
  incorrect: {
    label: "틀림",
    icon: "×",
    iconClassName: "bg-error text-white",
    badgeClassName: "bg-error-container text-on-error-container",
  },
  unsupported: {
    label: "근거 없음",
    icon: "?",
    iconClassName: "bg-[#003D88] text-white",
    badgeClassName: "bg-[#D8E2FF] text-[#001A42]",
  },
  unreadable: {
    label: "읽기 어려움",
    icon: "…",
    iconClassName: "bg-outline text-white",
    badgeClassName: "bg-surface-container text-on-surface-variant",
  },
};

function AppMarkIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M8 1.5 14.5 8 8 14.5 1.5 8 8 1.5Z"
        fill="currentColor"
      />
      <path d="M8 4.8 11.2 8 8 11.2 4.8 8 8 4.8Z" fill="#FBF8FA" />
    </svg>
  );
}

function MoreIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M4.25 10a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0ZM8.5 10a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0ZM12.75 10a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StudyPageIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 24"
    >
      <path
        d="M3.25 1.5h9.2L17.25 6.3v16.2h-14V1.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12.25 1.75V6.5H17M6.25 11h8M6.25 15h8M6.25 19h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function RecallNoteIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4.25 3.5h9.5l5 5v12h-14.5v-17Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M13.5 3.75V8.8h5M8 16.75l1.1-3.6 6.25-6.25a1.8 1.8 0 0 1 2.55 2.55l-6.25 6.25-3.65 1.05Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m5 12.5 4.25 4.25L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function AnalyzeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 18 18"
    >
      <path
        d="M9 1.75v3.5M9 12.75v3.5M16.25 9h-3.5M5.25 9h-3.5M14.13 3.87l-2.47 2.47M6.34 11.66l-2.47 2.47M14.13 14.13l-2.47-2.47M6.34 6.34 3.87 3.87"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function UploadHeader() {
  return (
    <header className="absolute left-0 right-0 top-0 flex h-16 max-w-[1024px] items-center justify-between gap-[130.9px] border-b border-[#C5C6CC] bg-[#FBF8FA] px-6">
      <div className="flex h-8 w-[163.06px] items-center gap-2">
        <AppMarkIcon className="h-4 w-4 flex-none text-[#212B3A]" />
        <span className="h-8 w-[139.06px] truncate text-2xl font-bold leading-8 tracking-normal text-[#212B3A]">
          Blank Recall
        </span>
      </div>
      <button
        aria-label="메뉴"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full p-2 text-[#212B3A]"
        type="button"
      >
        <MoreIcon className="h-5 w-5" />
      </button>
    </header>
  );
}

function Header({
  showBack,
  onBack,
}: {
  showBack?: boolean;
  onBack?: () => void;
}) {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-outline-variant bg-background">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-4">
          {showBack ? (
            <button
              aria-label="뒤로"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-on-surface-variant"
              onClick={onBack}
              type="button"
            >
              ‹
            </button>
          ) : (
            <span className="h-4 w-4 rounded-sm bg-primary" />
          )}
          <span className="truncate text-2xl font-bold leading-8 tracking-normal text-primary">
            Blank Recall
          </span>
        </div>
        <button
          aria-label="메뉴"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-primary"
          type="button"
        >
          ⋯
        </button>
      </div>
    </header>
  );
}

function UploadCard({
  title,
  description,
  icon,
  file,
  inputRef,
  onChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File | null) => void;
}) {
  return (
    <label
      className={`relative flex h-[174px] min-h-40 w-[358px] cursor-pointer flex-col items-center justify-center rounded-lg border bg-white p-4 text-center transition-colors hover:bg-[#F7F8FA] ${
        file ? "border-[#3B82F6]" : "border-[#C5C6CC]"
      }`}
    >
      <input
        accept="image/*"
        capture="environment"
        className="absolute inset-px z-10 h-[calc(100%-2px)] w-[calc(100%-2px)] cursor-pointer opacity-0"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        ref={inputRef}
        type="file"
      />
      <div className="pointer-events-none z-0 flex h-[140px] w-[250px] flex-col items-center gap-2">
        <div className="flex h-14 w-12 flex-col items-start pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0EDEE] text-[#212B3A]">
            {file ? <CheckIcon className="h-6 w-6" /> : icon}
          </div>
        </div>
        <h3 className="flex h-7 items-center text-center text-xl font-semibold leading-7 text-[#1B1B1D]">
          {title}
        </h3>
        <p className="flex h-10 max-w-[250px] items-center text-center text-sm font-normal leading-5 text-[#44474C]">
          {description}
        </p>
      </div>
    </label>
  );
}

function LoadingScreen({ elapsedSeconds }: { elapsedSeconds: number }) {
  const stageIndex = Math.min(
    loadingStages.length - 1,
    Math.floor(elapsedSeconds / 7),
  );
  const progress = Math.min(94, 12 + elapsedSeconds * 2.4);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-[292px] text-on-surface">
      <section className="relative h-[300px] w-full max-w-96">
        <div className="absolute left-1/2 top-0 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border-4 border-surface-container-highest">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          <span className="text-2xl text-primary">◎</span>
        </div>

        <div className="absolute left-[7%] right-[7%] top-24 pt-10 text-center">
          <h1 className="text-xl font-semibold leading-7 text-on-surface">
            이미지를 비교 분석하고 있어요...
          </h1>
          <p className="mt-4 text-sm leading-5 text-on-surface-variant">
            잠시만 기다려주세요.
          </p>
        </div>

        <div className="absolute left-0 right-0 top-[200px] pt-10">
          <div className="h-1 overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="absolute left-0 right-0 top-[244px] pt-10 text-center">
          <p className="animate-pulse text-xs font-semibold leading-4 tracking-[0.05em] text-outline">
            {loadingStages[stageIndex]}
          </p>
          {elapsedSeconds >= 30 ? (
            <p className="mx-auto mt-4 max-w-[300px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm leading-5 text-on-surface-variant">
              사진 속 글자가 많으면 30초 이상 걸릴 수 있습니다.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function relatedKeyPoints(answerUnit: AnswerUnit, result: AnalysisResult) {
  const gradeAnswerUnit = result.grade.answerUnits.find(
    (unit) => unit.id === answerUnit.id,
  );
  const coveredIds = new Set(gradeAnswerUnit?.coveredKeyPointIds ?? []);

  return result.grade.keyPoints.filter((keyPoint) => coveredIds.has(keyPoint.id));
}

function answerUnitStatus(answerUnit: AnswerUnit, result: AnalysisResult): Status {
  const gradeAnswerUnit = result.grade.answerUnits.find(
    (unit) => unit.id === answerUnit.id,
  );

  if (gradeAnswerUnit?.unsupportedReason) {
    return "unsupported";
  }

  const keyPoints = relatedKeyPoints(answerUnit, result);

  if (keyPoints.length === 0) {
    return "incorrect";
  }

  if (keyPoints.some((keyPoint) => keyPoint.status === "unreadable")) {
    return "unreadable";
  }

  if (keyPoints.some((keyPoint) => keyPoint.status === "unsupported")) {
    return "unsupported";
  }

  if (
    keyPoints.some(
      (keyPoint) =>
        keyPoint.status === "partial" || keyPoint.status === "incorrect",
    )
  ) {
    return "partial";
  }

  return "correct";
}

function feedbackReason(answerUnit: AnswerUnit, result: AnalysisResult) {
  const gradeAnswerUnit = result.grade.answerUnits.find(
    (unit) => unit.id === answerUnit.id,
  );

  if (gradeAnswerUnit?.unsupportedReason) {
    return gradeAnswerUnit.unsupportedReason;
  }

  const keyPoints = relatedKeyPoints(answerUnit, result);
  return (
    keyPoints.find((keyPoint) => keyPoint.status !== "correct")?.reason ??
    keyPoints[0]?.reason ??
    "채점 근거가 부족합니다."
  );
}

function feedbackCorrection(answerUnit: AnswerUnit, result: AnalysisResult) {
  return (
    relatedKeyPoints(answerUnit, result).find((keyPoint) => keyPoint.correction)
      ?.correction ?? null
  );
}

function ScoreRing({ score }: { score: number }) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className="relative h-48 w-48">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#E4E2E3"
          strokeWidth="3.5"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#003D88"
          strokeDasharray={`${normalizedScore}, 100`}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-bold leading-[41px] text-primary">
          {normalizedScore}
        </span>
        <span className="text-[25px] leading-[31px] text-secondary">Points</span>
      </div>
    </div>
  );
}

function ResultScreen({
  result,
  onReset,
}: {
  result: AnalysisResult;
  onReset: () => void;
}) {
  return (
    <main className="min-h-screen bg-background pb-[166px] text-on-surface">
      <Header onBack={onReset} showBack />
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-16 pt-[89px]">
        <section className="relative flex min-h-[340px] flex-col items-center">
          <h2 className="pb-4 text-xl font-semibold leading-7 text-on-surface">
            Session Result
          </h2>
          <ScoreRing score={result.grade.score} />
          <p className="mt-4 max-w-[300px] text-center text-sm leading-5 text-on-surface-variant">
            핵심 개념 {result.grade.keyPoints.length}개를 기준으로 답안 전체를
            비교했습니다.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="border-b border-outline-variant pb-2 text-xl font-semibold leading-7 text-on-surface">
            Detailed Analysis
          </h3>
          <div className="flex flex-col gap-4">
            {result.extract.answerUnits.map((answerUnit) => {
              const status = answerUnitStatus(answerUnit, result);
              const meta = statusMeta[status];
              const correction = feedbackCorrection(answerUnit, result);
              const isCorrect = status === "correct";

              return (
                <article
                  className="flex items-start gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"
                  key={answerUnit.id}
                >
                  <div className="flex w-5 flex-shrink-0 pt-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${meta.iconClassName}`}
                    >
                      {meta.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-base leading-6 ${
                        isCorrect
                          ? "text-on-surface"
                          : "text-on-surface-variant line-through decoration-outline"
                      }`}
                    >
                      {answerUnit.text}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold leading-4 tracking-[0.05em] ${meta.badgeClassName}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs font-semibold leading-4 tracking-[0.05em] text-outline">
                        {answerUnit.id}
                      </span>
                    </div>
                    {!isCorrect ? (
                      <div className="mt-4 rounded-md border border-[#FFB4AB] bg-error-container p-2">
                        <p className="text-sm font-bold leading-5 text-on-error-container">
                          {correction ?? feedbackReason(answerUnit, result)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {result.grade.missedKeyPoints.length > 0 ? (
          <section className="rounded-lg border border-outline-variant bg-surface-container p-4">
            <h3 className="text-xl font-semibold leading-7 text-on-surface">
              놓친 내용
            </h3>
            <div className="mt-4 flex flex-col gap-3">
              {result.grade.missedKeyPoints.map((keyPoint) => (
                <div
                  className="rounded-lg bg-surface-container-lowest p-3"
                  key={keyPoint.id}
                >
                  <p className="text-sm font-bold leading-5 text-on-surface">
                    {keyPoint.text}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-on-surface-variant">
                    {keyPoint.reason}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-outline-variant bg-surface-container-lowest p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
          <button
            className="flex h-[53px] w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-4 text-xs font-semibold leading-4 tracking-[0.05em] text-white"
            type="button"
          >
            Save Report
          </button>
          <button
            className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border-2 border-primary-container px-4 text-xs font-semibold leading-4 tracking-[0.05em] text-primary-container"
            onClick={onReset}
            type="button"
          >
            New Session
          </button>
        </div>
      </div>
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
      return "Analyzing";
    }

    return "Compare and Analyze";
  }, [viewState]);

  async function analyze() {
    if (!sourceFile || !answerFile) {
      return;
    }

    const formData = new FormData();
    formData.append("sourceImage", sourceFile);
    formData.append("answerImage", answerFile);

    setElapsedSeconds(0);
    setErrorMessage(null);
    setViewState("loading");

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
    return <LoadingScreen elapsedSeconds={elapsedSeconds} />;
  }

  if (viewState === "result" && result) {
    return <ResultScreen onReset={resetAll} result={result} />;
  }

  return (
    <main className="min-h-screen bg-[#FBF8FA] text-[#1B1B1D]">
      <div className="relative mx-auto min-h-[884px] w-full max-w-[390px] overflow-hidden bg-[#FBF8FA]">
        <UploadHeader />

        <section className="absolute left-0 right-0 top-16 flex h-[731px] max-w-[1024px] flex-col items-start px-4 py-6">
          <div className="flex h-[132px] w-[358px] flex-col items-start pb-10">
            <div className="flex h-[92px] w-[358px] flex-col items-start gap-2">
              <h1 className="flex h-9 w-[358px] items-center text-[28px] font-bold leading-9 text-[#1B1B1D]">
                New Recall Session
              </h1>
              <p className="flex h-12 w-[358px] items-center text-base font-normal leading-6 text-[#44474C]">
                Upload your source material and your blank recall attempt for
                comparison.
              </p>
            </div>
          </div>

          <div className="flex h-[551px] w-[358px] flex-col items-start gap-6 pb-[179px]">
            <UploadCard
              description="Upload a photo of the text you studied."
              file={sourceFile}
              icon={<StudyPageIcon className="h-[23.33px] w-[18.67px]" />}
              inputRef={sourceInputRef}
              onChange={setSourceFile}
              title="Original Study Page"
            />
            <UploadCard
              description="Upload a photo of your handwritten or typed recall attempt."
              file={answerFile}
              icon={<RecallNoteIcon className="h-[23.33px] w-[22.17px]" />}
              inputRef={answerInputRef}
              onChange={setAnswerFile}
              title="My Blank Recall Note"
            />
          </div>

          {viewState === "error" ? (
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-[#FFB4AB] bg-[#FFEDEA] p-4 text-sm leading-5 text-[#410002]">
              <p className="font-bold">분석에 실패했습니다.</p>
              <p className="mt-1">{errorMessage}</p>
              <button
                className="mt-3 h-10 rounded-md bg-[#BA1A1A] px-4 text-xs font-semibold tracking-[0.05em] text-white"
                disabled={!sourceFile || !answerFile}
                onClick={analyze}
                type="button"
              >
                Retry Same Images
              </button>
            </div>
          ) : null}
        </section>

        <div className="absolute left-0 right-0 top-[795px] flex h-[83px] flex-col items-start border-t border-[#C5C6CC] bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button
            className="flex h-[50px] w-[358px] items-center justify-center gap-2 bg-[#3B82F6] px-6 py-4 text-center text-xs font-semibold leading-4 tracking-[0.05em] text-white transition active:scale-[0.98] disabled:bg-[#E4E2E3] disabled:text-[#75777D]"
            disabled={!canAnalyze}
            onClick={analyze}
            type="button"
          >
            <AnalyzeIcon className="h-[18px] w-[18px]" />
            <span>{buttonText}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
