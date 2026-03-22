"use client";

import type { ScalingVelocity, CapabilityKey } from "@/lib/scoring/types";
import { Card, CardContent } from "@/components/ui/card";
import { HelpSection } from "@/components/ui/help-section";
import { HelpTerm } from "@/components/ui/help-term";
import { ValidationBadge } from "@/components/ui/validation-badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  c1_strategy: "C\u2081 Strategy",
  c2_setup: "C\u2082 Setup",
  c3_execution: "C\u2083 Execution",
  c4_operationalization: "C\u2084 Operationalization",
};

const BAND_COLORS: Record<ScalingVelocity["band"], string> = {
  struggling: "#ef4444",
  linear: "#eab308",
  superlinear: "#3b82f6",
  exponential: "#22c55e",
};

const BAND_RANGES = [
  { band: "struggling" as const, label: "Struggling", from: 0, to: 0.05 },
  { band: "linear" as const, label: "Linear", from: 0.05, to: 0.2 },
  { band: "superlinear" as const, label: "Superlinear", from: 0.2, to: 0.5 },
  { band: "exponential" as const, label: "Exponential", from: 0.5, to: 1.0 },
];

interface VelocityPanelProps {
  velocity: ScalingVelocity;
}

export function VelocityPanel({ velocity }: VelocityPanelProps) {
  const { s, band, bandLabel, components, scenarios, bottleneckCapability } =
    velocity;
  const bottleneckLabel = CAPABILITY_LABELS[bottleneckCapability];

  const multiplier = (scenario: number): string => {
    if (scenarios.current === 0) return "-";
    return (scenario / scenarios.current).toFixed(1) + "x";
  };

  const chartData = [
    { name: "Current", value: scenarios.current, fill: "#6366f1" },
    {
      name: `Fix ${bottleneckLabel}`,
      value: scenarios.fixBottleneck,
      fill: "#8b5cf6",
    },
    { name: "Fix All Caps", value: scenarios.fixAll, fill: "#a78bfa" },
    { name: "Add AI", value: scenarios.addAI, fill: "#22c55e" },
  ];

  // Gauge position: map S (0-1) to degrees (0-180)
  const gaugeAngle = Math.min(180, Math.max(0, s * 180));

  return (
    <Card className="border-indigo-200">
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm font-medium text-indigo-600 uppercase tracking-wide">
            Scaling Velocity (ANST{" "}
            <HelpTerm term="s_formula">S-Formula</HelpTerm>)
          </p>
          <ValidationBadge formula="ANST" />
        </div>
        <HelpSection panelId="velocity-panel" />

        {/* Velocity gauge */}
        <div className="flex justify-center mb-6">
          <div className="relative w-64 h-32 overflow-hidden">
            <svg viewBox="0 0 200 110" className="w-full h-full">
              {/* Background arc segments */}
              <path
                d="M 10 100 A 90 90 0 0 1 55 19"
                fill="none"
                stroke="#ef4444"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M 55 19 A 90 90 0 0 1 100 10"
                fill="none"
                stroke="#eab308"
                strokeWidth="12"
              />
              <path
                d="M 100 10 A 90 90 0 0 1 145 19"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="12"
              />
              <path
                d="M 145 19 A 90 90 0 0 1 190 100"
                fill="none"
                stroke="#22c55e"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Needle */}
              <line
                x1="100"
                y1="100"
                x2={100 + 75 * Math.cos(((180 - gaugeAngle) * Math.PI) / 180)}
                y2={100 - 75 * Math.sin(((180 - gaugeAngle) * Math.PI) / 180)}
                stroke="#1e1b4b"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="4" fill="#1e1b4b" />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 text-center">
              <p
                className="text-2xl font-bold"
                style={{ color: BAND_COLORS[band] }}
              >
                {s.toFixed(4)}
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: BAND_COLORS[band] }}
              >
                {bandLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Band legend */}
        <div className="flex justify-center gap-3 mb-6 text-xs">
          {BAND_RANGES.map((b) => (
            <div key={b.band} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: BAND_COLORS[b.band] }}
              />
              <span className="text-gray-600">
                {b.band === "superlinear" ? (
                  <HelpTerm term="superlinear">{b.label}</HelpTerm>
                ) : (
                  b.label
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Component breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Enabler (E)</p>
            <p className="text-xl font-bold text-gray-900">
              {components.enabler.toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Capability Product</p>
            <p className="text-xl font-bold text-gray-900">
              {components.capabilityProduct.toFixed(4)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Theta (θ)</p>
            <p className="text-xl font-bold text-gray-900">
              {components.theta.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Formula display */}
        <div className="bg-indigo-50 rounded-lg p-3 mb-6">
          <p className="text-xs font-mono text-indigo-800">
            S = E ({components.enabler.toFixed(2)}) × (C₁<sup>1.5</sup> × C₂ ×
            C₃<sup>1.5</sup> × C₄) ({components.capabilityProduct.toFixed(4)}) ×
            θ ({components.theta.toFixed(2)}) = {s.toFixed(4)}
          </p>
        </div>

        {/* What-if scenarios bar chart */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            What-If Scenarios
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [
                    typeof value === "number" ? value.toFixed(4) : value,
                    "S",
                  ]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v) => {
                      const n =
                        typeof v === "string"
                          ? parseFloat(v)
                          : typeof v === "number"
                            ? v
                            : 0;
                      if (scenarios.current === 0 || isNaN(n)) return "";
                      return (n / scenarios.current).toFixed(1) + "x";
                    }}
                    style={{ fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insight text */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Fixing your <span className="font-semibold">{bottleneckLabel}</span>{" "}
            capability would improve scaling velocity by{" "}
            <span className="font-semibold">
              {multiplier(scenarios.fixBottleneck)}
            </span>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
