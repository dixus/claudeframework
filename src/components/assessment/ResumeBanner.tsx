"use client";

import { useState, useEffect, useRef } from "react";
import { useAssessmentStore } from "@/store/assessmentStore";

const STORAGE_KEY = "ai-maturity-assessment-progress";

export function ResumeBanner() {
  const [show, setShow] = useState(false);
  const dismissed = useRef(false);
  const reset = useAssessmentStore((s) => s.reset);

  useEffect(() => {
    // Only check once on mount — never re-show after dismissal
    if (dismissed.current) return;

    function check() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        // Only show if there's real progress (step > 0)
        if (parsed?.state?.step > 0) {
          setShow(true);
        }
      } catch {
        // localStorage unavailable or corrupt — ignore
      }
    }

    // Check after hydration
    if (useAssessmentStore.persist.hasHydrated()) {
      check();
    } else {
      useAssessmentStore.persist.onFinishHydration(check);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    dismissed.current = true;
    setShow(false);
  }

  function handleResume() {
    dismiss();
  }

  function handleStartFresh() {
    reset();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — ignore
    }
    dismiss();
  }

  return (
    <div
      role="alert"
      className="w-full max-w-2xl mx-auto mb-4 bg-white rounded-xl border border-blue-200 p-4 shadow-sm"
    >
      <p className="text-sm font-medium text-gray-900 mb-3">
        You have an assessment in progress. Resume where you left off?
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleResume}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          Resume
        </button>
        <button
          onClick={handleStartFresh}
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          Start Fresh
        </button>
      </div>
    </div>
  );
}
