"use client";

import type { CapabilityResult } from "@/lib/scoring/types";
import { HelpSection } from "@/components/ui/help-section";
import { HelpTerm } from "@/components/ui/help-term";

interface CapabilityPanelProps {
  capabilities: CapabilityResult[];
  bottleneck: CapabilityResult;
}

const BAR_COLORS: Record<string, string> = {
  c1_strategy: "bg-blue-500",
  c2_setup: "bg-purple-500",
  c3_execution: "bg-green-500",
  c4_operationalization: "bg-orange-500",
};

export function CapabilityPanel({
  capabilities,
  bottleneck,
}: CapabilityPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-purple-200 p-6">
      <p className="text-sm font-medium text-purple-600 uppercase tracking-wide mb-4">
        Scaling Capabilities (SST)
      </p>
      <HelpSection panelId="capability-panel" />

      <div className="space-y-3 mb-4">
        {capabilities.map((c) => (
          <div key={c.key} className="flex items-center gap-3">
            <span
              className={`text-sm w-40 ${c.key === bottleneck.key ? "font-semibold text-purple-700" : "text-gray-600"}`}
            >
              {c.key === "c1_strategy" ? (
                <HelpTerm term="c1_strategy">{c.label}</HelpTerm>
              ) : (
                c.label
              )}
            </span>
            <div className="flex-1 bg-gray-100 rounded h-3">
              <div
                className={`h-3 rounded ${BAR_COLORS[c.key] ?? "bg-gray-400"}`}
                style={{ width: `${c.score}%` }}
              />
            </div>
            <span
              className={`text-sm w-12 text-right ${c.key === bottleneck.key ? "font-semibold text-purple-700" : "text-gray-500"}`}
            >
              {c.score.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-purple-50 rounded-lg p-3">
        <p className="text-xs font-medium text-purple-700 mb-1">
          Capability <HelpTerm term="bottleneck">Bottleneck</HelpTerm>
        </p>
        <p className="text-sm text-purple-800">
          <span className="font-semibold">{bottleneck.label}</span> (score:{" "}
          {bottleneck.score.toFixed(1)}) — this is the single biggest constraint
          on your scaling velocity.
          {bottleneck.key === "c2_setup" &&
            " Setup bottlenecks are the most common (36% of companies)."}
          {bottleneck.key === "c1_strategy" &&
            " Strategy bottlenecks dominate at early stages (Series A)."}
          {bottleneck.key === "c4_operationalization" &&
            " Operationalization gaps prevent scaling what already works."}
          {bottleneck.key === "c3_execution" &&
            " Execution bottlenecks limit how fast you can deliver on strategy."}
        </p>
      </div>
    </div>
  );
}
