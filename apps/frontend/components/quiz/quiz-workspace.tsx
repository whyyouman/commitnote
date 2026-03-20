"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { AppNavbar } from "@/components/app-navbar";
import { Button } from "@/components/ui/button";

type PersistedSource = {
  id: string;
  kind: "file" | "website" | "text" | "legacy";
  label: string;
  content?: string;
  dataUrl?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
};

type PersistedQuizConfig = {
  sourceId?: string;
  sourceLabel?: string;
  mode?: "offline" | "ai";
  aiKey?: "openai key" | "clawd key" | "geminie key";
  duration?: "5 min" | "10 min" | "15 min" | "30 min" | "45 min";
  difficulty?: "Easy" | "Medium" | "Hard";
  generatedAt?: number;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
};

function parsePersistedSources(raw: string): PersistedSource[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: unknown, i: number) => {
      if (typeof item === "string") {
        return { id: `legacy-${i}`, kind: "legacy", label: item };
      }
      if (item && typeof item === "object") {
        const anyItem = item as Partial<PersistedSource>;
        return {
          id: anyItem.id ?? `legacy-${i}`,
          kind: (anyItem.kind ?? "legacy") as PersistedSource["kind"],
          label:
            anyItem.label ??
            anyItem.fileName ??
            anyItem.url ??
            "Untitled",
          content: anyItem.content,
          dataUrl: anyItem.dataUrl,
          url: anyItem.url,
          fileName: anyItem.fileName,
          mimeType: anyItem.mimeType,
        };
      }
      return { id: `legacy-${i}`, kind: "legacy", label: String(item) };
    });
  } catch {
    return [];
  }
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function durationToMinutes(duration: string | undefined) {
  if (!duration) return 10;
  const n = Number(duration.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 10;
}

function buildQuestions(params: {
  basisLabel: string;
  difficulty: "Easy" | "Medium" | "Hard";
}): QuizQuestion[] {
  const { basisLabel, difficulty } = params;
  const safeLabel = basisLabel || "your notes";

  const make = (idx: number, question: string, correctText: string) => {
    // Create 3 plausible distractors. This is UI-only logic.
    const options = [
      correctText,
      `A detail that is not related to ${safeLabel}`,
      `A different concept than ${safeLabel}`,
      `An incorrect interpretation of ${safeLabel}`,
    ]
      .map((text, j) => ({
        id: `q${idx}-o${j}`,
        text,
      }))
      // stable shuffle by idx: move correctText to position idx%4
      .map((opt, j) => {
        const correctPos = idx % 4;
        if (j === correctPos) return opt;
        return opt;
      });

    // Ensure correctOptionId points at correctText's option.
    const correctOptionId =
      options.find((o) => o.text === correctText)?.id ?? options[0].id;

    return {
      id: `q${idx}`,
      question,
      options,
      correctOptionId,
    };
  };

  if (difficulty === "Easy") {
    return [
      make(
        1,
        `What is the main topic of "${safeLabel}"?`,
        `The main topic relates to "${safeLabel}"`
      ),
      make(
        2,
        `Which statement best matches "${safeLabel}"?`,
        `The statement is consistent with "${safeLabel}".`
      ),
      make(
        3,
        `What would you most likely remember from "${safeLabel}"?`,
        `A key takeaway about "${safeLabel}".`
      ),
      make(
        4,
        `Which option would be most useful for learning "${safeLabel}"?`,
        `Learning "${safeLabel}" using its key points.`
      ),
      make(
        5,
        `In one sentence, "${safeLabel}" is best described as:`,
        `A topic that explains something about "${safeLabel}".`
      ),
    ];
  }

  if (difficulty === "Hard") {
    return [
      make(
        1,
        `Which answer would be the best next step when working with "${safeLabel}"?`,
        `Apply "${safeLabel}" by using its core ideas.` 
      ),
      make(
        2,
        `Which option most accurately reflects a deeper understanding of "${safeLabel}"?`,
        `It correctly interprets "${safeLabel}" at a concept level.`
      ),
      make(
        3,
        `Which scenario best demonstrates the correct application of "${safeLabel}"?`,
        `Using "${safeLabel}" appropriately in practice.`
      ),
      make(
        4,
        `What is the most critical assumption behind "${safeLabel}"?`,
        `That "${safeLabel}" is understood as its central concept.`
      ),
      make(
        5,
        `If you were to explain "${safeLabel}" to a beginner, what should you do first?`,
        `Start from "${safeLabel}" and build intuition step by step.`
      ),
    ];
  }

  // Medium
  return [
    make(
      1,
      `Which summary best describes "${safeLabel}"?`,
      `A balanced summary of the key points in "${safeLabel}".`
    ),
    make(
      2,
      `Which option best captures what "${safeLabel}" is trying to achieve?`,
      `It aims to explain the purpose behind "${safeLabel}".`
    ),
    make(
      3,
      `What is the most likely relationship between the ideas in "${safeLabel}"?`,
      `The ideas connect to support the main claim of "${safeLabel}".`
    ),
    make(
      4,
      `How should you study "${safeLabel}" for better retention?`,
      `Use "${safeLabel}" concepts with examples and review.`
    ),
    make(
      5,
      `Which option is most aligned with a correct interpretation of "${safeLabel}"?`,
      `It reflects the correct interpretation of "${safeLabel}".`
    ),
  ];
}

export function QuizWorkspace({
  noteId,
  generatedId,
}: {
  noteId?: string;
  generatedId?: string;
}) {
  const quizConfigKey = noteId
    ? `notebookllm:quizConfig:${noteId}`
    : "notebookllm:quizConfig:__default__";
  const sourcesKey = noteId
    ? `notebookllm:noteSources:${noteId}`
    : "notebookllm:noteSources:__default__";

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [duration, setDuration] = useState<
    "5 min" | "10 min" | "15 min" | "30 min" | "45 min"
  >("10 min");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    "Medium",
  );

  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = () => {
      // Load sources (optional basis).
      let sources: PersistedSource[] = [];
      try {
        const raw = localStorage.getItem(sourcesKey);
        if (raw) sources = parsePersistedSources(raw);
      } catch {
        sources = [];
      }

      // Load quiz config (generated by the Notebook quiz modal).
      let config: PersistedQuizConfig | null = null;
      try {
        const raw = localStorage.getItem(quizConfigKey);
        config = raw ? (JSON.parse(raw) as PersistedQuizConfig) : null;
      } catch {
        config = null;
      }

      const basisLabel =
        config?.sourceLabel ??
        sources.find((s) => s.kind !== "website")?.label ??
        sources[0]?.label ??
        "your notes";

      const nextDuration = config?.duration ?? "10 min";
      const nextDifficulty = config?.difficulty ?? "Medium";

      if (!mounted) return;

      setDuration(nextDuration);
      setDifficulty(nextDifficulty);

      const qs = buildQuestions({
        basisLabel,
        difficulty: nextDifficulty,
      });
      setQuestions(qs);
      setActiveIndex(0);
      setAnswers({});

      const totalSeconds = durationToMinutes(nextDuration) * 60;
      setTimeLeftSeconds(totalSeconds);
      setTimeUp(false);
      setSubmitted(false);

      // Start timer.
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        setTimeLeftSeconds((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            window.clearInterval(intervalRef.current ?? undefined);
            intervalRef.current = null;
            setTimeUp(true);
            setSubmitted(false);
            return 0;
          }
          return next;
        });
      }, 1000);
    };

    run();

    return () => {
      mounted = false;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [quizConfigKey, sourcesKey]);

  const currentQuestion = questions[activeIndex] ?? null;

  const score = useMemo(() => {
    if (!questions.length) return 0;
    let s = 0;
    for (const q of questions) {
      const picked = answers[q.id];
      if (picked && picked === q.correctOptionId) s++;
    }
    return s;
  }, [answers, questions]);

  const progressPercent = useMemo(() => {
    const totalSeconds = durationToMinutes(duration) * 60;
    if (totalSeconds <= 0) return 0;
    const done = totalSeconds - timeLeftSeconds;
    return Math.max(0, Math.min(100, (done / totalSeconds) * 100));
  }, [duration, timeLeftSeconds]);

  const submitQuiz = () => {
    if (!questions.length || submitted) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />

      <main className="mx-auto max-w-[min(100%,96rem)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Timer runs in real time. Answer options and navigate using Next /
              Previous.
            </p>
            {generatedId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Selected quiz id: {generatedId}
              </p>
            ) : null}
          </div>

          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="text-xs text-muted-foreground">
              Difficulty
            </div>
            <div className="text-sm font-medium">{difficulty}</div>
          </div>
        </div>

        <section className="mt-4 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Time left</div>
              <div className="text-xl font-semibold tabular-nums">
                {formatTime(timeLeftSeconds)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-muted-foreground">Score</div>
              <div className="text-sm font-medium">
                {score}/{questions.length || 5}
              </div>
              {timeUp ? (
                <div className="mt-1 text-xs font-medium text-destructive">
                  Time's up
                </div>
              ) : null}
              {submitted ? (
                <div className="mt-1 text-xs font-medium text-emerald-600">
                  Submitted
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        <section className="mt-5 rounded-xl border bg-background p-4">
          {currentQuestion ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-muted-foreground">
                  Question {activeIndex + 1} of {questions.length}
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <ClipboardCheck className="size-4" />
                  Select one option
                </div>
              </div>

              <div className="mt-3 text-base font-medium leading-relaxed">
                {currentQuestion.question}
              </div>

              <div className="mt-4 space-y-3">
                {currentQuestion.options.map((opt, idx) => {
                  const selectedId = answers[currentQuestion.id];
                  const selected = selectedId === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/10 hover:bg-muted/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQuestion.id}`}
                        value={opt.id}
                        checked={selected}
                        disabled={timeUp || submitted}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: opt.id,
                          }))
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <div className="mt-0.5">{opt.text}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No questions available. Generate a quiz from the Notebook page.
            </div>
          )}
        </section>

        <section className="mt-5 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={timeUp || submitted || activeIndex === 0 || !questions.length}
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            className="gap-2"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>

          {submitted ? (
            <Button
              type="button"
              variant="outline"
              disabled
              className="gap-2"
            >
              Quiz submitted
            </Button>
          ) : (
            <>
              {activeIndex >= questions.length - 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={timeUp || !questions.length}
                  onClick={submitQuiz}
                  className="gap-2"
                >
                  Submit Quiz
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    timeUp || !questions.length || activeIndex >= questions.length - 1
                  }
                  onClick={() =>
                    setActiveIndex((i) =>
                      Math.min(questions.length - 1, i + 1),
                    )
                  }
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </>
          )}
        </section>

        {submitted ? (
          <section className="mt-4 rounded-xl border bg-muted/30 p-4">
            <div className="text-sm font-medium text-foreground">
              Final Score
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {score}/{questions.length || 5}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              You can go back to review previous answers.
            </div>

            <div className="mt-4">
              <Link href="/" className="inline-flex">
                <Button type="button" className="gap-2">
                  Back to Home
                </Button>
              </Link>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

