'use client'

import type { AssessmentResult } from '@/lib/scoring/types'

interface ScoreCardProps {
  result: AssessmentResult
}

export function ScoreCard({ result }: ScoreCardProps) {
  const { thetaScore, level, gated } = result

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">θ Score</p>
        <p className="text-5xl font-bold text-blue-600 mt-1">{thetaScore.toFixed(1)}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Maturity Level</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">{level.label}</p>
      </div>
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Months to $100M ARR</span>
          <span className="font-medium text-gray-900">{level.monthsTo100M}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">ARR per Employee</span>
          <span className="font-medium text-gray-900">{level.arrPerEmployee}</span>
        </div>
      </div>
      {gated && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Your θ score qualified for a higher level, but one or more gating conditions were not met.
        </div>
      )}
    </div>
  )
}
