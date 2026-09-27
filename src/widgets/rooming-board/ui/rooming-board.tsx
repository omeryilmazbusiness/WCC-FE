"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BedDouble, Download } from "lucide-react";
import {
  createRoomingRepository,
  type GroupListRow,
  type RoomWithAssignments,
} from "@/entities/rooming";
import { createTourPackageRepository } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { useApiQuery } from "@/shared/lib/use-api-query";
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  QueryState,
  Screen,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMutationFeedback,
} from "@/shared/ui";

type DepartureOption = { id: string; label: string };

export function RoomingBoard() {
  const t = useTranslations("rooming");
  const feedback = useMutationFeedback();
  const canWrite = useCan("packages.write");
  const repo = useMemo(() => createRoomingRepository(), []);
  const pkgRepo = useMemo(() => createTourPackageRepository(), []);

  const [pickedDepartureId, setDepartureId] = useState("");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("2");

  const departuresQuery = useApiQuery(async () => {
    const packages = await pkgRepo.listPackages();
    const perPackage = await Promise.all(
      packages.slice(0, 8).map(async (pkg) =>
        (await pkgRepo.listDepartures(pkg.id)).map<DepartureOption>((d) => ({
          id: d.id,
          label: `${pkg.code} · ${d.code} · ${d.departDate}`,
        })),
      ),
    );
    return perPackage.flat();
  }, [pkgRepo]);
  const departures = departuresQuery.data ?? [];
  const departureId = pickedDepartureId || departures[0]?.id || "";

  const roomingQuery = useApiQuery(
    async () => {
      const [rooms, group] = await Promise.all([
        repo.listRooms(departureId),
        repo.groupList(departureId),
      ]);
      return { rooms, group };
    },
    [repo, departureId],
    { enabled: Boolean(departureId) },
  );
  const rooms: RoomWithAssignments[] = roomingQuery.data?.rooms ?? [];
  const group: GroupListRow[] = roomingQuery.data?.group ?? [];

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await roomingQuery.reload();
      feedback.success(t("saved"));
    } catch (err) {
      feedback.error(err, t("actionError"));
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    if (!departureId) return;
    try {
      const blob = await repo.exportGroupListCsv(departureId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `group-list-${departureId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      feedback.success(t("exported"));
    } catch (err) {
      feedback.error(err, t("exportError"));
    }
  }

  return (
    <Screen data-testid="rooming-board" className="!space-y-4">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button
            size="sm"
            variant="secondary"
            disabled={!departureId || busy}
            onClick={() => void exportCsv()}
          >
            <Download className="me-1.5 h-3.5 w-3.5" />
            {t("exportCsv")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4">
        <div className="min-w-[240px] flex-1">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {t("departure")}
          </p>
          {departures.length > 0 ? (
            <Select value={departureId} onValueChange={setDepartureId}>
              <SelectTrigger>
                <SelectValue placeholder={t("pickDeparture")} />
              </SelectTrigger>
              <SelectContent>
                {departures.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder={t("departureIdPh")}
              value={departureId}
              onChange={(e) => setDepartureId(e.target.value.trim())}
            />
          )}
        </div>
        {canWrite ? (
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-[140px]"
            placeholder={t("roomLabel")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Input
            className="w-[90px]"
            type="number"
            placeholder={t("capacity")}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy || !departureId || !label.trim()}
            onClick={() =>
              void run(async () => {
                await repo.createRoom(departureId, {
                  label: label.trim(),
                  capacity: Number(capacity) || 2,
                });
                setLabel("");
              })
            }
          >
            {t("addRoom")}
          </Button>
        </div>
        ) : null}
      </div>

      {departuresQuery.error ? (
        <QueryState
          error={departuresQuery.error}
          onRetry={() => void departuresQuery.reload()}
        >
          {null}
        </QueryState>
      ) : !departureId ? (
        <EmptyState title={t("pickDeparture")} icon={BedDouble} />
      ) : (
        <QueryState
          loading={roomingQuery.loading && !roomingQuery.data}
          error={roomingQuery.error}
          onRetry={() => void roomingQuery.reload()}
        >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {t("rooms")}
            </p>
            {rooms.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("roomsEmpty")}</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {rooms.map((room) => (
                  <li
                    key={room.id}
                    className="flex flex-wrap items-center gap-2 py-2.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900">{room.label}</p>
                      <p className="text-[11px] text-zinc-400">
                        {room.roomType} · {room.assignments.length}/
                        {room.capacity}
                      </p>
                      {room.assignments.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-500">
                          {room.assignments.map((a) => (
                            <li key={a.id} className="flex items-center gap-2">
                              <span>{a.participantName}</span>
                              {canWrite ? (
                              <button
                                type="button"
                                className="text-rose-600 hover:underline"
                                disabled={busy}
                                onClick={() =>
                                  void run(() =>
                                    repo.unassign(departureId, a.id),
                                  )
                                }
                              >
                                {t("unassign")}
                              </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    {canWrite ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(() => repo.deleteRoom(departureId, room.id))
                      }
                    >
                      {t("remove")}
                    </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {t("groupList")}
            </p>
            {group.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("groupEmpty")}</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {group.map((row) => (
                  <li
                    key={`${row.bookingId}-${row.participantId}`}
                    className="py-2.5 text-sm"
                  >
                    <p className="font-medium text-zinc-900">
                      {row.participantName}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {row.bookingRef} · {row.roomLabel || t("unassigned")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        </QueryState>
      )}
    </Screen>
  );
}
