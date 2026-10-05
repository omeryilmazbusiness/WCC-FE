"use client";

import { createHotelRepository } from "@/entities/hotel";
import { HotelsListBoard } from "@/widgets/hotels-board";

const repo = createHotelRepository();

export function HotelsView() {
  return <HotelsListBoard repository={repo} />;
}
