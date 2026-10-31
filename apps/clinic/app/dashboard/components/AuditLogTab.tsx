"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge, Button, ListToolbar, usePagination, PaginationBar } from "@swasthyaseva/ui";
import { getAuditLogs, type AuditLog } from "@/lib/api";

const ACTION_COLORS: Record<string, "default" | "primary" | "success" | "warning" | "danger"> = {
  create: "success",
  update: "primary",
  delete: "danger",
  restore: "warning",
  list: "default",
  view: "default",
};

export default function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hideList, setHideList] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const PAGE_SIZE = 30;
  const pag = usePagination(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        limit: PAGE_SIZE,
        offset: pag.offset,
        exclude_action: hideList ? "list,view" : undefined,
      });
      setLogs(res.logs);
      pag.setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pag.page, hideList]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {/* Controls */}
      <ListToolbar onRefresh={load} loading={loading} refreshTestId="audit-refresh-btn"
        trailing={<span data-testid="audit-log-count" className="text-xs text-muted-alt ml-auto">{pag.total} log{pag.total !== 1 ? "s" : ""}</span>}>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            data-testid="audit-hide-checkbox"
            type="checkbox"
            checked={hideList}
            onChange={(e) => { setHideList(e.target.checked); pag.reset(); }}
            className="accent-primary"
          />
          <span className="text-card-alt">Hide read-only actions</span>
        </label>
      </ListToolbar>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table data-testid="audit-table" className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-alt text-left">
              <th className="px-4 py-2 font-medium w-8" />
              <th className="px-4 py-2 font-medium">Actor</th>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Entity</th>
              <th className="px-4 py-2 font-medium">Endpoint</th>
              <th className="px-4 py-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody data-testid={loading ? "table-shimmer" : undefined}>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted"}`}>
                  {Array.from({ length: 6 }, (_, ci) => (
                    <td key={ci} className="px-4 py-2"><div className="h-4 rounded bg-muted-alt/20 animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-alt">
                  No audit logs.
                </td>
              </tr>
            ) : null}
            {!loading && logs.map((log, logIdx) => (
              <>
                <tr
                  key={log.log_id}
                  data-testid={logIdx === 0 ? "audit-row" : undefined}
                  className="border-t border-border hover:bg-muted/50 cursor-pointer"
                  onClick={() => setExpanded(expanded === log.log_id ? null : log.log_id)}
                >
                  <td {...(logIdx === 0 && log.data ? { 'data-testid': 'audit-row-expander' } : {})} className="px-4 py-2 text-muted-alt">
                    {log.data ? (expanded === log.log_id ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-card-alt">{log.actor_name}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      log.actor_role === "clinic" ? "bg-success/10 text-success" : "bg-accent/15 text-accent"
                    }`}>
                      {log.actor_role === "clinic" ? "Clinic" : "Admin"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={ACTION_COLORS[log.action] || "default"}>
                      {log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-alt">
                    {log.entity_type || "—"}
                    {log.entity_id && <span className="text-xs ml-1">#{log.entity_id}</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-alt font-mono">{log.endpoint}</td>
                  <td className="px-4 py-2 text-xs text-muted-alt">
                    {new Date(log.created_at).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
                {expanded === log.log_id && log.data && (
                  <tr key={`${log.log_id}-data`} className="border-t border-border/50">
                    <td colSpan={6} className="px-4 py-3 bg-muted/30">
                      <pre data-testid="audit-expanded-json" className="text-xs text-muted-alt whitespace-pre-wrap font-mono">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-1">
        {logs.length === 0 && (
          <p className="text-center text-muted-alt py-8">{loading ? "Loading..." : "No audit logs."}</p>
        )}
        {logs.map((log, logIdx) => (
          <div
            key={log.log_id}
            className="bg-card border-b border-border px-4 py-3 cursor-pointer"
            onClick={() => log.data && setExpanded(expanded === log.log_id ? null : log.log_id)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Badge variant={ACTION_COLORS[log.action] || "default"}>{log.action}</Badge>
                <span className="text-sm text-card-alt truncate">{log.entity_type || "—"}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-alt">
                  {new Date(log.created_at).toLocaleString("en-IN", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                {log.data && (
                  <span className="text-muted-alt">
                    {expanded === log.log_id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-alt mt-0.5 truncate">{log.actor_name}</p>
            {expanded === log.log_id && log.data && (
              <pre className="text-xs text-muted-alt whitespace-pre-wrap font-mono mt-3 p-3 rounded-lg bg-muted/30 overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      <PaginationBar pag={pag} />
    </div>
  );
}

import { componentTestSpec } from '@swasthyaseva/test-gen';

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Audit Log Tab',
  elements: {
    auditLogsTab: { role: 'button', name: /Audit Logs/ },
    hideListViewCheckbox: { testId: 'audit-hide-checkbox' },
    hideListViewLabel: { text: 'Hide read-only actions' },
    refreshBtn: { testId: 'audit-refresh-btn' },
    logCount: { testId: 'audit-log-count' },
    auditTable: { testId: 'audit-table' },
    tableRows: { testId: 'audit-row' },
    expanderIcon: { testId: 'audit-row-expander' },
    expandedJson: { testId: 'audit-expanded-json' },
    emptyMessage: { text: 'No audit logs.' },
    previousBtn: { role: 'button', name: 'Previous', exact: true },
    nextBtn: { role: 'button', name: 'Next', exact: true },
    pageIndicator: { text: /Page \d+ of \d+/ },
  },
  flows: [
    {
      name: 'view audit logs table with data',
      steps: [
        { do: 'click', on: 'auditLogsTab' },
        { expect: 'visible', on: 'auditTable' },
        { expect: 'visible', on: 'logCount' },
        { expect: 'visible', on: 'tableRows' },
      ],
    },
    {
      name: 'expand a log row reveals JSON details',
      after: 'view audit logs table with data',
      steps: [
        { do: 'click', on: 'expanderIcon' },
        { expect: 'visible', on: 'expandedJson' },
      ],
    },
    {
      name: 'toggle hide list/view actions refreshes log count',
      after: 'view audit logs table with data',
      steps: [
        { do: 'click', on: 'hideListViewCheckbox' },
        { expect: 'visible', on: 'logCount' },
        { do: 'click', on: 'hideListViewCheckbox' },
        { expect: 'visible', on: 'logCount' },
      ],
    },
    {
      name: 'refresh audit logs reloads data',
      after: 'view audit logs table with data',
      steps: [
        { do: 'click', on: 'refreshBtn' },
        { expect: 'visible', on: 'logCount' },
      ],
    },
    {
      name: 'paginate audit logs via next and previous buttons',
      after: 'view audit logs table with data',
      steps: [
        { do: 'click', on: 'nextBtn' },
        { expect: 'visible', on: 'pageIndicator' },
        { expect: 'visible', on: 'logCount' },
        { do: 'click', on: 'previousBtn' },
        { expect: 'visible', on: 'pageIndicator' },
        { expect: 'visible', on: 'logCount' },
      ],
    },
  ],
});
