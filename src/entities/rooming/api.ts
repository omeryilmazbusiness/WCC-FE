import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  AssignRoomInput,
  CreateRoomInput,
  GroupListRow,
  Room,
  RoomAssignment,
  RoomWithAssignments,
  UpdateRoomInput,
} from "./model";

function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseSession(raw ? decodeURIComponent(raw) : null);
  return session?.accessToken ?? null;
}

type Raw = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function mapAssignment(raw: Raw): RoomAssignment {
  return {
    id: str(raw.id),
    roomId: str(raw.room_id ?? raw.roomId),
    bookingId: str(raw.booking_id ?? raw.bookingId),
    participantId: str(raw.participant_id ?? raw.participantId),
    participantName: str(raw.participant_name ?? raw.participantName),
    createdAt: str(raw.created_at ?? raw.createdAt),
  };
}

function mapRoom(raw: Raw): RoomWithAssignments {
  const assignmentsRaw = Array.isArray(raw.assignments)
    ? (raw.assignments as Raw[])
    : [];
  return {
    id: str(raw.id),
    departureId: str(raw.departure_id ?? raw.departureId),
    label: str(raw.label ?? raw.name),
    roomType: str(raw.room_type ?? raw.roomType ?? "double"),
    capacity: Number(raw.capacity ?? 2),
    notes: str(raw.notes),
    createdAt: str(raw.created_at ?? raw.createdAt),
    updatedAt: str(raw.updated_at ?? raw.updatedAt),
    assignments: assignmentsRaw.map(mapAssignment),
  };
}

function mapGroupRow(raw: Raw): GroupListRow {
  return {
    bookingId: str(raw.booking_id ?? raw.bookingId),
    bookingRef: str(raw.booking_ref ?? raw.bookingRef),
    participantId: str(raw.participant_id ?? raw.participantId),
    participantName: str(raw.participant_name ?? raw.participantName),
    roomId: (raw.room_id ?? raw.roomId ?? null) as string | null,
    roomLabel: str(raw.room_label ?? raw.roomLabel),
    roomType: str(raw.room_type ?? raw.roomType),
    notes: str(raw.notes),
  };
}

export interface RoomingRepository {
  listRooms(departureId: string): Promise<RoomWithAssignments[]>;
  createRoom(departureId: string, input: CreateRoomInput): Promise<Room>;
  updateRoom(
    departureId: string,
    roomId: string,
    input: UpdateRoomInput,
  ): Promise<Room>;
  deleteRoom(departureId: string, roomId: string): Promise<void>;
  assign(
    departureId: string,
    input: AssignRoomInput,
  ): Promise<RoomAssignment>;
  unassign(
    departureId: string,
    assignmentId: string,
  ): Promise<void>;
  groupList(departureId: string): Promise<GroupListRow[]>;
  exportGroupListCsv(departureId: string): Promise<Blob>;
}

class ApiRepo implements RoomingRepository {
  constructor(private readonly http: HttpClient) {}

  async listRooms(departureId: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/departures/${departureId}/rooms`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapRoom);
  }

  async createRoom(departureId: string, input: CreateRoomInput) {
    return mapRoom(
      await this.http.request<Raw>(`/departures/${departureId}/rooms`, {
        method: "POST",
        body: JSON.stringify({
          label: input.label,
          room_type: input.roomType ?? "double",
          capacity: input.capacity ?? 2,
          notes: input.notes ?? "",
        }),
      }),
    );
  }

  async updateRoom(
    departureId: string,
    roomId: string,
    input: UpdateRoomInput,
  ) {
    return mapRoom(
      await this.http.request<Raw>(
        `/departures/${departureId}/rooms/${roomId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            label: input.label,
            room_type: input.roomType,
            capacity: input.capacity,
            notes: input.notes,
          }),
        },
      ),
    );
  }

  async deleteRoom(departureId: string, roomId: string) {
    await this.http.request(`/departures/${departureId}/rooms/${roomId}`, {
      method: "DELETE",
    });
  }

  async assign(departureId: string, input: AssignRoomInput) {
    return mapAssignment(
      await this.http.request<Raw>(
        `/departures/${departureId}/rooms/assign`,
        {
          method: "POST",
          body: JSON.stringify({
            room_id: input.roomId,
            booking_id: input.bookingId,
            participant_id: input.participantId,
            participant_name: input.participantName ?? "",
          }),
        },
      ),
    );
  }

  async unassign(departureId: string, assignmentId: string) {
    await this.http.request(
      `/departures/${departureId}/rooms/assignments/${assignmentId}`,
      { method: "DELETE" },
    );
  }

  async groupList(departureId: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/departures/${departureId}/rooms/group-list`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapGroupRow);
  }

  async exportGroupListCsv(departureId: string) {
    const token = tokenFromCookie();
    const res = await fetch(
      `${env.apiBaseUrl}/departures/${departureId}/rooms/group-list.csv`,
      {
        headers: {
          Accept: "text/csv",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!res.ok) throw new Error("CSV export failed");
    return res.blob();
  }
}

class MemoryRepo implements RoomingRepository {
  private rooms: Record<string, RoomWithAssignments[]> = {};
  private assignments: Record<string, RoomAssignment[]> = {};

  private ensure(departureId: string) {
    if (!this.rooms[departureId]) {
      const roomId = `room-${departureId}-1`;
      this.rooms[departureId] = [
        {
          id: roomId,
          departureId,
          label: "Room 101",
          roomType: "double",
          capacity: 2,
          notes: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignments: [],
        },
      ];
      this.assignments[departureId] = [];
    }
  }

  async listRooms(departureId: string) {
    this.ensure(departureId);
    return (this.rooms[departureId] ?? []).map((r) => ({
      ...r,
      assignments: [...r.assignments],
    }));
  }

  async createRoom(departureId: string, input: CreateRoomInput) {
    this.ensure(departureId);
    const now = new Date().toISOString();
    const room: RoomWithAssignments = {
      id: crypto.randomUUID(),
      departureId,
      label: input.label,
      roomType: input.roomType ?? "double",
      capacity: input.capacity ?? 2,
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
      assignments: [],
    };
    this.rooms[departureId]!.push(room);
    return { ...room };
  }

  async updateRoom(
    departureId: string,
    roomId: string,
    input: UpdateRoomInput,
  ) {
    this.ensure(departureId);
    const room = this.rooms[departureId]!.find((r) => r.id === roomId);
    if (!room) throw new Error("room not found");
    if (input.label != null) room.label = input.label;
    if (input.roomType != null) room.roomType = input.roomType;
    if (input.capacity != null) room.capacity = input.capacity;
    if (input.notes != null) room.notes = input.notes;
    room.updatedAt = new Date().toISOString();
    return { ...room };
  }

  async deleteRoom(departureId: string, roomId: string) {
    this.ensure(departureId);
    this.rooms[departureId] = this.rooms[departureId]!.filter(
      (r) => r.id !== roomId,
    );
  }

  async assign(departureId: string, input: AssignRoomInput) {
    this.ensure(departureId);
    const room = this.rooms[departureId]!.find((r) => r.id === input.roomId);
    if (!room) throw new Error("room not found");
    const a: RoomAssignment = {
      id: crypto.randomUUID(),
      roomId: input.roomId,
      bookingId: input.bookingId,
      participantId: input.participantId,
      participantName: input.participantName ?? input.participantId,
      createdAt: new Date().toISOString(),
    };
    room.assignments.push(a);
    return { ...a };
  }

  async unassign(departureId: string, assignmentId: string) {
    this.ensure(departureId);
    for (const room of this.rooms[departureId]!) {
      room.assignments = room.assignments.filter((a) => a.id !== assignmentId);
    }
  }

  async groupList(departureId: string) {
    this.ensure(departureId);
    const rows: GroupListRow[] = [];
    for (const room of this.rooms[departureId]!) {
      for (const a of room.assignments) {
        rows.push({
          bookingId: a.bookingId,
          bookingRef: a.bookingId.slice(0, 8),
          participantId: a.participantId,
          participantName: a.participantName,
          roomId: room.id,
          roomLabel: room.label,
          roomType: room.roomType,
          notes: room.notes,
        });
      }
    }
    return rows;
  }

  async exportGroupListCsv(departureId: string) {
    const rows = await this.groupList(departureId);
    const header =
      "booking_ref,participant_name,room_label,room_type,notes\n";
    const body = rows
      .map(
        (r) =>
          `${r.bookingRef},${r.participantName},${r.roomLabel},${r.roomType},${r.notes}`,
      )
      .join("\n");
    return new Blob([header + body], { type: "text/csv" });
  }
}

let mem: MemoryRepo | null = null;

export function createRoomingRepository(): RoomingRepository {
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  const wrap =
    <A extends unknown[], R>(
      fn: (...args: A) => Promise<R>,
      fallback: (...args: A) => Promise<R>,
    ) =>
    async (...args: A) => {
      try {
        return await fn(...args);
      } catch {
        return fallback(...args);
      }
    };
  return {
    listRooms: wrap(api.listRooms.bind(api), mem.listRooms.bind(mem)),
    createRoom: wrap(api.createRoom.bind(api), mem.createRoom.bind(mem)),
    updateRoom: wrap(api.updateRoom.bind(api), mem.updateRoom.bind(mem)),
    deleteRoom: wrap(api.deleteRoom.bind(api), mem.deleteRoom.bind(mem)),
    assign: wrap(api.assign.bind(api), mem.assign.bind(mem)),
    unassign: wrap(api.unassign.bind(api), mem.unassign.bind(mem)),
    groupList: wrap(api.groupList.bind(api), mem.groupList.bind(mem)),
    exportGroupListCsv: wrap(
      api.exportGroupListCsv.bind(api),
      mem.exportGroupListCsv.bind(mem),
    ),
  };
}
