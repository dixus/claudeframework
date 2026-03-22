// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "./LandingPage";
import { HeroSection } from "./HeroSection";
import { LevelsSection } from "./LevelsSection";
import { DimensionsSection } from "./DimensionsSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { WhatYouGetSection } from "./WhatYouGetSection";
import { ScienceSection } from "./ScienceSection";
import { FaqSection } from "./FaqSection";
import GlossaryPage from "@/app/glossary/page";

describe("LandingPage", () => {
  it("renders all sections", () => {
    render(<LandingPage />);
    expect(
      screen.getAllByText("AI Maturity Score").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("How It Works")).toBeDefined();
    expect(screen.getByText("What You'll Get")).toBeDefined();
    expect(screen.getByText("Maturity Levels")).toBeDefined();
    expect(screen.getByText("Assessment Dimensions")).toBeDefined();
    expect(
      screen.getByText("Built on Research, Validated with Data"),
    ).toBeDefined();
    expect(screen.getByText("Frequently Asked Questions")).toBeDefined();
    expect(screen.getByText("Why Take the Assessment")).toBeDefined();
  });

  it("has CTA link to /assessment", () => {
    render(<LandingPage />);
    const ctaLinks = screen.getAllByRole("link", {
      name: /start.*assessment/i,
    });
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    expect(ctaLinks[0].getAttribute("href")).toBe("/assessment");
  });

  it("has glossary link", () => {
    render(<LandingPage />);
    const glossaryLink = screen.getByRole("link", { name: /view glossary/i });
    expect(glossaryLink.getAttribute("href")).toBe("/glossary");
  });

  it("CTA shows trust line", () => {
    render(<LandingPage />);
    expect(screen.getByText(/Join 62\+ companies/)).toBeDefined();
  });
});

describe("HeroSection", () => {
  it("shows trust line", () => {
    render(<HeroSection />);
    expect(screen.getByText(/No login required/)).toBeDefined();
  });
});

describe("HowItWorksSection", () => {
  it("renders 3 steps", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("Answer Questions")).toBeDefined();
    expect(screen.getByText("Get Your Score")).toBeDefined();
    expect(screen.getByText("Act on Insights")).toBeDefined();
  });
});

describe("WhatYouGetSection", () => {
  it("renders 6 cards", () => {
    render(<WhatYouGetSection />);
    expect(screen.getByText("AI Maturity Score")).toBeDefined();
    expect(screen.getByText("META Prediction")).toBeDefined();
    expect(screen.getByText("Scaling Velocity")).toBeDefined();
    expect(screen.getByText("Capability Diagnosis")).toBeDefined();
    expect(screen.getByText("Intervention Playbook")).toBeDefined();
    expect(screen.getByText("Stage Roadmap")).toBeDefined();
  });
});

describe("LevelsSection", () => {
  it("renders all 4 maturity levels", () => {
    render(<LevelsSection />);
    expect(screen.getByText("Traditional")).toBeDefined();
    expect(screen.getByText("AI-Powered")).toBeDefined();
    expect(screen.getByText("AI-Enabled")).toBeDefined();
    expect(screen.getByText("AI-Native")).toBeDefined();
  });

  it("shows enhanced content", () => {
    render(<LevelsSection />);
    expect(
      screen.getByText(/Manual processes dominate operations/),
    ).toBeDefined();
    expect(screen.getByText(/Early-stage companies/)).toBeDefined();
  });
});

describe("DimensionsSection", () => {
  it("renders all 6 dimensions", () => {
    render(<DimensionsSection />);
    expect(screen.getByText("Strategy")).toBeDefined();
    expect(screen.getByText("Architecture")).toBeDefined();
    expect(screen.getByText("Workflow")).toBeDefined();
    expect(screen.getByText("Data")).toBeDefined();
    expect(screen.getByText("Talent")).toBeDefined();
    expect(screen.getByText("Adoption")).toBeDefined();
  });

  it("shows expanded descriptions", () => {
    render(<DimensionsSection />);
    expect(
      screen.getByText(/superlinear impact on scaling velocity/),
    ).toBeDefined();
  });
});

describe("ScienceSection", () => {
  it("renders formula cards", () => {
    render(<ScienceSection />);
    expect(screen.getByText(/R²=0.91/)).toBeDefined();
    expect(screen.getByText("Coordination Cost")).toBeDefined();
  });
});

describe("FaqSection", () => {
  it("renders all questions", () => {
    render(<FaqSection />);
    const details = document.querySelectorAll("details");
    expect(details.length).toBe(8);
    expect(
      screen.getByText("How long does the assessment take?"),
    ).toBeDefined();
  });

  it("expands on click", () => {
    render(<FaqSection />);
    const firstSummary = document.querySelector("summary")!;
    fireEvent.click(firstSummary);
    const firstDetails = document.querySelector("details")!;
    expect(firstDetails.hasAttribute("open")).toBe(true);
  });
});

describe("GlossaryPage", () => {
  it("back link has href='/'", () => {
    render(<GlossaryPage />);
    const backLink = screen.getByRole("link", { name: /← Back/i });
    expect(backLink.getAttribute("href")).toBe("/");
  });
});
