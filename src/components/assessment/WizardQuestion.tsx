"use client";

import { useEffect, useRef, useCallback } from "react";
import { LIKERT_LABELS } from "@/lib/scoring/questions";

interface WizardQuestionProps {
  questionText: string;
  dimensionLabel: string;
  value: number | null;
  onAnswer: (value: number) => void;
  onBack: () => void;
  onForward?: () => void;
  showBack: boolean;
}

const AUTO_ADVANCE_DELAY = 400;

export function WizardQuestion({
  questionText,
  dimensionLabel,
  value,
  onAnswer,
  onBack,
  onForward,
  showBack,
}: WizardQuestionProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [questionText]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSelect = useCallback(
    (selected: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      onAnswer(selected);
      timerRef.current = setTimeout(() => {
        if (onForward) onForward();
      }, AUTO_ADVANCE_DELAY);
    },
    [onAnswer, onForward],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        handleSelect(parseInt(e.key, 10) - 1);
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        if (showBack) onBack();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (value !== null && onForward) onForward();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSelect, onBack, onForward, value, showBack]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
        {dimensionLabel}
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl md:text-3xl font-bold text-gray-900 text-center max-w-2xl outline-none"
        id="wizard-question-text"
      >
        {questionText}
      </h2>
      <div
        role="group"
        aria-labelledby="wizard-question-text"
        className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl"
      >
        {LIKERT_LABELS.map((label, index) => (
          <button
            key={index}
            aria-label={`${index} - ${label}`}
            onClick={() => handleSelect(index)}
            className={`w-full sm:w-auto flex-1 px-4 py-4 rounded-lg border-2 text-sm font-medium transition-colors duration-300 ${
              value === index
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
            }`}
          >
            <span className="block font-bold text-lg">{index}</span>
            <span className="block leading-tight">{label}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        {showBack && (
          <button
            onClick={onBack}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Back
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 sr-only">
        Press 1-5 to answer, arrow keys to navigate
      </p>
    </div>
  );
}
