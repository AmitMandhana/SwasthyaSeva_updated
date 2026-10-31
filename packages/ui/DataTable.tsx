"use client";

import { Fragment, ReactNode, useState } from "react";
import { Button } from "./Button";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T, index: number) => ReactNode);
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  shimmerRows?: number;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onRestore?: (row: T) => void;
  renderActions?: (row: T, index: number) => ReactNode;
  renderExpandedRow?: (row: T) => ReactNode | null;
  emptyMessage?: string;
}

export function DataTable<T extends { [key: string]: unknown }>({
  columns,
  data,
  loading = false,
  shimmerRows = 5,
  onEdit,
  onDelete,
  onRestore,
  renderActions,
  renderExpandedRow,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  const hasActions = renderActions || onEdit || onDelete || onRestore;
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  function toggleRow(index: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const totalCols = columns.length + (hasActions ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="bg-muted border-b border-border">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-left font-medium text-muted-alt ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
            {hasActions && (
              <th className="px-4 py-3 text-right font-medium text-muted-alt">Actions</th>
            )}
          </tr>
        </thead>
        <tbody data-testid={loading ? "table-shimmer" : undefined}>
          {loading ? (
            Array.from({ length: shimmerRows }, (_, ri) => (
              <tr key={ri} className={`border-b border-border ${ri % 2 === 0 ? "bg-card" : "bg-muted"}`}>
                {columns.map((_, ci) => (
                  <td key={ci} className="px-4 py-3">
                    <div className="h-4 rounded bg-muted-alt/20 animate-pulse" />
                  </td>
                ))}
                {hasActions && (
                  <td className="px-4 py-3 text-right">
                    <div className="h-4 w-16 rounded bg-muted-alt/20 animate-pulse ml-auto" />
                  </td>
                )}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={totalCols}
                className="px-4 py-8 text-center text-muted-alt"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, ri) => {
              const isExpanded = expandedRows.has(ri);
              const expandedContent = renderExpandedRow ? renderExpandedRow(row) : null;
              const canExpand = !!renderExpandedRow && expandedContent !== null;

              return (
                <Fragment key={ri}>
                  <tr
                    className={`border-b border-border ${ri % 2 === 0 ? "bg-card" : "bg-muted"} ${Boolean((row as Record<string, unknown>).is_deleted) ? "opacity-50" : ""} ${canExpand ? "cursor-pointer hover:bg-accent/5" : ""}`}
                    onClick={canExpand ? () => toggleRow(ri) : undefined}
                    {...(canExpand && ri === 0 ? { "data-testid": "expandable-row-first" } : {})}
                  >
                    {columns.map((col, ci) => (
                      <td key={ci} className={`px-4 py-3 text-card-alt ${col.className ?? ""}`}>
                        {typeof col.accessor === "function"
                          ? col.accessor(row, ri)
                          : String(row[col.accessor] ?? "—")}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        {renderActions ? (
                          renderActions(row, ri)
                        ) : (
                          <>
                            {onRestore && Boolean((row as Record<string, unknown>).is_deleted) && (
                              <button
                                data-testid="btn-restore"
                                onClick={() => onRestore(row)}
                                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors bg-success/20 text-success hover:bg-success/30"
                              >
                                Restore
                              </button>
                            )}
                            {onEdit && !((row as Record<string, unknown>).is_deleted) && (
                              <Button variant="accent" size="xs" data-testid="btn-edit" onClick={() => onEdit(row)}>Edit</Button>
                            )}
                            {onDelete && !((row as Record<string, unknown>).is_deleted) && (
                              <button
                                data-testid="btn-delete"
                                onClick={() => onDelete(row)}
                                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors bg-destructive text-destructive-alt hover:opacity-90"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                  {isExpanded && expandedContent && (
                    <tr className={ri % 2 === 0 ? "bg-card" : "bg-muted"}>
                      <td colSpan={totalCols} className="px-6 py-3">
                        {expandedContent}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
