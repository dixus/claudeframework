'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'
import type { DimensionResult } from '@/lib/scoring/types'

interface RadarChartPanelProps {
  dimensions: DimensionResult[]
}

export function RadarChartPanel({ dimensions }: RadarChartPanelProps) {
  const data = dimensions.map(d => ({
    dimension: d.label,
    score: d.score,
    fullMark: 100,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Dimension Radar</p>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
          <Radar dataKey="score" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
