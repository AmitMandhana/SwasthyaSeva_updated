"use client";

import { Button } from "./Button";
import type { UsePaginationReturn } from "./usePagination";

export interface PaginationBarProps {
  pag: UsePaginationReturn;
  className?: string;
}

export function PaginationBar({ pag, className = "" }: PaginationBarProps) {
  if (pag.totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between mt-4 ${className}`}>
      <Button onClick={() => pag.goPrev()} disabled={!pag.hasPrev} variant="secondary">Previous</Button>
      <span className="text-xs text-muted-alt">Page {pag.page + 1} of {pag.totalPages}</span>
      <Button onClick={() => pag.goNext()} disabled={!pag.hasNext} variant="secondary">Next</Button>
    </div>
  );
}
