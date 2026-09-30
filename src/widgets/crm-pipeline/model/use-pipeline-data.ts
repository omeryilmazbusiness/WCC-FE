"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appendBoardPage,
  mergeBoardSummary,
  removeBoardLeads,
  upsertBoardLead,
  type BoardColumn,
  type Lead,
  type LeadQuery,
  type LeadRepository,
  type LeadStage,
} from "@/entities/lead";
import { useRealtime } from "@/shared/lib/use-realtime";

/** Cards fetched per lane on load and on every "load more". */
export const LANE_PAGE = 20;

type Options = {
  repository: LeadRepository;
  query: LeadQuery;
  /** Holds every request until saved preferences are applied. */
  enabled: boolean;
  /** Kanban needs cards per lane; the table only needs lane totals for the stats. */
  withCards: boolean;
  table: { enabled: boolean; stage?: LeadStage; page: number; pageSize: number };
};

/**
 * Server-driven pipeline state. Filters and periods refetch; mutations patch
 * the loaded cards immediately and then refresh the lane totals quietly, so
 * the board scales to thousands of leads without loading them all.
 */
export function usePipelineData({ repository, query, enabled, withCards, table }: Options) {
  const key = JSON.stringify(query);
  const stableQuery = useMemo(() => JSON.parse(key) as LeadQuery, [key]);

  const [columns, setColumns] = useState<BoardColumn[] | null>(null);
  const [boardError, setBoardError] = useState<unknown>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [loadingStages, setLoadingStages] = useState<ReadonlySet<LeadStage>>(new Set());
  const boardSeq = useRef(0);

  const loadBoard = useCallback(async () => {
    if (!enabled) return;
    const seq = ++boardSeq.current;
    setBoardLoading(true);
    try {
      const cols = await repository.board(stableQuery, withCards ? LANE_PAGE : 0);
      if (seq !== boardSeq.current) return;
      setColumns(cols);
      setBoardError(null);
    } catch (err) {
      if (seq === boardSeq.current) setBoardError(err);
    } finally {
      if (seq === boardSeq.current) setBoardLoading(false);
    }
  }, [enabled, repository, stableQuery, withCards]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const refreshSummary = useCallback(async () => {
    try {
      const summary = await repository.board(stableQuery, 0);
      setColumns((cols) => (cols ? mergeBoardSummary(cols, summary) : summary));
    } catch {
      /* the next full load corrects the totals */
    }
  }, [repository, stableQuery]);

  const loadMore = useCallback(
    async (stage: LeadStage) => {
      const lane = columns?.find((c) => c.stage === stage);
      if (!lane || lane.items.length >= lane.total || loadingStages.has(stage)) return;
      setLoadingStages((s) => new Set(s).add(stage));
      try {
        const page = await repository.page(
          { ...stableQuery, stage },
          { limit: LANE_PAGE, offset: lane.items.length },
        );
        setColumns((cols) => {
          if (!cols) return cols;
          const next = appendBoardPage(cols, stage, page.items);
          return next.map((c) => (c.stage === stage ? { ...c, total: page.total } : c));
        });
      } finally {
        setLoadingStages((s) => {
          const next = new Set(s);
          next.delete(stage);
          return next;
        });
      }
    },
    [columns, loadingStages, repository, stableQuery],
  );

  const tableQuery = useMemo(() => ({ ...stableQuery, stage: table.stage }), [stableQuery, table.stage]);
  const [rows, setRows] = useState<Lead[]>([]);
  const [rowTotal, setRowTotal] = useState(0);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<unknown>(null);
  const rowSeq = useRef(0);

  const loadRows = useCallback(async () => {
    if (!enabled || !table.enabled) return;
    const seq = ++rowSeq.current;
    setRowsLoading(true);
    try {
      const res = await repository.page(tableQuery, {
        limit: table.pageSize,
        offset: table.page * table.pageSize,
      });
      if (seq !== rowSeq.current) return;
      setRows(res.items);
      setRowTotal(res.total);
      setRowsError(null);
    } catch (err) {
      if (seq === rowSeq.current) setRowsError(err);
    } finally {
      if (seq === rowSeq.current) setRowsLoading(false);
    }
  }, [enabled, repository, tableQuery, table.enabled, table.page, table.pageSize]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  /** A lead was created or changed here. */
  const applyLead = useCallback(
    (lead: Lead) => {
      setColumns((cols) => (cols ? upsertBoardLead(cols, lead) : cols));
      setRows((list) => list.map((l) => (l.id === lead.id ? lead : l)));
      void refreshSummary();
    },
    [refreshSummary],
  );

  /** Leads were deleted here. */
  const dropLeads = useCallback(
    (ids: readonly string[]) => {
      const set = new Set(ids);
      setColumns((cols) => (cols ? removeBoardLeads(cols, set) : cols));
      setRows((list) => list.filter((l) => !set.has(l.id)));
      void refreshSummary();
      void loadRows();
    },
    [refreshSummary, loadRows],
  );

  const reloadAll = useCallback(() => {
    void loadBoard();
    void loadRows();
  }, [loadBoard, loadRows]);

  // Someone else changed a lead: totals follow at once, loaded cards on the next load.
  useRealtime(() => void refreshSummary(), { topics: ["lead"] }, { debounceMs: 600 });

  return {
    columns,
    boardLoading,
    boardError,
    loadingStages,
    loadMore,
    rows,
    rowTotal,
    rowsLoading,
    rowsError,
    applyLead,
    dropLeads,
    reloadAll,
    reloadBoard: loadBoard,
  };
}
