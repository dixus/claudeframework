// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { HelpTerm } from "./help-term";
import { HelpSection } from "./help-section";

function renderWithTooltip(ui: React.ReactElement) {
  return render(
    <TooltipPrimitive.Provider delayDuration={0}>
      {ui}
    </TooltipPrimitive.Provider>,
  );
}

describe("HelpTerm", () => {
  it("renders term text with dotted underline", () => {
    renderWithTooltip(<HelpTerm term="theta_index" />);
    const trigger = screen.getByText("\u03B8_index");
    expect(trigger.closest("span")).toHaveClass("decoration-dotted");
  });

  it("renders custom children text", () => {
    renderWithTooltip(<HelpTerm term="theta_index">custom text</HelpTerm>);
    expect(screen.getByText("custom text")).toBeInTheDocument();
  });

  it("renders nothing for unknown term without children", () => {
    const { container } = renderWithTooltip(<HelpTerm term="nonexistent" />);
    expect(container.textContent).toBe("");
  });

  it("renders children for unknown term", () => {
    renderWithTooltip(<HelpTerm term="nonexistent">fallback text</HelpTerm>);
    expect(screen.getByText("fallback text")).toBeInTheDocument();
  });

  it("shows tooltip content on hover", async () => {
    const user = userEvent.setup();
    renderWithTooltip(<HelpTerm term="theta_index" />);
    const trigger = screen.getByText("\u03B8_index");
    await user.hover(trigger);
    // Radix tooltip should show the definition
    const definitions = await screen.findAllByText(/weighted score from 0/);
    expect(definitions.length).toBeGreaterThan(0);
  });
});

describe("HelpSection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts collapsed", () => {
    render(<HelpSection panelId="score-card" />);
    const button = screen.getByRole("button", { name: /learn more/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("expands on click, showing title and content", async () => {
    render(<HelpSection panelId="score-card" />);
    const button = screen.getByRole("button", { name: /learn more/i });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText("Understanding Your AI Maturity Level"),
    ).toBeInTheDocument();
  });

  it("persists state to localStorage", () => {
    render(<HelpSection panelId="score-card" />);
    const button = screen.getByRole("button", { name: /learn more/i });
    fireEvent.click(button);
    expect(localStorage.getItem("help-section-score-card")).toBe("true");
  });

  it("reads persisted state on mount", () => {
    localStorage.setItem("help-section-score-card", "true");
    render(<HelpSection panelId="score-card" />);
    const button = screen.getByRole("button", { name: /learn more/i });
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("has aria-expanded attribute", () => {
    render(<HelpSection panelId="score-card" />);
    const button = screen.getByRole("button", { name: /learn more/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("returns null for unknown panelId", () => {
    const { container } = render(<HelpSection panelId="nonexistent" />);
    expect(container.innerHTML).toBe("");
  });
});
