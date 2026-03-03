'use client'

import { useState } from 'react'
import type { AssessmentResult } from '@/lib/scoring/types'

interface PdfExportButtonProps {
  result: AssessmentResult
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function PdfExportButton({ result }: PdfExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = 210
      const margin = 15
      const contentW = pageW - margin * 2

      // Header
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text(result.companyName, margin, 20)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`AI Maturity Score: ${result.thetaScore.toFixed(1)} — ${result.level.label} (Level ${result.level.level})`, margin, 28)
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, margin, 34)
      pdf.setDrawColor(200, 200, 200)
      pdf.line(margin, 38, pageW - margin, 38)

      let y = 44

      // Radar chart capture — serialize SVG directly to avoid oklch CSS parsing issues
      const chartEl = document.getElementById('radar-chart')
      const svgEl = chartEl?.querySelector('svg')
      if (svgEl) {
        const svgClone = svgEl.cloneNode(true) as SVGElement
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        const svgString = new XMLSerializer().serializeToString(svgClone)
        const img = new Image()
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)
        await new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve() })
        const scale = 2
        const canvas = document.createElement('canvas')
        canvas.width = (svgEl.clientWidth || 400) * scale
        canvas.height = (svgEl.clientHeight || 300) * scale
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const imgData = canvas.toDataURL('image/png')
        const imgH = (canvas.height / canvas.width) * contentW
        pdf.addImage(imgData, 'PNG', margin, y, contentW, imgH)
        y += imgH + 6
      }

      // Dimension scores table
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Dimension Scores', margin, y)
      y += 5
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      for (const dim of result.dimensions) {
        const gap = Math.max(0, 70 - dim.score)
        const gapText = gap > 0 ? `${gap.toFixed(1)} to target` : 'On target'
        pdf.text(`${dim.label}: ${dim.score.toFixed(1)}   ${gapText}`, margin, y)
        y += 5
      }

      y += 3
      pdf.line(margin, y, pageW - margin, y)
      y += 5

      // Bottleneck section
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Primary Bottleneck', margin, y)
      y += 5
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${result.bottleneck.dimension.charAt(0).toUpperCase() + result.bottleneck.dimension.slice(1)} — Score: ${result.bottleneck.score.toFixed(1)}`, margin, y)
      y += 5
      for (const action of result.bottleneck.actions.slice(0, 3)) {
        const lines = pdf.splitTextToSize(`• ${action}`, contentW)
        pdf.text(lines, margin, y)
        y += lines.length * 4.5
      }

      // Footer
      pdf.setFontSize(8)
      pdf.setTextColor(150)
      pdf.text('AI Maturity Platform — ai-maturity.app', margin, 285)
      pdf.setTextColor(0)

      pdf.save(`ai-maturity-${slugify(result.companyName)}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {loading ? 'Generating…' : 'Download Report'}
    </button>
  )
}
