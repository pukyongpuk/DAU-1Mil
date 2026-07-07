const steps = [
  "학습 자료를 촬영합니다.",
  "백지 복습 답안을 촬영합니다.",
  "AI가 답안별로 피드백을 정리합니다.",
];

export default function Home() {
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
          {steps.map((step, index) => (
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
          <div className="rounded-lg border border-dashed border-outline bg-surface-container p-5">
            <p className="text-sm font-semibold text-on-surface">
              학습 자료 사진
            </p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              교재, 필기, 강의 자료처럼 기준이 되는 내용을 올리는 영역입니다.
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-outline bg-surface-container p-5">
            <p className="text-sm font-semibold text-on-surface">
              백지 답안 사진
            </p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              기억나는 대로 쓴 답안을 올리는 영역입니다.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <button
            className="h-12 w-full rounded-lg bg-primary px-5 text-base font-semibold text-on-primary disabled:bg-surface-container-highest disabled:text-outline sm:w-auto"
            disabled
            type="button"
          >
            사진 2장을 올리면 분석할 수 있어요
          </button>
        </div>
      </section>
    </main>
  );
}
