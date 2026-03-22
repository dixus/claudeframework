// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaveResultsCard } from "./SaveResultsCard";
import type { AssessmentResult } from "@/lib/scoring/types";

const baseResult: AssessmentResult = {
  companyName: "Acme Corp",
  thetaScore: 67.4,
  rawLevel: 2,
  gated: false,
  gatingDetails: [],
  level: {
    level: 2,
    label: "AI-Enabled",
    monthsTo100M: 30,
    arrPerEmployee: "400K",
  },
  dimensions: [
    { key: "strategy", label: "Strategy", weight: 0.25, score: 3.5 },
    { key: "architecture", label: "Architecture", weight: 0.2, score: 4.0 },
    { key: "workflow", label: "Workflow", weight: 0.15, score: 3.0 },
    { key: "data", label: "Data", weight: 0.15, score: 2.5 },
    { key: "talent", label: "Talent", weight: 0.15, score: 4.5 },
    { key: "adoption", label: "Adoption", weight: 0.1, score: 3.0 },
  ],
  bottleneck: {
    dimension: "data",
    score: 2.5,
    gap: 1.5,
    actions: ["Improve data"],
  },
};

vi.mock("@/store/assessmentStore", () => ({
  useAssessmentStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      enablers: { fundingStage: "", teamSize: 0, annualRevenue: 0 },
      growthEngine: null,
    }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("SaveResultsCard", () => {
  it("renders default state with email, company inputs and save button", () => {
    render(<SaveResultsCard result={baseResult} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save & get link/i }),
    ).toBeInTheDocument();
  });

  it("saves without optional fields and shows success state", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hash: "abc123", url: "/results/abc123" }),
    });
    globalThis.fetch = mockFetch;

    render(<SaveResultsCard result={baseResult} />);
    await userEvent.click(
      screen.getByRole("button", { name: /save & get link/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/results saved/i)).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/assessments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("includes email and companyName in the payload when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hash: "abc123", url: "/results/abc123" }),
    });
    globalThis.fetch = mockFetch;

    render(<SaveResultsCard result={baseResult} />);

    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/company/i), "Test Corp");
    await userEvent.click(
      screen.getByRole("button", { name: /save & get link/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/results saved/i)).toBeInTheDocument();
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.email).toBe("test@example.com");
    expect(callBody.companyName).toBe("Test Corp");
  });

  it("displays shareable URL and copy link button on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hash: "abc123", url: "/results/abc123" }),
    });

    render(<SaveResultsCard result={baseResult} />);
    await userEvent.click(
      screen.getByRole("button", { name: /save & get link/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /copy link/i }),
      ).toBeInTheDocument();
    });

    const linkInput = screen.getByLabelText(
      /shareable results link/i,
    ) as HTMLInputElement;
    expect(linkInput.value).toContain("/results/abc123");
  });

  it("shows error message with retry on failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<SaveResultsCard result={baseResult} />);
    await userEvent.click(
      screen.getByRole("button", { name: /save & get link/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });

  it("copies URL to clipboard when copy link is clicked", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hash: "abc123", url: "/results/abc123" }),
    });

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<SaveResultsCard result={baseResult} />);
    await userEvent.click(
      screen.getByRole("button", { name: /save & get link/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /copy link/i }),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /copy link/i }));

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/results/abc123"),
    );
  });
});
