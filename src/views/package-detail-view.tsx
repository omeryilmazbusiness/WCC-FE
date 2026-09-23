"use client";

import { createTourPackageRepository } from "@/entities/tourpackage";
import { PackageDetailBoard } from "@/widgets/packages-board";

const repo = createTourPackageRepository();

type Props = { packageId: string };

export function PackageDetailView({ packageId }: Props) {
  return <PackageDetailBoard packageId={packageId} repository={repo} />;
}
