"use client";

import type { DimensionKey } from "@/lib/scoring/types";

const DIMENSIONS: Array<{ key: DimensionKey; label: string }> = [
  { key: "strategy", label: "Strategy" },
  { key: "architecture", label: "Architecture" },
  { key: "workflow", label: "Workflow" },
  { key: "data", label: "Data" },
  { key: "talent", label: "Talent" },
  { key: "adoption", label: "Adoption" },
];

interface ProgressBarProps {
  /** Currently active dimension (highlighted) */
  activeDimension?: DimensionKey;
  /** Dimensions that have been fully completed */
  completedDimensions?: Set<DimensionKey>;
  /** Overall progress 0-1 across all questions */
  progress: number;
}

export function ProgressBar({
  activeDimension,
  completedDimensions,
  progress,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="space-y-3">
      {/* Dimension pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {DIMENSIONS.map(({ key, label }) => {
          const isActive = key === activeDimension;
          const isCompleted = completedDimensions?.has(key);

          let className =
            "px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ";
          if (isActive) {
            className += "bg-blue-600 text-white";
          } else if (isCompleted) {
            className += "bg-green-100 text-green-700";
          } else {
            className += "bg-gray-100 text-gray-400";
          }

          return (
            <span key={key} className={className}>
              {isCompleted && "✓ "}
              {label}
            </span>
          );
        })}
      </div>

      {/* Progress bar + percentage */}
      <div className="flex items-center gap-3">
        <div
          className="flex-1 bg-gray-200 rounded-full h-2"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-blue-600 h-2 rounded-full transition-[width] duration-300 ease-in-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500 w-8 text-right">
          {percent}%
        </span>
      </div>
    </div>
  );
}
