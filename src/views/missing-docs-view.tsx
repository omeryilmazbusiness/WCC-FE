"use client";

import { Suspense } from "react";
import { MissingDocsBoard } from "@/widgets/missing-docs-board";

export function MissingDocsView() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">…</p>}>
      <MissingDocsBoard />
    </Suspense>
  );
}
