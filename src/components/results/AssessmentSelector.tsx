"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { TimestampedResult } from "@/lib/scoring/types";

interface AssessmentSelectorProps {
  email: string;
  currentHash: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AssessmentSelector({
  email,
  currentHash,
}: AssessmentSelectorProps) {
  const router = useRouter();
  const [history, setHistory] = useState<
    { hash: string; createdAt: string; theta: number }[] | null
  >(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assessments/history?email=${encodeURIComponent(email)}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((data: (TimestampedResult & { hash?: string })[]) => {
        if (cancelled) return;
        const items = data
          .filter((d) => d.hash && d.hash !== currentHash)
          .map((d) => ({
            hash: d.hash!,
            createdAt: d.createdAt,
            theta: Math.round(d.result.thetaScore),
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          );
        setHistory(items);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, [email, currentHash]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!history || history.length === 0) return null;

  return (
    <div ref={containerRef} className="relative" data-testid="assessment-selector">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
      >
        Compare with...
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto"
        >
          {history.map((item) => (
            <li
              key={item.hash}
              role="option"
              aria-selected={false}
              tabIndex={0}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer"
              onClick={() => {
                setOpen(false);
                router.push(
                  `/results/${currentHash}?compare=${item.hash}`,
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setOpen(false);
                  router.push(
                    `/results/${currentHash}?compare=${item.hash}`,
                  );
                }
              }}
            >
              {formatDate(item.createdAt)} — θ {item.theta}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
