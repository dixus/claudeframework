// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "./LandingPage";
import { LevelsSection } from "./LevelsSection";
import { DimensionsSection } from "./DimensionsSection";
import GlossaryPage from "@/app/glossary/page";

describe("LandingPage", () => {
  it("renders all sections", () => {
    render(<LandingPage />);
    expect(screen.getByText("AI Maturity Framework")).toBeDefined();
    expect(screen.getByText("Maturity Levels")).toBeDefined();
    expect(screen.getByText("Assessment Dimensions")).toBeDefined();
    expect(screen.getByText("Why Take the Assessment")).toBeDefined();
  });

  it("has CTA link to /assessment", () => {
    render(<LandingPage />);
    const ctaLinks = screen.getAllByRole("link", { name: /start assessment/i });
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    expect(ctaLinks[0].getAttribute("href")).toBe("/assessment");
  });

  it("has glossary link", () => {
    render(<LandingPage />);
    const glossaryLink = screen.getByRole("link", { name: /view glossary/i });
    expect(glossaryLink.getAttribute("href")).toBe("/glossary");
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
});

describe("GlossaryPage", () => {
  it("back link has href='/'", () => {
    render(<GlossaryPage />);
    const backLink = screen.getByRole("link", { name: /← Back/i });
    expect(backLink.getAttribute("href")).toBe("/");
  });
});
