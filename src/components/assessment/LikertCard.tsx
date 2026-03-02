'use client'

import { LIKERT_LABELS } from '@/lib/scoring/questions'

interface LikertCardProps {
  question: string
  value: number
  onChange: (value: number) => void
}

export function LikertCard({ question, value, onChange }: LikertCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-sm text-gray-800">{question}</p>
      <div className="flex gap-2 flex-wrap">
        {LIKERT_LABELS.map((label, index) => (
          <button
            key={index}
            aria-label={`${index} - ${label}`}
            onClick={() => onChange(index)}
            className={`flex flex-col items-center px-3 py-2 rounded border text-xs min-w-[4rem] ${
              value === index
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            <span className="font-semibold">{index}</span>
            <span className="leading-tight text-center">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
