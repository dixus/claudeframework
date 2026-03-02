'use client'

import { useAssessmentStore } from '@/store/assessmentStore'

export function IntroStep() {
  const nextStep = useAssessmentStore(s => s.nextStep)

  return (
    <div className="space-y-6 text-center">
      <h1 className="text-3xl font-bold text-gray-900">AI Maturity Assessment</h1>
      <p className="text-gray-600 max-w-md mx-auto">
        Measure your organisation&apos;s AI maturity across six dimensions — Strategy, Architecture,
        Workflow, Data, Talent, and Adoption — and receive a personalised score with actionable
        recommendations.
      </p>
      <button
        onClick={nextStep}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        Start Assessment
      </button>
    </div>
  )
}
