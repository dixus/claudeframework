"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { HELP_TOOLTIPS } from "@/lib/help/tooltips";

interface HelpTermProps {
  term: string;
  children?: React.ReactNode;
}

export function HelpTerm({ term, children }: HelpTermProps) {
  const tooltip = HELP_TOOLTIPS[term];

  if (!tooltip) {
    return <>{children ?? null}</>;
  }

  const displayText = children ?? tooltip.term;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <span
          className="underline decoration-dotted decoration-gray-400 underline-offset-2 cursor-help"
          tabIndex={0}
        >
          {displayText}
          <span className="text-gray-400 text-xs ml-0.5">?</span>
        </span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="z-50 max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-lg"
          sideOffset={5}
        >
          <p className="font-medium text-gray-900 mb-1">{tooltip.term}</p>
          <p>{tooltip.definition}</p>
          {tooltip.source && (
            <p className="text-xs text-gray-400 mt-1">
              Source: {tooltip.source}
            </p>
          )}
          <TooltipPrimitive.Arrow className="fill-white" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
