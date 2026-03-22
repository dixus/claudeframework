import type { AssessmentResult } from "@/lib/scoring/types";

/** Replace Unicode characters unsupported by jsPDF's built-in Helvetica (WinAnsi). */
function sanitize(text: string): string {
  return text
    .replace(/θ/g, "theta")
    .replace(/₁/g, "1")
    .replace(/₂/g, "2")
    .replace(/₃/g, "3")
    .replace(/₄/g, "4")
    .replace(/€/g, "EUR ")
    .replace(/—/g, "--")
    .replace(/–/g, "-");
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const PAGE_W = 210;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 285;

/** Score threshold considered "on target" for the next maturity level (Level 3 boundary). */
const NEXT_LEVEL_TARGET = 70;

interface PdfDoc {
  setFontSize(size: number): void;
  setFont(name: string, style: string): void;
  setTextColor(...args: number[]): void;
  setDrawColor(...args: number[]): void;
  text(text: string | string[], x: number, y: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  splitTextToSize(text: string, maxWidth: number): string[];
  addPage(): void;
  addImage(
    data: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void;
  save(filename: string): void;
}

function addFooter(
  pdf: PdfDoc,
  pageNum: number,
  totalPages: number,
  date: string,
) {
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text(
    "AI Maturity Score — Powered by AI-Native Scaling Theory",
    MARGIN,
    FOOTER_Y,
  );
  pdf.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN - 25, FOOTER_Y);
  pdf.text(`Generated: ${date}`, MARGIN, FOOTER_Y + 4);
  pdf.setTextColor(0);
}

function renderPage1(pdf: PdfDoc, result: AssessmentResult, date: string) {
  let y = 20;

  // Company name + date
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(result.companyName, MARGIN, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Assessment Date: ${date}`, MARGIN, y);
  y += 10;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  // Theta score
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("AI Maturity Score (θ)", MARGIN, y);
  y += 10;

  pdf.setFontSize(36);
  pdf.setFont("helvetica", "bold");
  pdf.text(result.thetaScore.toFixed(1), PAGE_W / 2 - 15, y + 5);
  y += 18;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`out of 100`, PAGE_W / 2 - 8, y);
  y += 12;

  // Maturity level badge
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Level ${result.level.level}: ${result.level.label}`, MARGIN, y);
  y += 8;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Months to €100M ARR: ${result.level.monthsTo100M}`, MARGIN, y);
  y += 5;
  pdf.text(`ARR per Employee: ${result.level.arrPerEmployee}`, MARGIN, y);
  y += 10;

  // META prediction
  if (result.meta) {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("META Prediction", MARGIN, y);
    y += 7;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Predicted months to €100M: ${result.meta.predictedMonthsTo100M.toFixed(1)}`,
      MARGIN,
      y,
    );
    y += 5;
    pdf.text(
      `Scaling coefficient: ${result.meta.scalingCoefficient.toFixed(3)}`,
      MARGIN,
      y,
    );
    y += 10;
  }

  // Key insight
  pdf.setDrawColor(200, 200, 200);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Key Insight", MARGIN, y);
  y += 7;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const insight =
    `Your organization scores ${result.thetaScore.toFixed(1)} on the AI Maturity Index, placing you at Level ${result.level.level} (${result.level.label}). ` +
    `The primary bottleneck is ${result.bottleneck.dimension} with a gap of ${result.bottleneck.gap.toFixed(1)} points to target.`;
  const insightLines = pdf.splitTextToSize(insight, CONTENT_W);
  pdf.text(insightLines, MARGIN, y);
}

function renderPage2(pdf: PdfDoc, result: AssessmentResult) {
  let y = 20;

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Dimension Analysis", MARGIN, y);
  y += 12;

  // Score table header
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("Dimension", MARGIN, y);
  pdf.text("Weight", MARGIN + 50, y);
  pdf.text("Score", MARGIN + 80, y);
  pdf.text("Gap to Next Level", MARGIN + 110, y);
  y += 2;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;

  // Score table rows
  pdf.setFont("helvetica", "normal");
  for (const dim of result.dimensions) {
    const gap = Math.max(0, NEXT_LEVEL_TARGET - dim.score);
    const gapText = gap > 0 ? `${gap.toFixed(1)} pts` : "On target";
    pdf.text(dim.label, MARGIN, y);
    pdf.text(`${(dim.weight * 100).toFixed(0)}%`, MARGIN + 50, y);
    pdf.text(dim.score.toFixed(1), MARGIN + 80, y);
    pdf.text(gapText, MARGIN + 110, y);
    y += 6;
  }

  y += 8;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  // Bottleneck callout
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Primary Bottleneck", MARGIN, y);
  y += 7;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const dimLabel =
    result.bottleneck.dimension.charAt(0).toUpperCase() +
    result.bottleneck.dimension.slice(1);
  pdf.text(
    `${dimLabel} — Score: ${result.bottleneck.score.toFixed(1)} (Gap: ${result.bottleneck.gap.toFixed(1)})`,
    MARGIN,
    y,
  );
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Top 3 Actions:", MARGIN, y);
  y += 6;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  for (const action of result.bottleneck.actions.slice(0, 3)) {
    const lines = pdf.splitTextToSize(`• ${action}`, CONTENT_W);
    pdf.text(lines, MARGIN, y);
    y += lines.length * 4.5;
  }
}

function renderPage3(pdf: PdfDoc, result: AssessmentResult) {
  let y = 20;

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Capability & Scaling", MARGIN, y);
  y += 12;

  // C1-C4 scores
  if (result.capabilities) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Capability Scores", MARGIN, y);
    y += 8;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Capability", MARGIN, y);
    pdf.text("Score", MARGIN + 100, y);
    y += 2;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;

    pdf.setFont("helvetica", "normal");
    for (const cap of result.capabilities) {
      pdf.text(cap.label, MARGIN, y);
      pdf.text(cap.score.toFixed(1), MARGIN + 100, y);
      y += 6;
    }
    y += 4;
  }

  // Capability bottleneck
  if (result.capabilityBottleneck) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Capability Bottleneck", MARGIN, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `${result.capabilityBottleneck.label}: ${result.capabilityBottleneck.score.toFixed(1)}`,
      MARGIN,
      y,
    );
    y += 10;
  }

  // Scaling velocity
  if (result.scalingVelocity) {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Scaling Velocity", MARGIN, y);
    y += 7;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`S = ${result.scalingVelocity.s.toFixed(2)}`, MARGIN, y);
    y += 5;
    pdf.text(`Band: ${result.scalingVelocity.bandLabel}`, MARGIN, y);
    y += 8;

    // What-if scenarios
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("What-If Scenarios", MARGIN, y);
    y += 6;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Scenario", MARGIN, y);
    pdf.text("S Value", MARGIN + 100, y);
    y += 2;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;

    pdf.setFont("helvetica", "normal");
    const scenarios = [
      ["Current", result.scalingVelocity.scenarios.current],
      ["Fix Bottleneck", result.scalingVelocity.scenarios.fixBottleneck],
      ["Fix All", result.scalingVelocity.scenarios.fixAll],
      ["Add AI", result.scalingVelocity.scenarios.addAI],
    ] as const;

    for (const [label, value] of scenarios) {
      pdf.text(label, MARGIN, y);
      pdf.text(value.toFixed(2), MARGIN + 100, y);
      y += 5;
    }
  }
}

function renderPage4(pdf: PdfDoc, result: AssessmentResult) {
  let y = 20;

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Roadmap & Playbook", MARGIN, y);
  y += 12;

  // Roadmap summary
  if (result.roadmap) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Stage Roadmap: ${result.roadmap.stage}`, MARGIN, y);
    y += 7;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `${result.roadmap.tagline} — ${result.roadmap.arrRange}`,
      MARGIN,
      y,
    );
    y += 5;
    pdf.text(
      `Target θ: ${result.roadmap.aiMaturityTarget.thetaRange}`,
      MARGIN,
      y,
    );
    y += 5;
    pdf.text(
      `Level Target: ${result.roadmap.aiMaturityTarget.levelTarget}`,
      MARGIN,
      y,
    );
    y += 8;

    pdf.setFont("helvetica", "bold");
    pdf.text("Priority Dimensions:", MARGIN, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    for (const pd of result.roadmap.priorityDimensions) {
      pdf.text(`• ${pd.dimension} (${pd.priority})`, MARGIN, y);
      y += 5;
    }
    y += 3;

    pdf.setFont("helvetica", "bold");
    pdf.text("AI Maturity Actions:", MARGIN, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    for (const action of result.roadmap.aiMaturityTarget.actions) {
      const lines = pdf.splitTextToSize(`• ${action}`, CONTENT_W);
      pdf.text(lines, MARGIN, y);
      y += lines.length * 4.5;
    }
    y += 5;
  }

  // Playbook
  if (result.playbook) {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Playbook: ${result.playbook.label}`, MARGIN, y);
    y += 7;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Duration: ${result.playbook.duration}`, MARGIN, y);
    y += 8;

    for (const phase of result.playbook.phases) {
      pdf.setFont("helvetica", "bold");
      pdf.text(`${phase.name} (${phase.weeks})`, MARGIN, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      for (const action of phase.actions) {
        const lines = pdf.splitTextToSize(`• ${action}`, CONTENT_W);
        pdf.text(lines, MARGIN, y);
        y += lines.length * 4.5;
      }
      y += 3;
    }

    y += 5;
    pdf.setFont("helvetica", "bold");
    pdf.text("Expected Impact:", MARGIN, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `S Improvement: ${result.playbook.expectedImpact.sImprovement}`,
      MARGIN,
      y,
    );
    y += 5;
    pdf.text(
      `Primary Metric: ${result.playbook.expectedImpact.primaryMetric}`,
      MARGIN,
      y,
    );
    y += 5;
    pdf.text(
      `Secondary Metric: ${result.playbook.expectedImpact.secondaryMetric}`,
      MARGIN,
      y,
    );
  }
}

export function buildFilename(companyName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${slugify(companyName)}-ai-maturity-report-${date}.pdf`;
}

/** Wrap a PdfDoc so all text() and splitTextToSize() calls go through sanitize(). */
function withSanitizedText(pdf: PdfDoc): PdfDoc {
  return {
    ...pdf,
    text(text: string | string[], x: number, y: number) {
      const clean = Array.isArray(text) ? text.map(sanitize) : sanitize(text);
      pdf.text(clean, x, y);
    },
    splitTextToSize(text: string, maxWidth: number) {
      return pdf.splitTextToSize(sanitize(text), maxWidth);
    },
  };
}

export function generatePdfContent(raw: PdfDoc, result: AssessmentResult) {
  const pdf = withSanitizedText(raw);
  const hasPage3 = !!(result.capabilities || result.scalingVelocity);
  const hasPage4 = !!(result.roadmap || result.playbook);

  // Compute date once so all pages and footers share the same timestamp.
  const date = new Date().toLocaleDateString("en-GB");

  let totalPages = 2;
  if (hasPage3) totalPages++;
  if (hasPage4) totalPages++;

  // Page 1: Executive Summary
  renderPage1(pdf, result, date);
  addFooter(pdf, 1, totalPages, date);

  // Page 2: Dimension Analysis
  pdf.addPage();
  renderPage2(pdf, result);
  addFooter(pdf, 2, totalPages, date);

  let pageNum = 2;

  // Page 3: Capability & Scaling (conditional)
  if (hasPage3) {
    pdf.addPage();
    pageNum++;
    renderPage3(pdf, result);
    addFooter(pdf, pageNum, totalPages, date);
  }

  // Page 4: Roadmap & Playbook (conditional)
  if (hasPage4) {
    pdf.addPage();
    pageNum++;
    renderPage4(pdf, result);
    addFooter(pdf, pageNum, totalPages, date);
  }
}
