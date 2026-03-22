"use client";

import * as React from "react";
import { useState, useEffect, useId } from "react";
import { PANEL_HELP } from "@/lib/help/panels";

interface HelpSectionProps {
  panelId: string;
}

function getStorageKey(panelId: string): string {
  return `help-section-${panelId}`;
}

export function HelpSection({ panelId }: HelpSectionProps) {
  const panel = PANEL_HELP[panelId];
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(getStorageKey(panelId));
      if (stored === "true") {
        setExpanded(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, [panelId]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(getStorageKey(panelId), String(next));
    } catch {
      // localStorage unavailable
    }
  };

  if (!panel) return null;

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span>{"\u2139"}</span>
        <span>Learn more</span>
        <span
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          {"\u25BE"}
        </span>
      </button>
      <div
        id={contentId}
        role="region"
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          {mounted && (
            <div className="pt-2 pb-1">
              <p className="text-sm font-medium text-gray-700 mb-1">
                {panel.title}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {panel.content}
              </p>
              {panel.bullets && panel.bullets.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {panel.bullets.map((bullet, i) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                      <span className="shrink-0">{"\u2022"}</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">
                Source: {panel.source}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
