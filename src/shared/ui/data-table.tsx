"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn } from "@/shared/lib/cn";

/** Per-column classes for both header and cells, e.g. responsive `hidden 2xl:table-cell`. */
export type DataTableColumnMeta = { className?: string };

function metaClass(meta: unknown): string | undefined {
  return (meta as DataTableColumnMeta | undefined)?.className;
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
  /** Extra classes for the card wrapper, e.g. cell padding overrides via `[&_td]:`. */
  className?: string;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = "No results",
  className,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-zinc-200/70 bg-white shadow-[0_12px_36px_-22px_rgba(15,23,42,0.22)]",
        className,
      )}
    >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id} className={metaClass(header.column.columnDef.meta)}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={metaClass(cell.column.columnDef.meta)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-28 text-center text-zinc-500"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
