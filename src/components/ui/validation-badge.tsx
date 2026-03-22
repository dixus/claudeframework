"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { getValidationStat } from "@/lib/scoring/validation";

interface ValidationBadgeProps {
  formula: string;
}

function getBadgeText(
  formula: string,
  metric: string,
  value: string,
  sampleSize: number,
): string {
  switch (formula) {
    case "θ_index":
      return `✓ Validated: ${metric}=${value}, n=${sampleSize}`;
    case "META":
      return `✓ Validated: ${metric}=${value}, n=${sampleSize}`;
    case "ANST":
      return `✓ ${metric}=${value}, n=${sampleSize}`;
    case "Coordination Cost":
      return `✓ Empirical model, n=${sampleSize}`;
    default:
      return `✓ ${metric}=${value}, n=${sampleSize}`;
  }
}

export function ValidationBadge({ formula }: ValidationBadgeProps) {
  const stat = getValidationStat(formula);

  if (!stat) {
    return null;
  }

  const badgeText = getBadgeText(
    formula,
    stat.metric,
    stat.value,
    stat.sampleSize,
  );

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <span
          className="inline-block px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded-full cursor-help"
          tabIndex={0}
        >
          {badgeText}
        </span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="z-50 max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-lg"
          sideOffset={5}
        >
          {stat.sampleDetail && (
            <p className="mb-1">
              <span className="font-medium text-gray-900">Sample:</span>{" "}
              {stat.sampleDetail}
            </p>
          )}
          {stat.methodology && (
            <p className="mb-1">
              <span className="font-medium text-gray-900">Method:</span>{" "}
              {stat.methodology}
            </p>
          )}
          {stat.plainLanguage && (
            <p className="text-gray-600">{stat.plainLanguage}</p>
          )}
          <TooltipPrimitive.Arrow className="fill-white" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
