// @vitest-environment jsdom
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAssessmentStore } from "@/store/assessmentStore";
import { QUESTIONS } from "@/lib/scoring/questions";
import { LikertCard } from "./LikertCard";
import { CompanyStep } from "./CompanyStep";
import { ReviewStep } from "./ReviewStep";
import { ProgressBar } from "./ProgressBar";
import { WizardQuestion } from "./WizardQuestion";

beforeEach(() => {
  useAssessmentStore.getState().reset();
});

// Test 1: LikertCard
describe("LikertCard", () => {
  it("renders question text", () => {
    render(
      <LikertCard
        question="Test question here"
        value={0}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Test question here")).toBeInTheDocument();
  });

  it("renders 5 buttons with correct aria-labels", () => {
    render(<LikertCard question="Q" value={0} onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: "0 - Not started" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "2 - Partially implemented" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "4 - Fully embedded" }),
    ).toBeInTheDocument();
  });

  it("calls onChange with the correct value when a button is clicked", async () => {
    const onChange = vi.fn();
    render(<LikertCard question="Q" value={0} onChange={onChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: "3 - Broadly implemented" }),
    );
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("highlights the selected button with blue background class", () => {
    render(<LikertCard question="Q" value={2} onChange={() => {}} />);
    const selected = screen.getByRole("button", {
      name: "2 - Partially implemented",
    });
    expect(selected.className).toContain("bg-blue-600");
  });
});

// Test 2: CompanyStep
describe("CompanyStep", () => {
  it("disables Next when companyName is empty", () => {
    render(<CompanyStep />);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("enables Next after typing a name", async () => {
    render(<CompanyStep />);
    await userEvent.type(screen.getByRole("textbox"), "Acme Corp");
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });
});

// Test 3: ProgressBar (continuous)
describe("ProgressBar", () => {
  it("renders with correct width at 50% progress", () => {
    const { container } = render(<ProgressBar progress={0.5} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toBeInTheDocument();
    expect(bar?.getAttribute("aria-valuenow")).toBe("50");
  });

  it("renders with correct width at 0% progress", () => {
    const { container } = render(<ProgressBar progress={0} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute("aria-valuenow")).toBe("0");
  });
});

// Test 4: ReviewStep - shows only answered questions
describe("ReviewStep", () => {
  it("renders all 6 dimension labels", () => {
    render(<ReviewStep />);
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("Workflow")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Talent")).toBeInTheDocument();
    expect(screen.getByText("Adoption")).toBeInTheDocument();
  });

  it('shows "No questions answered" when all responses are 0', () => {
    render(<ReviewStep />);
    const noAnswered = screen.getAllByText("No questions answered");
    expect(noAnswered).toHaveLength(6);
  });

  it("shows only answered questions with question text (test case 13)", () => {
    // strategy has [3, 2, 1, 0, 0, 0, 0, 0]
    const store = useAssessmentStore.getState();
    store.setAnswer("strategy", 0, 3);
    store.setAnswer("strategy", 1, 2);
    store.setAnswer("strategy", 2, 1);
    render(<ReviewStep />);
    // Should show 3 answered questions for strategy
    const strategyQuestions = QUESTIONS.strategy.slice(0, 3);
    for (const q of strategyQuestions) {
      expect(screen.getByText(q)).toBeInTheDocument();
    }
    // Index 3-7 questions should NOT be shown
    expect(screen.queryByText(QUESTIONS.strategy[3])).not.toBeInTheDocument();
  });
});

// Test 5: WizardQuestion auto-advance (test case 12)
describe("WizardQuestion", () => {
  it("calls onAnswer immediately and onForward after delay", async () => {
    vi.useFakeTimers();
    const onAnswer = vi.fn();
    const onForward = vi.fn();
    render(
      <WizardQuestion
        questionText="Test question"
        dimensionLabel="Strategy"
        value={null}
        onAnswer={onAnswer}
        onBack={() => {}}
        onForward={onForward}
        showBack={true}
      />,
    );
    await act(async () => {
      screen.getByRole("button", { name: "3 - Broadly implemented" }).click();
    });
    expect(onAnswer).toHaveBeenCalledWith(3);
    expect(onForward).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(onForward).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
