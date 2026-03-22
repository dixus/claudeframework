"use client";

import { AssessmentShell } from "@/components/assessment/AssessmentShell";
import { ResumeBanner } from "@/components/assessment/ResumeBanner";

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full flex flex-col items-center">
        <ResumeBanner />
        <AssessmentShell />
      </div>
    </main>
  );
}
