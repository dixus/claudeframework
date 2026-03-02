'use client'

import type { BottleneckInfo } from '@/lib/scoring/types'

const DIMENSION_LABELS: Record<string, string> = {
  strategy: 'Strategy',
  architecture: 'Architecture',
  workflow: 'Workflow',
  data: 'Data',
  talent: 'Talent',
  adoption: 'Adoption',
}

interface BottleneckPanelProps {
  bottleneck: BottleneckInfo
}

export function BottleneckPanel({ bottleneck }: BottleneckPanelProps) {
  const { dimension, score, gap, actions } = bottleneck
  const label = DIMENSION_LABELS[dimension]

  return (
    <div className="bg-white rounded-xl border border-red-200 p-6">
      <p className="text-sm font-medium text-red-500 uppercase tracking-wide mb-3">Primary Bottleneck</p>
      <div className="flex items-baseline gap-4 mb-2">
        <span className="text-xl font-semibold text-gray-900">{label}</span>
        <span className="text-sm text-gray-500">Score: {score.toFixed(1)}</span>
      </div>
      {gap > 0 && (
        <p className="text-sm text-red-600 mb-4">{gap.toFixed(1)} points to the 70 target</p>
      )}
      <ol className="list-decimal list-inside space-y-2">
        {actions.slice(0, 3).map((action, i) => (
          <li key={i} className="text-sm text-gray-700">{action}</li>
        ))}
      </ol>
    </div>
  )
}
