"use client";

import { useState } from "react";
import type { AssessmentResult, DimensionKey } from "@/lib/scoring/types";
import { useAssessmentStore } from "@/store/assessmentStore";

type SaveStatus = "idle" | "saving" | "success" | "error";

interface SaveResultsCardProps {
  result: AssessmentResult;
}

export function SaveResultsCard({ result }: SaveResultsCardProps) {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const enablers = useAssessmentStore((s) => s.enablers);
  const growthEngine = useAssessmentStore((s) => s.growthEngine);

  async function handleSave() {
    setStatus("saving");
    setErrorMessage("");

    const dimensionScores: Record<string, number> = {};
    for (const dim of result.dimensions) {
      dimensionScores[dim.key] = dim.score;
    }

    const capabilityScores: Record<string, number> | undefined =
      result.capabilities
        ? Object.fromEntries(result.capabilities.map((c) => [c.key, c.score]))
        : undefined;

    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dimensionScores,
          capabilityScores,
          enablerScores: enablers?.fundingStage ? enablers : undefined,
          growthEngine: growthEngine ?? undefined,
          result,
          email: email || undefined,
          companyName: companyName || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save results");
      }

      const data = await res.json();
      setShareUrl(`${window.location.origin}${data.url}`);
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save results",
      );
      setStatus("error");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setErrorMessage("Failed to copy link. Please copy it manually.");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-green-600 text-lg">&#10003;</span>
          <h3 className="text-lg font-semibold text-gray-900">
            Results Saved!
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Share this link to revisit your results anytime:
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 truncate"
            aria-label="Shareable results link"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 whitespace-nowrap"
            aria-live="polite"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Save Your Results
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Get a shareable link to revisit your results anytime. No account needed.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="save-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email (optional)
          </label>
          <input
            id="save-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "saving"}
            placeholder="you@company.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor="save-company"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company (optional)
          </label>
          <input
            id="save-company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={status === "saving"}
            placeholder="Acme Corp"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          aria-busy={status === "saving"}
          aria-describedby={status === "error" ? "save-error" : undefined}
          className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {status === "saving" && (
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          )}
          {status === "saving" ? "Saving..." : "Save & Get Link"}
        </button>
        {status === "error" && (
          <p id="save-error" className="text-red-600 text-sm" role="alert">
            {errorMessage}{" "}
            <button
              onClick={handleSave}
              className="underline font-medium hover:text-red-700"
            >
              Try Again
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
