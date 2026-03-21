"use client";

import type { CapabilityPlaybook } from "@/lib/scoring/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CapabilityPlaybookPanelProps {
  playbook: CapabilityPlaybook;
}

export function CapabilityPlaybookPanel({
  playbook,
}: CapabilityPlaybookPanelProps) {
  return (
    <Card className="border-amber-200">
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-amber-600 uppercase tracking-wide">
            Intervention Playbook
          </p>
          <Badge variant="amber">{playbook.duration}</Badge>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {playbook.label}
        </h3>

        <div className="mb-5">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
            Symptoms
          </p>
          <ul className="space-y-1">
            {playbook.symptoms.map((s, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Phase Timeline
          </p>
          <div className="space-y-4">
            {playbook.phases.map((phase, i) => (
              <div
                key={i}
                className="relative pl-6 border-l-2 border-amber-200"
              >
                <div className="absolute -left-[7px] top-0 h-3 w-3 rounded-full bg-amber-400" />
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {phase.name}
                  </span>
                  <Badge
                    variant="default"
                    className="text-gray-500 bg-gray-100"
                  >
                    {phase.weeks}
                  </Badge>
                </div>
                <ul className="space-y-1">
                  {phase.actions.map((action, j) => (
                    <li key={j} className="text-sm text-gray-600">
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
            Expected Impact
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-lg font-bold text-green-800">
                {playbook.expectedImpact.sImprovement}
              </p>
              <p className="text-xs text-green-600">S improvement</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">
                {playbook.expectedImpact.primaryMetric}
              </p>
              <p className="text-xs text-green-600">Primary</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">
                {playbook.expectedImpact.secondaryMetric}
              </p>
              <p className="text-xs text-green-600">Secondary</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
