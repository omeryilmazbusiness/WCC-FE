"use client";

import { createSupplierRepository } from "@/entities/supplier";
import { SuppliersBoard } from "@/widgets/suppliers-board";

const repo = createSupplierRepository();

export function SuppliersView() {
  return <SuppliersBoard repository={repo} />;
}
