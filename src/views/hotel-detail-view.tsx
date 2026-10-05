"use client";

import { createDocumentRepository } from "@/entities/document";
import { createHotelRepository } from "@/entities/hotel";
import { HotelWorkspace } from "@/widgets/hotel-workspace";

const repo = createHotelRepository();
const documents = createDocumentRepository();

type Props = { hotelId: string };

export function HotelDetailView({ hotelId }: Props) {
  return <HotelWorkspace hotelId={hotelId} repository={repo} documents={documents} />;
}
