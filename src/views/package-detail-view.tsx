"use client";

import { MemoryTourPackageRepository } from "@/entities/tourpackage";
import { PackageDetailBoard } from "@/widgets/packages-board";

const repo = new MemoryTourPackageRepository();

type Props = { packageId: string };

export function PackageDetailView({ packageId }: Props) {
  return <PackageDetailBoard packageId={packageId} repository={repo} />;
}
