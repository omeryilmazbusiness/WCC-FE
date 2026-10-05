"use client";

import { useTranslations } from "next-intl";
import type { Booking, BookingRepository, BookingWorkspaceRepository } from "@/entities/booking";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/shared/ui";
import { BookingWorkspace } from "./booking-workspace";

type Props = {
  bookingId: string | null;
  onOpenChange: (open: boolean) => void;
  repository?: BookingRepository;
  workspace?: BookingWorkspaceRepository;
  onChanged?: (booking: Booking | null) => void;
};

/** Wide side sheet hosting the booking workspace over the list. */
export function BookingWorkspaceDrawer({ bookingId, onOpenChange, repository, workspace, onChanged }: Props) {
  const t = useTranslations("bookingWorkspace");
  return (
    <Drawer open={bookingId !== null} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[min(100vw,980px)] overflow-y-auto bg-zinc-50/95 backdrop-blur" data-testid="booking-workspace-drawer">
        <DrawerTitle className="sr-only">{t("list.open")}</DrawerTitle>
        <DrawerDescription className="sr-only">{t("list.subtitle")}</DrawerDescription>
        <div className="pt-12">
          {bookingId ? (
            <BookingWorkspace key={bookingId} bookingId={bookingId} variant="drawer" repository={repository} workspace={workspace} onChanged={onChanged} />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
