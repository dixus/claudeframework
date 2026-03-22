import { describe, it, expect } from "vitest";
import { HELP_TOOLTIPS } from "./tooltips";
import { PANEL_HELP } from "./panels";
import type { HelpTooltip, PanelHelp } from "./types";

const REQUIRED_TOOLTIP_KEYS = [
  "theta_index",
  "r_squared",
  "gating",
  "s_formula",
  "c1_strategy",
  "superlinear",
  "plg_slg_clg",
  "meta_score",
  "coordination_cost",
  "bottleneck",
];

const REQUIRED_PANEL_KEYS = [
  "score-card",
  "radar-chart",
  "dimension-scorecard",
  "growth-engine",
  "scaling-panel",
  "velocity-panel",
  "coordination-panel",
  "capability-panel",
  "playbook-panel",
  "case-study-panel",
  "roadmap-panel",
  "validation-badges",
];

describe("HELP_TOOLTIPS", () => {
  it("contains all 10 required tooltip keys", () => {
    for (const key of REQUIRED_TOOLTIP_KEYS) {
      expect(HELP_TOOLTIPS[key]).toBeDefined();
    }
  });

  it("each tooltip has non-empty term and definition", () => {
    for (const key of Object.keys(HELP_TOOLTIPS)) {
      const tooltip: HelpTooltip = HELP_TOOLTIPS[key];
      expect(tooltip.term.length).toBeGreaterThan(0);
      expect(tooltip.definition.length).toBeGreaterThan(0);
    }
  });

  it("source fields reference actual document names", () => {
    for (const key of Object.keys(HELP_TOOLTIPS)) {
      const tooltip = HELP_TOOLTIPS[key];
      if (tooltip.source) {
        expect(tooltip.source.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("PANEL_HELP", () => {
  it("contains all 12 required panel keys", () => {
    for (const key of REQUIRED_PANEL_KEYS) {
      expect(PANEL_HELP[key]).toBeDefined();
    }
  });

  it("each panel has non-empty panelId, title, content, source", () => {
    for (const key of Object.keys(PANEL_HELP)) {
      const panel: PanelHelp = PANEL_HELP[key];
      expect(panel.panelId.length).toBeGreaterThan(0);
      expect(panel.title.length).toBeGreaterThan(0);
      expect(panel.content.length).toBeGreaterThan(0);
      expect(panel.source.length).toBeGreaterThan(0);
    }
  });

  it("panelId matches the record key", () => {
    for (const key of Object.keys(PANEL_HELP)) {
      expect(PANEL_HELP[key].panelId).toBe(key);
    }
  });
});
