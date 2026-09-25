"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BedDouble, Download } from "lucide-react";
import {
  createRoomingRepository,
  type GroupListRow,
  type RoomWithAssignments,
} from "@/entities/rooming";
import { createTourPackageRepository } from "@/entities/tourpackage";
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  Screen,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";

type DepartureOption = { id: string; label: string };

export function RoomingBoard() {
  const t = useTranslations("rooming");
  const { push } = useToast();
  const repo = useMemo(() => createRoomingRepository(), []);
  const pkgRepo = useMemo(() => createTourPackageRepository(), []);

  const [departures, setDepartures] = useState<DepartureOption[]>([]);
  const [departureId, setDepartureId] = useState("");
  const [rooms, setRooms] = useState<RoomWithAssignments[]>([]);
  const [group, setGroup] = useState<GroupListRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("2");

  useEffect(() => {
    void (async () => {
      try {
        const packages = await pkgRepo.listPackages();
        const opts: DepartureOption[] = [];
        for (const pkg of packages.slice(0, 8)) {
          const deps = await pkgRepo.listDepartures(pkg.id);
          for (const d of deps) {
            opts.push({
              id: d.id,
              label: `${pkg.code} · ${d.code} · ${d.departDate}`,
            });
          }
        }
        setDepartures(opts);
        if (opts[0] && !departureId) setDepartureId(opts[0].id);
      } catch {
        setDepartures([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, [pkgRepo]);

  const refresh = useCallback(async () => {
    if (!departureId) {
      setRooms([]);
      setGroup([]);
      return;
    }
    const [r, g] = await Promise.all([
      repo.listRooms(departureId),
      repo.groupList(departureId),
    ]);
    setRooms(r);
    setGroup(g);
  }, [repo, departureId]);

  useEffect(() => {
    void refresh().catch(() => push({ title: t("loadError"), tone: "error" }));
  }, [refresh, push, t]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      push({ title: t("saved"), tone: "success" });
    } catch (e) {
      push({
        title: t("actionError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
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
      push({ title: t("exported"), tone: "success" });
    } catch (e) {
      push({
        title: t("exportError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
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
      </div>

      {!departureId ? (
        <EmptyState title={t("pickDeparture")} icon={BedDouble} />
      ) : (
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
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
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
      )}
    </Screen>
  );
}
