"use client";

import { createBusRepository } from "@/entities/bus";
import { BusesListBoard } from "@/widgets/buses-board";

const repo = createBusRepository();

export function BusesView() {
  return <BusesListBoard repository={repo} />;
}
