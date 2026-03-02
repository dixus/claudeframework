'use client'

import { useAssessmentStore } from '@/store/assessmentStore'

export function CompanyStep() {
  const companyName = useAssessmentStore(s => s.companyName)
  const setCompanyName = useAssessmentStore(s => s.setCompanyName)
  const nextStep = useAssessmentStore(s => s.nextStep)
  const prevStep = useAssessmentStore(s => s.prevStep)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">What is your company name?</h2>
      <input
        type="text"
        value={companyName}
        onChange={e => setCompanyName(e.target.value.trim())}
        placeholder="Enter company name"
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-3">
        <button
          onClick={prevStep}
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={companyName.trim() === ''}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
