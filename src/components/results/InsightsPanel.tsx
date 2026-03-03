'use client'

import { getBenchmark, getNextLevelThreshold } from '@/lib/scoring/benchmarks'
import type { AssessmentResult } from '@/lib/scoring/types'

const LEVEL_LABELS = ['Traditional', 'AI-Powered', 'AI-Enabled', 'AI-Native']
const PEER_PERCENTS = [0, 1, 2, 3].map(l => getBenchmark(l).peerPercent)

interface InsightsPanelProps {
  result: AssessmentResult
}

export function InsightsPanel({ result }: InsightsPanelProps) {
  const levelNum = result.level.level
  const benchmark = getBenchmark(levelNum)
  const nextThreshold = getNextLevelThreshold(levelNum)
  const gap = nextThreshold !== null ? Math.max(0, nextThreshold - result.thetaScore) : null

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-6">
      <p className="text-sm font-medium text-blue-600 uppercase tracking-wide mb-4">Benchmark Insights</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">ARR / Employee</p>
          <p className="text-lg font-semibold text-gray-900">{benchmark.arrPerEmployee}</p>
          <p className="text-xs text-gray-400">at your level</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Time to €100M ARR</p>
          <p className="text-lg font-semibold text-gray-900">{benchmark.monthsTo100M} months</p>
          <p className="text-xs text-gray-400">at your level</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Level mean θ</p>
          <p className="text-lg font-semibold text-gray-900">{benchmark.levelMeanTheta}</p>
          <p className="text-xs text-gray-400">you: {result.thetaScore.toFixed(1)}</p>
        </div>
      </div>

      {gap !== null && (
        <p className="text-sm text-blue-700 mb-5">
          <span className="font-medium">{gap.toFixed(1)} points</span> to {LEVEL_LABELS[levelNum + 1]} (Level {levelNum + 1})
        </p>
      )}

      <div>
        <p className="text-xs text-gray-500 mb-2">Peer distribution — n=62 companies (AMF v4.5.1)</p>
        <div className="flex flex-col gap-1">
          {LEVEL_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`text-xs w-24 ${i === levelNum ? 'font-semibold text-blue-700' : 'text-gray-500'}`}>
                L{i} {label}
              </span>
              <div className="flex-1 bg-gray-100 rounded h-2">
                <div
                  className={`h-2 rounded ${i === levelNum ? 'bg-blue-500' : 'bg-gray-300'}`}
                  style={{ width: `${PEER_PERCENTS[i]}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">{PEER_PERCENTS[i]}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
