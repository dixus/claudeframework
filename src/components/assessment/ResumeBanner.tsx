"use client";

import { useState, useEffect } from "react";
import { useAssessmentStore } from "@/store/assessmentStore";

const STORAGE_KEY = "ai-maturity-assessment-progress";

export function ResumeBanner() {
  const [visible, setVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const step = useAssessmentStore((s) => s.step);
  const reset = useAssessmentStore((s) => s.reset);

  // Wait for Zustand persist to hydrate before checking step
  useEffect(() => {
    const unsub = useAssessmentStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (synchronous localStorage), mark immediately
    if (useAssessmentStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && step > 0) {
      setVisible(true);
    }
  }, [hydrated, step]);

  if (!visible) return null;

  function handleResume() {
    setVisible(false);
  }

  function handleStartFresh() {
    reset();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — ignore
    }
    setVisible(false);
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
