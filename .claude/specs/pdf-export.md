# Spec: PDF Report Export

## Goal

Add a "Download Report" button to the results page that generates a branded PDF containing all assessment results: θ score, maturity level, dimension breakdown, capability diagnosis, META prediction, scaling velocity, roadmap, and playbook. The PDF serves as a shareable executive summary for board meetings and internal alignment.

## Source Documents

- `03 SST_1_Playbook_2025-12-30.txt` — Part 7: Measurement & Tracking (report format)
- `00 θ_index v2.0 Scoring Template_2025-12-30.txt` — Template layout reference

## Requirements

### Technology choice

1. Use `@react-pdf/renderer` for client-side PDF generation (no server required)
2. Install: `npm install @react-pdf/renderer`
3. Alternative if bundle size is a concern: `jspdf` + `html2canvas` for simpler approach

### PDF Document (`src/components/results/PdfReport.tsx`) — NEW FILE

1. PDF layout (A4 portrait):

   **Page 1: Executive Summary**
   - Company name + assessment date
   - θ Score gauge (large, centered)
   - Maturity Level badge with label and description
   - META prediction: predicted months to €100M, scaling coefficient
   - Key insight: 2-3 sentence summary

   **Page 2: Dimension Analysis**
   - 6-dimension radar/bar chart (simplified for PDF)
   - Score table: dimension | weight | score | gap to next level
   - Bottleneck callout with top 3 actions

   **Page 3: Capability & Scaling** (only if Deep Dive completed)
   - C₁–C₄ scores with bar chart
   - Capability bottleneck identification
   - Scaling velocity (S) with band classification
   - What-if scenarios table

   **Page 4: Roadmap & Playbook** (only if enablers provided)
   - Stage-specific roadmap summary
   - Playbook for bottleneck capability: phases and timeline
   - Expected impact metrics

   **Footer** on all pages:
   - "AI Maturity Score — Powered by AI-Native Scaling Theory"
   - Page number
   - Date generated

2. Use consistent brand colors from the app's Tailwind theme

### Export button (`src/components/results/ResultsPage.tsx`)

1. Add "Download Report" button in the results page header
2. On click: render PdfReport component and trigger browser download
3. Filename: `{companyName}-ai-maturity-report-{date}.pdf`
4. Show loading spinner during PDF generation

### Tests

1. Unit test: PdfReport renders without errors given a complete AssessmentResult
2. Unit test: PdfReport renders without errors given a minimal AssessmentResult (no capabilities/enablers)
3. No visual regression tests needed (PDF rendering is too complex)

## Dependencies

- Should be shipped **last** — after all other results panels are implemented
- Uses data from all prior features (capabilities, playbooks, roadmaps, velocity)

## Out of scope

- Server-side PDF generation
- Email delivery of PDF
- Custom branding / white-label
- Multi-language support
- Interactive PDF (links, forms)

## Acceptance criteria

- [ ] PDF generates client-side without server dependency
- [ ] All 4 pages render with correct data
- [ ] Pages 3-4 conditionally included based on available data
- [ ] Download button visible on results page
- [ ] Generated PDF opens correctly in Chrome, Firefox, Safari
- [ ] File naming convention: `{company}-ai-maturity-report-{YYYY-MM-DD}.pdf`
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build (no SSR issues with PDF library)
