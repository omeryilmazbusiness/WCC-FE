"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { createBookingRepository, createBookingWorkspaceRepository } from "@/entities/booking";
import { BookingWorkspace } from "@/widgets/booking-workspace";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { Screen } from "@/shared/ui";

const repo = createBookingRepository();
const workspace = createBookingWorkspaceRepository();

type Props = { bookingId: string };

export function BookingDetailView({ bookingId }: Props) {
  const t = useTranslations("bookingWorkspace.header");
  return (
    <Screen>
      <Link
        href={routes.bookings}
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-zinc-500 transition hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        {t("back")}
      </Link>
      <BookingWorkspace bookingId={bookingId} variant="page" repository={repo} workspace={workspace} />
    </Screen>
  );
}
