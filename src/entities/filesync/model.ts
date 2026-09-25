export type FileSyncProvider = "onedrive" | "sharepoint";

export type FileSyncSourceOfTruth = "platform" | "file" | "manual_review";

export type FileSyncConflictPolicy =
  | "prefer_platform"
  | "prefer_file"
  | "flag";

export type FileSyncConnectionStatus =
  | "draft"
  | "connected"
  | "syncing"
  | "error"
  | "disabled";

export type FileSyncConnection = {
  id: string;
  branchId: string;
  provider: FileSyncProvider;
  displayName: string;
  remotePath: string;
  entityType: string;
  sourceOfTruth: FileSyncSourceOfTruth;
  conflictPolicy: FileSyncConflictPolicy;
  enabled: boolean;
  status: FileSyncConnectionStatus;
  lastSyncAt: string | null;
  lastError: string;
};

export type FileSyncRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type FileSyncRun = {
  id: string;
  connectionId: string;
  status: FileSyncRunStatus;
  startedAt: string;
  finishedAt: string | null;
  filesScanned: number;
  filesChanged: number;
  conflicts: number;
  error: string;
};

export type CreateFileSyncConnectionInput = {
  provider: FileSyncProvider;
  displayName: string;
  remotePath: string;
  entityType: string;
  sourceOfTruth?: FileSyncSourceOfTruth;
  conflictPolicy?: FileSyncConflictPolicy;
  enabled?: boolean;
};

export type UpdateFileSyncConnectionInput = {
  displayName?: string;
  remotePath?: string;
  entityType?: string;
  sourceOfTruth?: FileSyncSourceOfTruth;
  conflictPolicy?: FileSyncConflictPolicy;
  enabled?: boolean;
};

export const FILE_SYNC_PROVIDERS: FileSyncProvider[] = [
  "onedrive",
  "sharepoint",
];

export const FILE_SYNC_SOURCES: FileSyncSourceOfTruth[] = [
  "platform",
  "file",
  "manual_review",
];

export const FILE_SYNC_CONFLICT_POLICIES: FileSyncConflictPolicy[] = [
  "prefer_platform",
  "prefer_file",
  "flag",
];
