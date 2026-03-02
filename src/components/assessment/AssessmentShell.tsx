'use client'

import { useAssessmentStore } from '@/store/assessmentStore'
import { IntroStep } from './IntroStep'
import { CompanyStep } from './CompanyStep'
import { DimensionStep } from './DimensionStep'
import { ReviewStep } from './ReviewStep'
import { ResultsPage } from '@/components/results/ResultsPage'

const stepComponents: Record<number, React.ReactNode> = {
  0: <IntroStep />,
  1: <CompanyStep />,
  2: <DimensionStep dimension="strategy" />,
  3: <DimensionStep dimension="architecture" />,
  4: <DimensionStep dimension="workflow" />,
  5: <DimensionStep dimension="data" />,
  6: <DimensionStep dimension="talent" />,
  7: <DimensionStep dimension="adoption" />,
  8: <ReviewStep />,
  9: <ResultsPage />,
}

export function AssessmentShell() {
  const step = useAssessmentStore(s => s.step)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-4xl p-8">
      {stepComponents[step]}
    </div>
  )
}
