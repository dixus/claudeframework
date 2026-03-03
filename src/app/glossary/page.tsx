import { GLOSSARY } from '@/lib/scoring/glossary'

export default function GlossaryPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-sm text-blue-600 hover:underline mb-6 block">← Back to Assessment</a>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Framework Glossary</h1>
        <p className="text-gray-500 mb-8">
          Key terms from the AI Maturity Framework (AMF v4.5.1). Source: Lason, Halili, Metzger (2025), n=62 companies.
        </p>

        <dl className="space-y-8">
          {GLOSSARY.map((entry) => {
            const anchor = entry.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            return (
              <div key={entry.term} id={anchor} className="bg-white rounded-xl border border-gray-200 p-6 scroll-mt-4">
                <dt className="text-lg font-semibold text-gray-900 mb-2">{entry.term}</dt>
                <dd className="text-gray-700 text-sm leading-relaxed">
                  {entry.definition}
                  {entry.example && (
                    <p className="mt-2 text-gray-500 italic">Example: {entry.example}</p>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </main>
  )
}
