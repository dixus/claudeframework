"use client";

interface ProgressBarProps {
  progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div
      className="w-full bg-gray-200 rounded-full h-2"
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
  );
}
