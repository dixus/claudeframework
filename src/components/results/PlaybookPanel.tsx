'use client'

import { selectModel, PLAYBOOKS } from '@/lib/scoring/playbooks'
import type { AssessmentResult } from '@/lib/scoring/types'

interface PlaybookPanelProps {
  result: AssessmentResult
}

export function PlaybookPanel({ result }: PlaybookPanelProps) {
  const modelId = selectModel(result)
  const playbook = PLAYBOOKS[result.bottleneck.dimension][modelId]

  return (
    <div className="bg-white rounded-xl border border-green-200 p-6">
      <p className="text-sm font-medium text-green-600 uppercase tracking-wide mb-3">Recommended Next Step</p>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-xl font-semibold text-gray-900">{playbook.modelName}</span>
        <span className="text-sm text-gray-500">{playbook.timeline}</span>
      </div>
      <p className="text-sm text-gray-600 mb-4">{playbook.description}</p>

      <ol className="list-decimal list-inside space-y-2 mb-4">
        {playbook.steps.map((step, i) => (
          <li key={i} className="text-sm text-gray-700">{step}</li>
        ))}
      </ol>

      <div className="bg-green-50 rounded-lg p-3">
        <p className="text-xs font-medium text-green-700 mb-1">Expected outcome</p>
        <p className="text-sm text-green-800">{playbook.expectedOutcome}</p>
      </div>
    </div>
  )
}
