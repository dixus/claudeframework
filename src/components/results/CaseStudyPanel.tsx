"use client";

import type { CaseStudy } from "@/lib/scoring/types";
import type { CapabilityResult } from "@/lib/scoring/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CaseStudyPanelProps {
  caseStudies: CaseStudy[];
  capabilityBottleneck?: CapabilityResult;
}

function getRelevanceReason(
  study: CaseStudy,
  capabilityBottleneck?: CapabilityResult,
): string {
  if (
    capabilityBottleneck &&
    study.relatedCapability === capabilityBottleneck.key
  ) {
    return `Your ${capabilityBottleneck.label} bottleneck matches this company's primary challenge.`;
  }
  if (study.relatedLevel !== undefined) {
    return `This company faced a similar level transition challenge.`;
  }
  if (study.interventionModel === "Stage Transition") {
    return `This company underwent a similar stage transition with comparable scaling challenges.`;
  }
  return `This is the most common intervention pattern, applicable to companies at various stages.`;
}

export function CaseStudyPanel({
  caseStudies,
  capabilityBottleneck,
}: CaseStudyPanelProps) {
  return (
    <Card className="border-teal-200">
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-teal-600 uppercase tracking-wide">
            Validated Case Studies
          </p>
          <Badge variant="default" className="bg-teal-100 text-teal-700">
            {caseStudies.length === 1
              ? "1 match"
              : `${caseStudies.length} matches`}
          </Badge>
        </div>

        <div className="space-y-6">
          {caseStudies.map((study) => (
            <div key={study.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {study.title}
                </h3>
                <div className="flex gap-2 shrink-0">
                  <Badge
                    variant="default"
                    className="bg-gray-100 text-gray-600"
                  >
                    {study.interventionModel}
                  </Badge>
                  <Badge
                    variant="default"
                    className="bg-gray-100 text-gray-600"
                  >
                    {study.duration}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                {study.context.stage} · {study.context.industry} ·{" "}
                {study.context.teamSize}
              </p>

              <p className="text-sm text-gray-600">{study.context.challenge}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
                    Before
                  </p>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">S-Score:</span>{" "}
                      {study.before.sScore}
                    </p>
                    <p>
                      <span className="font-medium">ARR/Employee:</span>{" "}
                      {study.before.arrPerEmployee}
                    </p>
                    <p>
                      <span className="font-medium">Bottleneck:</span>{" "}
                      {study.before.bottleneck}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-green-100 bg-green-50/50 p-3">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">
                    After
                  </p>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">S-Score:</span>{" "}
                      {study.after.sScore}
                    </p>
                    <p>
                      <span className="font-medium">ARR/Employee:</span>{" "}
                      {study.after.arrPerEmployee}
                    </p>
                    <p>
                      <span className="font-medium">Improvement:</span>{" "}
                      {study.after.improvement}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {study.roi}
                </span>
                <span className="text-sm text-green-600 font-medium">ROI</span>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Key Actions
                </p>
                <ul className="space-y-1">
                  {study.keyActions.map((action, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-teal-50 rounded-lg p-3">
                <p className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-1">
                  Why this is relevant
                </p>
                <p className="text-sm text-teal-800">
                  {getRelevanceReason(study, capabilityBottleneck)}
                </p>
              </div>

              {caseStudies.length > 1 &&
                study !== caseStudies[caseStudies.length - 1] && (
                  <hr className="border-gray-200" />
                )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
