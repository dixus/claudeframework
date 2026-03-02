'use client'

interface ProgressBarProps {
  currentStep: number
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="flex gap-1 w-full">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${currentStep >= i + 2 ? 'bg-blue-600' : 'bg-gray-200'}`}
        />
      ))}
    </div>
  )
}
