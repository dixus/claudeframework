"use client";

import type { CoordinationModel } from "@/lib/scoring/coordination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface CoordinationPanelProps {
  curves: CoordinationModel[];
  insight: string;
  savings: number;
  teamSize: number;
}

export function CoordinationPanel({
  curves,
  insight,
  savings,
  teamSize,
}: CoordinationPanelProps) {
  const savingsPercent = Math.round(savings * 100);

  return (
    <Card className="border-orange-200">
      <CardContent>
        <p className="text-sm font-medium text-orange-600 uppercase tracking-wide mb-4">
          Coordination Cost Model
        </p>

        <div className="h-72 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={curves}
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="teamSize"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Team Size",
                  position: "insideBottom",
                  offset: -2,
                  style: { fontSize: 11 },
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{
                  value: "Relative Cost",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11 },
                }}
              />
              <Tooltip
                formatter={(value) => [
                  typeof value === "number" ? value.toFixed(1) : value,
                  "Cost",
                ]}
                labelFormatter={(label) => `Team size: ${label}`}
              />
              <Legend verticalAlign="top" height={36} />
              <ReferenceLine
                x={teamSize}
                stroke="#f97316"
                strokeDasharray="4 4"
                label={{
                  value: "You",
                  position: "top",
                  style: { fontSize: 11, fill: "#f97316", fontWeight: 600 },
                }}
              />
              <Line
                type="monotone"
                dataKey="traditionalCost"
                name="Traditional O(n²)"
                stroke="#9ca3af"
                strokeDasharray="6 3"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="aiEnabledCost"
                name="AI-Enabled O(n log n)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="aiNativeCost"
                name="AI-Native O(n)"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="companyCost"
                name="Your Company"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 4, fill: "#f97316" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-orange-100 text-orange-800">
              {savingsPercent}% savings
            </Badge>
          </div>
          <p className="text-sm text-orange-800">{insight}</p>
        </div>
      </CardContent>
    </Card>
  );
}
