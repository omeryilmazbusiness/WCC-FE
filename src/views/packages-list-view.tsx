"use client";

import { createTourPackageRepository } from "@/entities/tourpackage";
import { PackagesListBoard } from "@/widgets/packages-board";

const repo = createTourPackageRepository();

export function PackagesListView() {
  return <PackagesListBoard repository={repo} />;
}
