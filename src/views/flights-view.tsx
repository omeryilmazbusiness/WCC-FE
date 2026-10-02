"use client";

import { Suspense } from "react";
import { LoadingState } from "@/shared/ui";
import { FlightsBoard } from "@/widgets/flights-board";

export function FlightsView() {
  return (
    <Suspense fallback={<LoadingState variant="list" withHeader />}>
      <FlightsBoard />
    </Suspense>
  );
}
