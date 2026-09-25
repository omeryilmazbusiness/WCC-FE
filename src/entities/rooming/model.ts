export type RoomType = "single" | "double" | "triple" | "quad" | "suite" | string;

export type Room = {
  id: string;
  departureId: string;
  label: string;
  roomType: RoomType;
  capacity: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type RoomAssignment = {
  id: string;
  roomId: string;
  bookingId: string;
  participantId: string;
  participantName: string;
  createdAt: string;
};

export type RoomWithAssignments = Room & {
  assignments: RoomAssignment[];
};

export type GroupListRow = {
  bookingId: string;
  bookingRef: string;
  participantId: string;
  participantName: string;
  roomId: string | null;
  roomLabel: string;
  roomType: string;
  notes: string;
};

export type CreateRoomInput = {
  label: string;
  roomType?: RoomType;
  capacity?: number;
  notes?: string;
};

export type UpdateRoomInput = {
  label?: string;
  roomType?: RoomType;
  capacity?: number;
  notes?: string;
};

export type AssignRoomInput = {
  roomId: string;
  bookingId: string;
  participantId: string;
  participantName?: string;
};
