"use client";

import { createDocumentRepository } from "@/entities/document";
import { createSupplierRepository } from "@/entities/supplier";
import { SupplierWorkspace } from "@/widgets/supplier-workspace";

const repo = createSupplierRepository();
const documents = createDocumentRepository();

type Props = { supplierId: string };

export function SupplierDetailView({ supplierId }: Props) {
  return <SupplierWorkspace supplierId={supplierId} repository={repo} documents={documents} />;
}
