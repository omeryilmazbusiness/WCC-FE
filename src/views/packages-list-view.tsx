"use client";

import { MemoryTourPackageRepository } from "@/entities/tourpackage";
import { PackagesListBoard } from "@/widgets/packages-board";

const repo = new MemoryTourPackageRepository();

export function PackagesListView() {
  return <PackagesListBoard repository={repo} />;
}
