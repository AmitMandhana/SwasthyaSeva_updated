"use client";

import { useState, useCallback } from "react";

export interface UsePaginationReturn {
  page: number;
  setPage: (p: number) => void;
  total: number;
  setTotal: (t: number) => void;
  totalPages: number;
  offset: number;
  hasPrev: boolean;
  hasNext: boolean;
  goNext: () => void;
  goPrev: () => void;
  reset: () => void;
}

export function usePagination(pageSize: number): UsePaginationReturn {
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / pageSize);
  const offset = page * pageSize;
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  const goNext = useCallback(() => setPage((p) => Math.min(p + 1, Math.max(totalPages - 1, 0))), [totalPages]);
  const goPrev = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);
  const reset = useCallback(() => setPage(0), []);

  return { page, setPage, total, setTotal, totalPages, offset, hasPrev, hasNext, goNext, goPrev, reset };
}
