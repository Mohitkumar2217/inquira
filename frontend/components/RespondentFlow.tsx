"use client";
import React, { useState, useEffect, useRef } from "react";
import { LINE, ERR } from "@/lib/styles";

export interface RespondentQuestion {
  id: number;
  title: string;
  question_type: string;
  is_required?: boolean;
  order?: number;
  choices?: string[];
  hint?: string;
}

export interface RespondentForm {
  id: number;
  title: string;
  is_published?: boolean;
}

interface RespondentFlowProps {
  form: RespondentForm;
  questions: RespondentQuestion[];
  onSubmit?: (answers: Record<number, string>) => Promise<void>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function RespondentFlow({ form, questions, onSubmit }: RespondentFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const currentQ = questions[currentIndex];

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const validate = (val: string, q: RespondentQuestion): string | null => {
    const trimmed = (val || "").trim();
    if (q.is_required && !trimmed) {
      return "This question is required";
    }
    if (trimmed && q.question_type === "email" && !EMAIL_REGEX.test(trimmed)) {
      return "That email address doesn't look right";
    }
    if (trimmed && q.question_type === "number" && !Number.isFinite(Number(trimmed))) {
      return "Please enter a valid number";
    }
    return null;
  };

  const handleNext = async () => {
    if (!currentQ || isSubmitting) return;

    const currentVal = answers[currentQ.id] || "";
    const err = validate(currentVal, currentQ);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsSubmitting(true);
      try {
        if (onSubmit) {
          await onSubmit(answers);
        } else {
          const apiBase = typeof window !== "undefined" && window.location.port === "3000"
            ? "http://localhost:8000"
            : "";
          const response = await fetch(`${apiBase}/forms/${form.id}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answers: Object.entries(answers).map(([qId, val]) => ({
                question_id: parseInt(qId, 10),
                value: val,
              })),
            }),
          });
          if (!response.ok) {
            throw new Error("Failed to submit response");
          }
        }
        setIsSubmitted(true);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setError(null);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const setAnswerValue = (val: string) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
    setError(null);
  };

  // Keyboard navigation: Enter to advance, Ctrl+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isTextArea = tag === "TEXTAREA";

      if (e.key === "Enter") {
        if (isTextArea && !(e.metaKey || e.ctrlKey)) return;
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowDown" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowUp" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (isSubmitted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white px-6 text-center dark:bg-[#202024]">
        <div className="from-above max-w-lg">
          <div className="text-cascade-1 mb-4 inline-flex size-14 items-center justify-center rounded-full bg-[#e8f7f0] text-2xl text-[#087663] dark:bg-[#1f372d] dark:text-[#52c499]">
            ✓
          </div>
          <h1 className="text-cascade-2 text-[clamp(26px,3.5vw,36px)] font-normal text-[#262627] dark:text-[#f2eff3]">
            Thanks for completing the form!
          </h1>
          <p className="text-cascade-3 mt-3 text-base text-[#737373] dark:text-[#a1a1aa]">
            Your responses have been recorded successfully.
          </p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white px-6 dark:bg-[#202024]">
        <p className="text-lg text-[#737373] dark:text-[#a1a1aa]">This form has no questions yet.</p>
      </div>
    );
  }

  const currentVal = currentQ ? (answers[currentQ.id] ?? "") : "";
  const progressPct = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="runner relative flex h-screen w-full flex-col overflow-hidden bg-white text-[#262627] dark:bg-[#202024] dark:text-[#f4f4f5]">
      {/* Top Progress Bar */}
      <div className="absolute inset-x-0 top-0 z-[10] h-1 bg-[#ebebeb] dark:bg-[#39393e]">
        <div
          className="h-full bg-[#262627] transition-all duration-300 ease-in-out dark:bg-[#8c8294]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Center Question Canvas */}
      <div className="stage flex flex-1 items-center justify-center px-6 py-10">
        <div key={currentQ.id} className="from-above w-full max-w-2xl">
          <h2 className="q text-cascade-1 m-0 mb-1 flex items-start gap-2.5 text-[clamp(22px,3.2vw,28px)] font-normal leading-[1.3] text-[#262627] dark:text-[#f2eff3]">
            <span className="tf-badge-num inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-[4px] bg-[#262627] px-1.5 text-[12px] font-bold leading-none text-white shadow-sm dark:bg-[#39343d] dark:text-[#f2eff3]">
              {currentIndex + 1}
            </span>
            <span className="flex-1">
              {currentQ.title || "Your question here..."}
              {currentQ.is_required && <span className="text-[#e04f4f]"> *</span>}
            </span>
          </h2>

          {currentQ.hint && (
            <p className="hint text-cascade-2 mb-4 mt-1 text-[15px] italic text-[#737373] dark:text-[#a1a1aa]">
              {currentQ.hint}
            </p>
          )}

          <div className="text-cascade-3 mt-4">
            {currentQ.question_type === "short_text" && (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                className={LINE}
                placeholder="Type your answer here…"
                value={currentVal}
                onChange={(e) => setAnswerValue(e.target.value)}
              />
            )}

            {currentQ.question_type === "email" && (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="email"
                className={LINE}
                placeholder="name@example.com"
                value={currentVal}
                onChange={(e) => setAnswerValue(e.target.value)}
              />
            )}

            {currentQ.question_type === "number" && (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="number"
                className={LINE}
                placeholder="0"
                value={currentVal}
                onChange={(e) => setAnswerValue(e.target.value)}
              />
            )}

            {currentQ.question_type === "long_text" && (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                rows={3}
                className={LINE}
                placeholder="Type your answer here…"
                value={currentVal}
                onChange={(e) => setAnswerValue(e.target.value)}
              />
            )}

            {(currentQ.question_type === "choice" || currentQ.question_type === "multiple_choice") && (
              <div className="mt-4 flex max-w-md flex-col gap-2">
                {(currentQ.choices || ["Option 1", "Option 2"]).map((choice, idx) => (
                  <button
                    key={choice}
                    type="button"
                    className={`flex items-center gap-2.5 rounded border border-[#262627] px-3.5 py-2.5 text-left text-base transition-colors hover:bg-black/5 dark:border-[#8c8294] dark:hover:bg-white/10 ${
                      currentVal === choice
                        ? "bg-[#262627] text-white dark:bg-[#39343d]"
                        : "bg-white text-[#262627] dark:bg-[#202024] dark:text-[#f2eff3]"
                    }`}
                    onClick={() => {
                      setAnswerValue(choice);
                      setTimeout(() => handleNext(), 280);
                    }}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded border border-current text-xs font-bold">
                      {LETTERS[idx] || idx + 1}
                    </span>
                    <span>{choice}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQ.question_type === "yes_no" && (
              <div className="mt-4 flex max-w-xs flex-col gap-2">
                {["yes", "no"].map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    className={`flex items-center gap-2.5 rounded border border-[#262627] px-3.5 py-2.5 text-left text-base capitalize transition-colors hover:bg-black/5 dark:border-[#8c8294] dark:hover:bg-white/10 ${
                      currentVal === opt
                        ? "bg-[#262627] text-white dark:bg-[#39343d]"
                        : "bg-white text-[#262627] dark:bg-[#202024] dark:text-[#f2eff3]"
                    }`}
                    onClick={() => {
                      setAnswerValue(opt);
                      setTimeout(() => handleNext(), 280);
                    }}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded border border-current text-xs font-bold">
                      {LETTERS[idx]}
                    </span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQ.question_type === "rating" && (
              <div className="mt-4 flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`text-[36px] transition-transform hover:scale-110 ${
                      Number(currentVal) >= score
                        ? "text-[#262627] dark:text-[#f2eff3]"
                        : "text-[#d4d4d8] dark:text-[#45454b]"
                    }`}
                    onClick={() => {
                      setAnswerValue(String(score));
                      setTimeout(() => handleNext(), 280);
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}

            {error && <div className={ERR}>⚠ {error}</div>}
          </div>

          <div className="actions text-cascade-4 mt-8 flex items-center gap-3.5">
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="rounded-md border-0 bg-[#262627] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#181819] active:scale-95 disabled:opacity-50 dark:bg-[#39343d] dark:hover:bg-[#48434f]"
            >
              {currentIndex === questions.length - 1 ? "Submit" : "OK ✓"}
            </button>
            <span className="tip text-xs text-[#767676] dark:text-[#a1a1aa]">
              {currentIndex === questions.length - 1 ? (
                <>press <b>Ctrl + Enter ↵</b></>
              ) : (
                <>press <b>Enter ↵</b></>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Right Controls (Navigation arrows + Powered by Typeform badge) */}
      <div className="nav absolute bottom-5 right-5 flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md shadow-sm">
          <button
            className="flex h-8 w-8 items-center justify-center border-0 bg-[#d4d4d8] text-sm text-[#444] transition-colors hover:bg-[#c4c4c8] disabled:opacity-40 dark:bg-[#38383e] dark:text-[#d5cfd8] dark:hover:bg-[#484852]"
            disabled={currentIndex === 0}
            onClick={handleBack}
            aria-label="Previous question"
          >
            ▲
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center border-0 border-l border-white/30 bg-[#d4d4d8] text-sm text-[#444] transition-colors hover:bg-[#c4c4c8] dark:bg-[#38383e] dark:text-[#d5cfd8] dark:hover:bg-[#484852]"
            onClick={handleNext}
            aria-label="Next question"
          >
            ▼
          </button>
        </div>
        <div className="flex h-8 items-center gap-1.5 rounded-md bg-[#262627] px-3 text-xs font-medium text-white shadow-sm dark:bg-[#302c34] dark:text-[#f2eff3]">
          <span className="font-semibold text-white/90">Powered by</span>
          <span className="font-bold tracking-tight">Inquira</span>
        </div>
      </div>
    </div>
  );
}
