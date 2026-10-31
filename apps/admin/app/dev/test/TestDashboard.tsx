"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { RefreshCw, Search } from "lucide-react";
import { BACKEND_ORIGIN } from "@/lib/env";

const API = BACKEND_ORIGIN + "/api";

interface StepLog {
  title: string;
  duration: number;
  status: string;
}

interface TestLog {
  suite: string;
  test: string;
  status: string;
  duration: number;
  steps: StepLog[];
  errors: string[];
  retries: number;
  project?: string;
  artifacts?: {
    trace: string | null;
    screenshots: string[];
    video: string | null;
    errorContext: string | null;
    outputDir: string | null;
  };
}

interface TraceAction {
  callId: string;
  title: string;
  startTime: number;
  endTime: number;
  wallTime: number;
  duration: number;
  params: Record<string, string>;
  error: { name: string; message: string; stack: string } | null;
  source: { file: string; line: number; column: number } | null;
  file: string;
}

interface TraceScreenshot {
  name: string;
  pageId: string;
  timestamp: number;
  ext: string;
}

interface NetworkRequest {
  method: string;
  url: string;
  status: number;
  statusText: string;
  startTime: string;
  duration: number;
  requestHeaders: { name: string; value: string }[];
  responseHeaders: { name: string; value: string }[];
  requestSize: number;
  responseSize: number;
  mimeType: string;
}

interface ConsoleLog {
  type: string;
  text: string;
  timestamp: string | null;
  source: { file: string; line: number } | null;
}

type DeepDiveTab = "actions" | "screenshots" | "network" | "console" | "dom" | "source";

interface SetupPhase {
  started: string | null;
  completed: string | null;
  duration: number | null;
  cached: boolean;
}

interface WarmupPage {
  url: string;
  status: string;
  duration: number;
}

interface SetupPhases {
  serverStart: string | null;
  auth: SetupPhase | null;
  dataSeed: SetupPhase | null;
  warmup: (SetupPhase & { pages: WarmupPage[] }) | null;
}

interface DomEntry {
  name: string;
  size: number;
}

interface ReportSummary {
  filename: string;
  timestamp: string;
  status: string;
  duration: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface FullReport extends ReportSummary {
  tests: TestLog[];
}

type ServerKey = "admin" | "doctor" | "clinic" | "web" | "setup" | "other";

function classifyServer(suite: string): ServerKey {
  const s = suite.toLowerCase();
  if (s.includes("auth.setup") || s.includes("data.setup")) return "setup";
  if (s.includes("admin") || s.includes("home")) return "admin";
  if (s.includes("doctor") || s.includes("consultation") || s.includes("appointment") || s.includes("patient")) return "doctor";
  if (s.includes("clinic") || s.includes("booking") || s.includes("lead")) return "clinic";
  if (s.includes("prescription") || s.includes("slot search") || s.includes("patient login") || s.includes("patient profile")) return "web";
  return "other";
}

const SERVER_LABELS: Record<ServerKey, string> = { admin: "Admin", doctor: "Doctor", clinic: "Clinic", web: "Web", setup: "Setup", other: "Other" };
const SERVER_COLORS: Record<ServerKey, string> = { admin: "border-blue-500", doctor: "border-emerald-500", clinic: "border-violet-500", web: "border-amber-500", setup: "border-gray-500", other: "border-gray-500" };

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)} min`;
}

function fmtLong(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} seconds`;
  return `${(ms / 60000).toFixed(1)} minutes`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "passed") return <span className="inline-block w-2.5 h-2.5 rounded-full bg-success shrink-0" />;
  if (status === "failed") return <span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive shrink-0" />;
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-alt shrink-0" />;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "").replace(/\[[\d;]*m/g, "");
}

const STEP_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500",
  "bg-cyan-500", "bg-pink-500", "bg-teal-500", "bg-orange-500", "bg-indigo-500",
  "bg-lime-500", "bg-fuchsia-500", "bg-sky-500", "bg-red-400", "bg-green-400",
  "bg-purple-400", "bg-yellow-400", "bg-blue-400", "bg-emerald-400", "bg-violet-400",
];

function stepLabel(filtered: StepLog[]): string[] {
  let actionNum = 0, assertNum = 0;
  return filtered.map(s => {
    if (s.title.startsWith("Assert")) return String.fromCharCode(65 + (assertNum++) % 26);
    return String(++actionNum);
  });
}

function StepTimeline({ steps, suite }: { steps: StepLog[]; maxDuration: number; suite?: string }) {
  const [mode, setMode] = useState<"sequential" | "descending">("sequential");
  const filtered = steps.filter(s => s.title !== "Before Hooks" && s.title !== "After Hooks" && s.title !== "Worker Cleanup");
  const labels = stepLabel(filtered);
  const totalDuration = filtered.reduce((s, st) => s + st.duration, 0);
  const sorted = mode === "descending" ? [...filtered].sort((a, b) => b.duration - a.duration) : filtered;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        {suite && <span className="text-xs text-muted-alt">Suite: {suite}</span>}
        {suite && <span className="text-muted-alt/30">|</span>}
        <button onClick={() => setMode("sequential")} className={`px-2 py-0.5 rounded text-[10px] font-medium ${mode === "sequential" ? "bg-primary text-primary-alt" : "bg-muted text-muted-alt"}`}>Sequential</button>
        <button onClick={() => setMode("descending")} className={`px-2 py-0.5 rounded text-[10px] font-medium ${mode === "descending" ? "bg-primary text-primary-alt" : "bg-muted text-muted-alt"}`}>By Duration</button>
        <span className="text-[10px] text-muted-alt ml-auto">Total: {fmt(totalDuration)}</span>
      </div>

      {/* Continuous bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
        {sorted.map((step, i) => {
          const origIdx = filtered.indexOf(step);
          const isAssert = step.title.startsWith("Assert");
          const pct = totalDuration > 0 ? Math.max(0.5, (step.duration / totalDuration) * 100) : 0;
          const bg = step.status === "failed" ? "bg-destructive" : isAssert ? "bg-zinc-500" : STEP_COLORS[origIdx % STEP_COLORS.length];
          return (
            <div
              key={i}
              className={`border-r border-background/30 last:border-0 ${bg}`}
              style={{ width: `${pct}%`, minWidth: "2px" }}
              title={`${labels[origIdx]}. ${step.title} — ${fmt(step.duration)}`}
            />
          );
        })}
      </div>

      {/* Key */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1 mt-3">
        {(() => {
          const failIdx = filtered.findIndex(s => s.status === "failed");
          return [...sorted].sort((a, b) => {
            const aIsAssert = a.title.startsWith("Assert") ? 1 : 0;
            const bIsAssert = b.title.startsWith("Assert") ? 1 : 0;
            return aIsAssert - bIsAssert;
          }).map((step, i) => {
            const origIdx = filtered.indexOf(step);
            const isAssert = step.title.startsWith("Assert");
            const keyBg = step.status === "failed" ? "bg-destructive" : isAssert ? "bg-zinc-500" : STEP_COLORS[origIdx % STEP_COLORS.length];
            const notAttempted = failIdx >= 0 && origIdx > failIdx && step.status !== "failed";
            const textColor = step.status === "failed" ? "text-destructive font-medium" : notAttempted ? "text-muted-alt" : "text-success";
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`w-3 h-3 rounded-sm shrink-0 ${keyBg}`} />
                <span className={`font-mono w-4 shrink-0 ${textColor}`}>{labels[origIdx]}</span>
                <span className={`truncate ${textColor}`}>{step.title}</span>
                <span className={`shrink-0 ml-auto tabular-nums ${notAttempted ? "text-muted-alt" : "text-muted-alt"}`}>{fmt(step.duration)}</span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

function DeepDivePanel({ test, onClose }: { test: TestLog; onClose: () => void }) {
  const [tab, setTab] = useState<DeepDiveTab>("actions");
  const [actions, setActions] = useState<TraceAction[]>([]);
  const [screenshots, setScreenshots] = useState<TraceScreenshot[]>([]);
  const [network, setNetwork] = useState<NetworkRequest[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [domEntries, setDomEntries] = useState<DomEntry[]>([]);
  const [selectedDom, setSelectedDom] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<number | null>(null);
  const [expandedReq, setExpandedReq] = useState<number | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [consoleFilter, setConsoleFilter] = useState<"all" | "log" | "warn" | "error">("all");
  const [networkPage, setNetworkPage] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const NET_PAGE_SIZE = 15;

  const outputDir = test.artifacts?.outputDir;

  const traceBase = outputDir ? `${API}/test/trace/${outputDir.split("/").slice(1).join("/")}` : null;

  useEffect(() => {
    if (!traceBase) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetch(`${traceBase}`).then(r => r.json()).catch(() => null),
      fetch(`${traceBase}/network`).then(r => r.json()).catch(() => null),
      fetch(`${traceBase}/console`).then(r => r.json()).catch(() => null),
      fetch(`${traceBase}/entries`).then(r => r.json()).catch(() => null),
      fetch(`${traceBase}/source`).then(r => r.json()).catch(() => null),
    ]).then(([trace, net, con, entries, src]) => {
      if (trace) { setActions(trace.actions || []); setScreenshots(trace.screenshots || []); }
      if (net) setNetwork(net.requests || []);
      if (con) setConsoleLogs(con.logs || []);
      if (entries) setDomEntries((entries as { name: string; size: number }[]).filter(e => e.name.startsWith("resources/") && e.name.endsWith(".html")));
      if (src) setSources(src.files || {});
    }).finally(() => setLoading(false));
  }, [traceBase]);

  const screenshotUrl = (s: TraceScreenshot) => traceBase ? `${traceBase}/resource/${s.name}` : "";

  const tabs: { key: DeepDiveTab; label: string; count?: number }[] = [
    { key: "actions", label: "Actions", count: actions.length },
    { key: "screenshots", label: "Screenshots", count: screenshots.length },
    { key: "network", label: "Network", count: network.length },
    { key: "console", label: "Console", count: consoleLogs.length },
    { key: "dom", label: "DOM", count: domEntries.length },
    { key: "source", label: "Source" },
  ];

  function actionIcon(title: string) {
    if (title.includes("Navigate")) return "🧭";
    if (title.includes("Click") || title.includes("click")) return "👆";
    if (title.includes("Fill") || title.includes("fill") || title.includes("type")) return "⌨️";
    if (title.includes("Assert") || title.includes("expect")) return "✓";
    if (title.includes("Wait") || title.includes("wait")) return "⏳";
    if (title.includes("Create") || title.includes("Launch")) return "🚀";
    if (title.includes("Close")) return "✕";
    return "•";
  }

  function statusColor(status: number) {
    if (status >= 200 && status < 300) return "text-success";
    if (status >= 300 && status < 400) return "text-amber-400";
    if (status >= 400) return "text-destructive";
    return "text-muted-alt";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
    <div className="bg-background rounded-2xl border border-border shadow-2xl flex flex-col w-[90vw] max-w-6xl h-[92vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border rounded-t-2xl bg-card shrink-0">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-alt hover:text-card-alt">
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        </button>
        <StatusIcon status={test.status} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-card-alt truncate">{test.test}</div>
          <div className="text-xs text-muted-alt">{test.suite} · {fmt(test.duration)} · {test.steps.length} steps</div>
        </div>
        {test.errors.length > 0 && (
          <div className="px-3 py-1 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive max-w-md truncate">
            {stripAnsi(test.errors[0]).split("\n")[0]}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-card/50 shrink-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setNetworkPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t.key ? "bg-primary text-primary-alt shadow-sm" : "text-muted-alt hover:text-card-alt hover:bg-muted"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-primary-alt/20 text-primary-alt" : "bg-muted text-muted-alt"}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-alt">
            <svg className="w-5 h-5 mr-3 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" className="opacity-75" /></svg>
            Loading trace data...
          </div>
        ) : !traceBase ? (
          <div className="text-center py-20 text-muted-alt">No trace data available for this test.</div>
        ) : (
          <>
            {/* Actions Tab — master-detail */}
            {tab === "actions" && (() => {
              const filtered = actions.filter(a => !a.title.includes("Before Hooks") && !a.title.includes("After Hooks"));
              const selected = selectedAction !== null ? filtered[selectedAction] : null;
              const selectedScreenshot = selected ? screenshots.reduce<TraceScreenshot | null>((best, s) => {
                if (!best) return s;
                return Math.abs(s.timestamp - selected.wallTime) < Math.abs(best.timestamp - selected.wallTime) ? s : best;
              }, null) : null;

              return (
              <div className="flex gap-4 h-full">
                {/* Left: action list */}
                <div className="w-80 shrink-0 overflow-y-auto border-r border-border pr-4 space-y-0.5">
                  {filtered.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedAction(selectedAction === i ? null : i); setImgLoaded(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
                        selectedAction === i ? "bg-primary/10 border border-primary/30" :
                        action.error ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-card/60"
                      }`}
                    >
                      <span className="text-xs w-5 text-center shrink-0">{actionIcon(action.title)}</span>
                      <span className="text-[10px] font-mono text-muted-alt w-5 shrink-0">{i + 1}</span>
                      <span className={`flex-1 text-xs truncate ${action.error ? "text-destructive" : "text-card-alt"}`}>{action.title}</span>
                      <span className={`text-[10px] tabular-nums shrink-0 ${action.duration > 5000 ? "text-warning" : "text-muted-alt"}`}>{fmt(Math.round(action.duration))}</span>
                    </button>
                  ))}
                </div>

                {/* Right: detail panel */}
                <div className="flex-1 overflow-y-auto">
                  {selected ? (
                    <div key={selectedAction} className="space-y-4 animate-in fade-in duration-150">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{actionIcon(selected.title)}</span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${selected.error ? "text-destructive" : "text-card-alt"}`}>{selected.title}</div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className={`text-xs tabular-nums ${selected.duration > 5000 ? "text-warning" : "text-muted-alt"}`}>{fmt(Math.round(selected.duration))}</span>
                              {selected.source && <span className="text-[10px] text-muted-alt font-mono">{selected.source.file.split(/[/\\]/).pop()}:{selected.source.line}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {Object.keys(selected.params).length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-alt mb-2">Parameters</div>
                          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs bg-card rounded-lg p-3 border border-border">
                            {Object.entries(selected.params).filter(([,v]) => v && v !== "undefined" && v !== "false").map(([k, v]) => (
                              <><span key={`k-${k}`} className="text-muted-alt font-mono">{k}</span><span key={`v-${k}`} className="text-card-alt break-all">{String(v)}</span></>
                            ))}
                          </div>
                        </div>
                      )}

                      {selected.error && (
                        <div>
                          <div className="text-xs font-medium text-destructive mb-2">Error</div>
                          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <pre className="text-xs text-destructive/80 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">{stripAnsi(selected.error.message)}</pre>
                          </div>
                        </div>
                      )}

                      {selectedScreenshot && (
                        <div>
                          <div className="text-xs font-medium text-muted-alt mb-2">Screenshot</div>
                          <div className="relative">
                            {!imgLoaded && <div className="h-48 rounded-lg bg-muted animate-pulse" />}
                            <button onClick={() => setLightboxImg(screenshotUrl(selectedScreenshot))} className={`block ${imgLoaded ? "" : "absolute inset-0 opacity-0"}`}>
                              <img
                                key={selectedScreenshot.name}
                                src={screenshotUrl(selectedScreenshot)}
                                alt="Screenshot"
                                className="rounded-lg border border-border max-h-72 hover:opacity-80 transition-opacity"
                                onLoad={() => setImgLoaded(true)}
                              />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-alt text-sm">Select an action to view details</div>
                  )}
                </div>
              </div>
              );
            })()}

            {/* Screenshots Tab */}
            {tab === "screenshots" && (
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {screenshots.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxImg(screenshotUrl(s))}
                      className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg"
                    >
                      <img src={screenshotUrl(s)} alt={`Frame ${i + 1}`} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                        <span className="text-[10px] text-white/80 font-mono">#{i + 1}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {screenshots.length === 0 && <div className="text-center py-20 text-muted-alt">No screenshots captured.</div>}
              </div>
            )}

            {/* Network Tab */}
            {tab === "network" && (
              <div className="max-w-6xl mx-auto">
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-[60px_1fr_70px_80px_80px_80px] gap-2 px-4 py-2 bg-muted text-xs font-medium text-muted-alt">
                    <span>Method</span><span>URL</span><span>Status</span><span>Type</span><span>Size</span><span>Time</span>
                  </div>
                  <div className="divide-y divide-border">
                    {network.slice(networkPage * NET_PAGE_SIZE, (networkPage + 1) * NET_PAGE_SIZE).map((req, pi) => {
                      const i = networkPage * NET_PAGE_SIZE + pi;
                      const isExpReq = expandedReq === i;
                      const mimeShort = req.mimeType.split("/").pop()?.split(";")[0] || "";
                      return (
                        <div key={i}>
                          <button
                            onClick={() => setExpandedReq(isExpReq ? null : i)}
                            className={`w-full grid grid-cols-[60px_1fr_70px_80px_80px_80px] gap-2 px-4 py-2 text-xs text-left transition-colors ${
                              isExpReq ? "bg-card" : "hover:bg-card/40"
                            }`}
                          >
                            <span className={`font-mono font-medium ${req.method === "GET" ? "text-blue-400" : req.method === "POST" ? "text-emerald-400" : req.method === "DELETE" ? "text-destructive" : "text-amber-400"}`}>{req.method}</span>
                            <span className="text-card-alt truncate" title={req.url}>{req.url}</span>
                            <span className={`font-mono ${statusColor(req.status)}`}>{req.status || "—"}</span>
                            <span className="text-muted-alt truncate">{mimeShort}</span>
                            <span className="text-muted-alt tabular-nums">{req.responseSize > 0 ? `${(req.responseSize / 1024).toFixed(1)}K` : "—"}</span>
                            <span className={`tabular-nums ${req.duration > 1000 ? "text-warning" : "text-muted-alt"}`}>{fmt(Math.round(req.duration))}</span>
                          </button>
                          <div className="grid" style={{ gridTemplateRows: isExpReq ? "1fr" : "0fr", transition: "grid-template-rows 200ms ease-out" }}>
                            <div className="overflow-hidden">
                              <div className="px-4 pb-3 pt-1 bg-card space-y-2">
                                {req.requestHeaders.length > 0 && (
                                  <details className="text-xs"><summary className="text-muted-alt cursor-pointer hover:text-card-alt">Request Headers ({req.requestHeaders.length})</summary>
                                    <div className="mt-1 grid grid-cols-[auto,1fr] gap-x-4 gap-y-0.5 font-mono text-[10px]">
                                      {req.requestHeaders.map((h, j) => <><span key={`k${j}`} className="text-muted-alt">{h.name}</span><span key={`v${j}`} className="text-card-alt truncate">{h.value}</span></>)}
                                    </div>
                                  </details>
                                )}
                                {req.responseHeaders.length > 0 && (
                                  <details className="text-xs"><summary className="text-muted-alt cursor-pointer hover:text-card-alt">Response Headers ({req.responseHeaders.length})</summary>
                                    <div className="mt-1 grid grid-cols-[auto,1fr] gap-x-4 gap-y-0.5 font-mono text-[10px]">
                                      {req.responseHeaders.map((h, j) => <><span key={`k${j}`} className="text-muted-alt">{h.name}</span><span key={`v${j}`} className="text-card-alt truncate">{h.value}</span></>)}
                                    </div>
                                  </details>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {network.length > NET_PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <span className="text-xs text-muted-alt">{networkPage * NET_PAGE_SIZE + 1}–{Math.min((networkPage + 1) * NET_PAGE_SIZE, network.length)} of {network.length}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setNetworkPage(p => Math.max(0, p - 1))} disabled={networkPage === 0} className="px-3 py-1 rounded text-xs font-medium bg-muted text-card-alt hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none transition-colors">Prev</button>
                      <button onClick={() => setNetworkPage(p => Math.min(Math.ceil(network.length / NET_PAGE_SIZE) - 1, p + 1))} disabled={(networkPage + 1) * NET_PAGE_SIZE >= network.length} className="px-3 py-1 rounded text-xs font-medium bg-muted text-card-alt hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none transition-colors">Next</button>
                    </div>
                  </div>
                )}
                {network.length === 0 && <div className="text-center py-20 text-muted-alt">No network requests captured.</div>}
              </div>
            )}

            {/* Console Tab */}
            {tab === "console" && (
              <div className="max-w-5xl mx-auto">
                <div className="flex gap-2 mb-4">
                  {(["all", "log", "warn", "error"] as const).map(f => (
                    <button key={f} onClick={() => setConsoleFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${consoleFilter === f ? "bg-primary text-primary-alt" : "bg-card text-muted-alt hover:text-card-alt"}`}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                  ))}
                </div>
                <div className="space-y-0.5">
                  {consoleLogs.filter(l => consoleFilter === "all" || l.type === consoleFilter).map((log, i) => (
                    <div key={i} className={`flex gap-3 px-3 py-1.5 rounded text-xs font-mono ${log.type === "error" ? "bg-destructive/5 text-destructive" : log.type === "warn" || log.type === "warning" ? "bg-amber-500/5 text-amber-400" : "text-muted-alt"}`}>
                      <span className="shrink-0 w-12 text-right opacity-60">{log.type}</span>
                      <span className="flex-1 break-words whitespace-pre-wrap">{log.text}</span>
                    </div>
                  ))}
                </div>
                {consoleLogs.length === 0 && <div className="text-center py-20 text-muted-alt">No console logs captured.</div>}
              </div>
            )}

            {/* DOM Tab */}
            {tab === "dom" && (
              <div className="max-w-6xl mx-auto">
                {domEntries.length > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-muted-alt">Snapshot:</span>
                    <select
                      value={selectedDom || ""}
                      onChange={e => setSelectedDom(e.target.value || null)}
                      className="rounded-lg px-3 py-2 text-sm bg-card border border-border text-card-alt flex-1 max-w-md"
                    >
                      <option value="">Select a DOM snapshot...</option>
                      {domEntries.map((e, i) => {
                        const hash = e.name.replace("resources/", "").replace(".html", "");
                        return <option key={i} value={e.name}>{`Snapshot #${i + 1}`} ({(e.size / 1024).toFixed(1)}KB) — {hash.slice(0, 12)}...</option>;
                      })}
                    </select>
                    <span className="text-xs text-muted-alt">{domEntries.length} snapshots</span>
                  </div>
                )}
                {selectedDom && traceBase ? (
                  <div className="rounded-lg border border-border overflow-hidden bg-white" style={{ height: "70vh" }}>
                    <iframe
                      src={`${traceBase}/resource/${selectedDom}`}
                      className="w-full h-full"
                      sandbox="allow-same-origin"
                      title="DOM Snapshot"
                    />
                  </div>
                ) : domEntries.length > 0 ? (
                  <div className="text-center py-20 text-muted-alt">Select a snapshot to view the DOM at that moment.</div>
                ) : (
                  <div className="text-center py-20 text-muted-alt">No DOM snapshots captured.</div>
                )}
              </div>
            )}

            {/* Source Tab */}
            {tab === "source" && (
              <div>
                {Object.entries(sources).map(([name, content]) => (
                  <div key={name}>
                    <div className="text-xs text-muted-alt font-mono mb-2 sticky top-0 bg-background py-1">{name.replace("resources/", "")}</div>
                    <div className="text-xs font-mono text-card-alt overflow-x-auto leading-relaxed">
                      {content.split("\n").map((line, i) => (
                        <div key={i} className="flex hover:bg-muted/30 rounded">
                          <span className="w-10 shrink-0 text-right pr-4 text-muted-alt/60 select-none">{i + 1}</span>
                          <span className="flex-1 whitespace-pre">{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(sources).length === 0 && <div className="text-center py-20 text-muted-alt">No source files in trace.</div>}
              </div>
            )}
          </>
        )}
      </div>

    </div> {/* modal container */}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 animate-in fade-in duration-150" onClick={(e) => { e.stopPropagation(); setLightboxImg(null); }}>
          <img src={lightboxImg} alt="Enlarged screenshot" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" />
          <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl">✕</button>
        </div>
      )}
    </div>
  );
}

export default function QADashboardPage() {
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilterRaw] = useState<"all" | "failed" | "passed">("all");
  const [listFilter, setListFilter] = useState<"all" | "failed" | "passed">("all");
  const [serverFilter, setServerFilterRaw] = useState<Set<ServerKey> | "all">("all");
  const [listServerFilter, setListServerFilter] = useState<Set<ServerKey> | "all">("all");
  const [expandedTest, setExpandedTest] = useState<number | null>(null);
  const [sortBy, setSortByRaw] = useState<"order" | "dur-desc" | "dur-asc" | "status">("order");
  const [listSortBy, setListSortBy] = useState<"order" | "dur-desc" | "dur-asc" | "status">("order");
  const [durType, setDurTypeRaw] = useState<"total" | "step" | "hook">("total");
  const [listDurType, setListDurType] = useState<"total" | "step" | "hook">("total");
  const [isListPending, startTransition] = useTransition();

  const setFilter = (f: typeof filter) => { setFilterRaw(f); startTransition(() => setListFilter(f)); };
  const setServerFilter = (f: typeof serverFilter) => { setServerFilterRaw(f); startTransition(() => setListServerFilter(f)); };
  const setSortBy = (f: typeof sortBy) => { setSortByRaw(f); startTransition(() => setListSortBy(f)); };
  const setDurType = (f: typeof durType) => { setDurTypeRaw(f); startTransition(() => setListDurType(f)); };

  function getStepDuration(t: TestLog): number {
    return t.steps.filter(s => s.title !== "Before Hooks" && s.title !== "After Hooks" && s.title !== "Worker Cleanup").reduce((s, st) => s + st.duration, 0);
  }
  function getHookDuration(t: TestLog): number {
    return t.duration - getStepDuration(t);
  }
  function getDuration(t: TestLog, type: "total" | "step" | "hook"): number {
    if (type === "step") return getStepDuration(t);
    if (type === "hook") return getHookDuration(t);
    return t.duration;
  }
  const [deepDiveTest, setDeepDiveTest] = useState<TestLog | null>(null);
  const [setupPhases, setSetupPhases] = useState<SetupPhases | null>(null);
  const [setupExpanded, setSetupExpanded] = useState(false);

  const fetchLatestReport = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await fetch(`${API}/test/reports`);
      const list = await listRes.json();
      if (list.length > 0) {
        const detailRes = await fetch(`${API}/test/reports/${list[0].filename}`);
        const data = await detailRes.json();
        setReport(data);
        setSetupPhases(data.setupPhases || null);
      }
    } catch { setReport(null); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLatestReport(); }, [fetchLatestReport]);

  const tests = report?.tests ?? [];
  const serverGroups = tests.reduce<Record<ServerKey, TestLog[]>>((acc, t) => {
    const key = classifyServer(t.suite);
    (acc[key] ??= []).push(t);
    return acc;
  }, {} as Record<ServerKey, TestLog[]>);

  const appTests = tests.filter(t => classifyServer(t.suite) !== "setup");
  const appTotal = appTests.length;
  const appPassed = appTests.filter(t => t.status === "passed").length;
  const appFailed = appTests.filter(t => t.status === "failed").length;

  const filteredTests = appTests
    .filter(t => listFilter === "all" || t.status === listFilter)
    .filter(t => listServerFilter === "all" || listServerFilter.has(classifyServer(t.suite)));

  const sortedTests = [...filteredTests].sort((a, b) => {
    if (listSortBy === "dur-desc") return getDuration(b, listDurType) - getDuration(a, listDurType);
    if (listSortBy === "dur-asc") return getDuration(a, listDurType) - getDuration(b, listDurType);
    if (listSortBy === "status") return (a.status === "failed" ? -1 : 1) - (b.status === "failed" ? -1 : 1);
    return 0;
  });

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0">
        {loading ? (
          <div className="text-center py-20 text-muted-alt">Loading report...</div>
        ) : !report ? (
          <div className="text-center py-20 text-muted-alt">No test reports found. Run tests first.</div>
        ) : (
          <>
            {/* Summary Strip — fixed header, never scrolls */}
            <div className="bg-background shrink-0 relative z-20 pb-2">
            <div className="relative p-4 pt-6 mx-4 sm:mx-8 mt-4 sm:mt-8 rounded-xl bg-card border border-border">
              <span className="absolute -top-3 left-4 px-2 text-sm font-semibold text-muted-alt bg-transparent">Test Dashboard</span>
              <div className="flex items-start gap-4">
                {/* Left: Pie + Stats */}
                <svg viewBox="0 0 36 36" className="w-14 h-14 shrink-0 mt-1">
                  <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.5" className="stroke-destructive/40" />
                  <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.5" className="stroke-success"
                    strokeDasharray={`${(appPassed / appTotal) * 100} ${100 - (appPassed / appTotal) * 100}`}
                    strokeDashoffset="25" strokeLinecap="round" />
                  <text x="18" y="20" textAnchor="middle" className="fill-card-alt text-[7px] font-bold">{appTotal > 0 ? ((appPassed / appTotal) * 100).toFixed(0) : 0}%</text>
                </svg>
                <div className="shrink-0">
                  <div className="flex items-center gap-4">
                    <span className={`text-3xl font-bold ${report.status === "passed" ? "text-success" : "text-destructive"}`}>
                      {report.status === "passed" ? "PASS" : "FAIL"}
                    </span>
                    <span className="text-sm tabular-nums text-card-alt/70">{fmtLong(report.duration)}</span>
                  </div>
                  <div className="flex gap-5 text-sm mt-1">
                    <div><span className="text-muted-alt">Total</span> <span className="font-semibold text-card-alt ml-1">{appTotal}</span></div>
                    <div><span className="text-success">Passed</span> <span className="font-semibold text-success ml-1">{appPassed}</span></div>
                    <div><span className="text-destructive">Failed</span> <span className="font-semibold text-destructive ml-1">{appFailed}</span></div>
                  </div>
                  <div className="h-2 rounded-full bg-destructive/40 overflow-hidden mt-2 w-72">
                    <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${appTotal > 0 ? (appPassed / appTotal) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Center: Setup phases */}
                {(() => {
                  const hasData = setupPhases && (setupPhases.auth || setupPhases.dataSeed || setupPhases.warmup);
                  const totalSetup = hasData ? (setupPhases.auth?.duration || 0) + (setupPhases.dataSeed?.duration || 0) + (setupPhases.warmup?.duration || 0) : 0;
                  const maxDur = hasData ? Math.max(setupPhases.auth?.duration || 0, setupPhases.dataSeed?.duration || 0, setupPhases.warmup?.duration || 0, 1) : 1;
                  return (
                  <div className="border-l border-border/40 pl-4">
                    <button onClick={() => hasData && setSetupExpanded(!setupExpanded)} className="w-full text-left group">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-bold text-card-alt">Setup</span>
                        <span className="text-sm tabular-nums text-card-alt/70">{hasData ? fmtLong(totalSetup) : ''}</span>
                      </div>
                      <div className="flex gap-5 text-sm mt-1">
                        <span className={hasData && setupPhases.auth?.cached ? "text-muted-alt" : "text-blue-400"}>Auth <span className="font-semibold ml-1">{hasData && setupPhases.auth ? fmt(setupPhases.auth.duration || 0) : 'N/A'}</span></span>
                        <span className={hasData && setupPhases.dataSeed?.cached ? "text-muted-alt" : "text-emerald-400"}>Data <span className="font-semibold ml-1">{hasData && setupPhases.dataSeed ? fmt(setupPhases.dataSeed.duration || 0) : 'N/A'}</span></span>
                        <span className={hasData && setupPhases.warmup?.cached ? "text-muted-alt" : "text-amber-400"}>Warmup <span className="font-semibold ml-1">{hasData && setupPhases.warmup ? ((setupPhases.warmup.duration || 0) / 1000).toFixed(1) + 's' : 'N/A'}</span></span>
                      </div>
                      {hasData && <div className="flex h-2 rounded-full bg-muted overflow-hidden mt-2 w-72">
                        {setupPhases.auth?.duration != null && <div className={`${setupPhases.auth.cached ? "bg-blue-500/30" : "bg-blue-500"}`} style={{ width: `${(setupPhases.auth.duration / totalSetup) * 100}%` }} />}
                        {setupPhases.dataSeed?.duration != null && <div className={`${setupPhases.dataSeed.cached ? "bg-emerald-500/30" : "bg-emerald-500"}`} style={{ width: `${(setupPhases.dataSeed.duration / totalSetup) * 100}%` }} />}
                        {setupPhases.warmup?.duration != null && <div className={`${setupPhases.warmup.cached ? "bg-amber-500/30" : "bg-amber-500"}`} style={{ width: `${(setupPhases.warmup.duration / totalSetup) * 100}%` }} />}
                      </div>}
                    </button>

                    {hasData && (
                    <div className="grid" style={{ gridTemplateRows: setupExpanded ? "1fr" : "0fr", transition: "grid-template-rows 250ms ease-out" }}>
                      <div className="overflow-hidden">
                        <div className="pt-2 space-y-1.5">
                          {setupPhases.serverStart && (
                            <div className="text-[9px] text-muted-alt">Server: {new Date(setupPhases.serverStart).toLocaleString()}</div>
                          )}
                          {[
                            { phase: setupPhases.auth, label: "Auth", color: "bg-blue-500", dot: "bg-blue-400" },
                            { phase: setupPhases.dataSeed, label: "Data", color: "bg-emerald-500", dot: "bg-emerald-400" },
                            { phase: setupPhases.warmup, label: "Warmup", color: "bg-amber-500", dot: "bg-amber-400" },
                          ].filter(p => p.phase).map(({ phase, label, color, dot }) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                              <span className="text-[10px] font-medium text-card-alt w-12">{label}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full ${phase!.cached ? `${color}/30` : color}`}
                                  style={{ width: `${Math.max(3, (phase!.duration || 0) / maxDur * 100)}%` }} />
                              </div>
                              <span className="text-[10px] tabular-nums text-muted-alt w-10 text-right">{phase!.duration != null ? fmt(phase!.duration) : "—"}</span>
                              {phase!.cached && <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-alt">cached</span>}
                            </div>
                          ))}
                          {setupPhases.warmup && setupPhases.warmup.pages.length > 0 && !setupPhases.warmup.cached && (
                            <div className="ml-5 space-y-0.5">
                              {setupPhases.warmup.pages.map((page, i) => {
                                const maxPageDur = Math.max(...setupPhases.warmup!.pages.map(p => p.duration));
                                const urlShort = page.url.replace(/^https?:\/\/localhost:\d+/, "");
                                const port = page.url.match(/:(\d+)/)?.[1] || "";
                                const appName = port === "3000" ? "web" : port === "3001" ? "admin" : port === "3002" ? "doctor" : port === "3003" ? "clinic" : port;
                                return (
                                  <div key={i} className="flex items-center gap-1.5">
                                    <span className={`text-[8px] font-mono w-9 shrink-0 ${appName === "admin" ? "text-blue-400" : appName === "doctor" ? "text-emerald-400" : appName === "clinic" ? "text-violet-400" : "text-amber-400"}`}>{appName}</span>
                                    <span className="text-[8px] text-muted-alt w-24 truncate">{urlShort}</span>
                                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[80px]">
                                      <div className={`h-full rounded-full ${page.status === "timeout" ? "bg-destructive/60" : "bg-amber-500/60"}`} style={{ width: `${(page.duration / maxPageDur) * 100}%` }} />
                                    </div>
                                    <span className={`text-[8px] tabular-nums ${page.status === "timeout" ? "text-destructive" : "text-muted-alt"}`}>{fmt(page.duration)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                  );
                })()}

                {/* Right: Timestamp + Refresh */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-alt">{report.timestamp ? new Date(report.timestamp).toLocaleString() : ""}</span>
                  <button onClick={fetchLatestReport} className="p-1.5 rounded-md text-muted-alt hover:text-card-alt transition-colors" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            </div> {/* bg wrapper */}

            {/* Scrollable area below strip */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-4 sm:pb-8">
            <div className="flex gap-4">
            {/* Server Cards — sidebar */}
            <div className="flex flex-col gap-3 w-96 shrink-0 sticky top-0 self-start">
              {(["admin", "doctor", "clinic", "web", "other"] as ServerKey[]).map(key => {
                const group = serverGroups[key] ?? [];
                const passed = group.filter(t => t.status === "passed").length;
                const failed = group.filter(t => t.status === "failed").length;
                const total = group.length;
                const duration = group.reduce((s, t) => s + getDuration(t, durType), 0);
                const isActive = serverFilter !== "all" && serverFilter.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (serverFilter === "all") { setServerFilter(new Set([key])); }
                      else if (isActive) { const next = new Set(serverFilter); next.delete(key); setServerFilter(next.size === 0 ? "all" : next); }
                      else { setServerFilter(new Set([...serverFilter, key])); }
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isActive ? `${SERVER_COLORS[key]} bg-card shadow-lg` :
                      failed > 0 ? "border-destructive/30 bg-card hover:border-destructive/60" :
                      "border-success/30 bg-card hover:border-success/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-alt">{SERVER_LABELS[key]}</div>
                      {failed > 0 && <div className="text-xs text-destructive hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); setServerFilter(new Set([key])); setFilter("failed"); }}>{failed} failed</div>}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="text-2xl font-bold text-card-alt w-[5.5rem]">{passed}/{total}</div>
                      <div className="text-xl font-semibold text-card-alt w-[7rem] text-right whitespace-nowrap">{fmt(duration)}</div>
                      {total > 0 && (
                        <svg viewBox="0 0 36 36" className="w-10 h-10 shrink-0 ml-auto">
                          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" className="stroke-destructive/40" />
                          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" className="stroke-success"
                            strokeDasharray={`${(passed / total) * 100} ${100 - (passed / total) * 100}`}
                            strokeDashoffset="25" strokeLinecap="round" />
                          <text x="18" y="20" textAnchor="middle" className="fill-card-alt text-[8px] font-bold">{((passed / total) * 100).toFixed(0)}%</text>
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-4">
            {/* Filters — sticky within scroll */}
            <div className="sticky top-0 z-10">
            <div className="flex items-center gap-3 flex-wrap bg-background py-2">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["all", "failed", "passed"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-sm capitalize ${filter === f ? "bg-primary text-primary-alt" : "bg-card text-muted-alt hover:text-card-alt"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["all", "admin", "doctor", "clinic", "web", "other"] as const).map(key => {
                  const isActive = key === "all" ? serverFilter === "all" : serverFilter !== "all" && serverFilter.has(key as ServerKey);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === "all") { setServerFilter("all"); }
                        else if (serverFilter === "all") { setServerFilter(new Set([key as ServerKey])); }
                        else {
                          const next = new Set(serverFilter);
                          if (next.has(key as ServerKey)) { next.delete(key as ServerKey); setServerFilter(next.size === 0 ? "all" : next); }
                          else { next.add(key as ServerKey); setServerFilter(next); }
                        }
                      }}
                      className={`px-3 py-1.5 text-sm capitalize ${isActive ? "bg-primary text-primary-alt" : "bg-card text-muted-alt hover:text-card-alt"}`}
                    >
                      {key === "all" ? "All" : SERVER_LABELS[key as ServerKey]}
                    </button>
                  );
                })}
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {([["order", "Default"], ["dur-desc", "Slowest"], ["dur-asc", "Fastest"], ["status", "Status"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key as typeof sortBy)}
                    className={`px-3 py-1.5 text-sm ${sortBy === key ? "bg-primary text-primary-alt" : "bg-card text-muted-alt hover:text-card-alt"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {([["total", "Total"], ["step", "Steps"], ["hook", "Hooks"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setDurType(key as typeof durType)}
                    className={`px-3 py-1.5 text-sm ${durType === key ? "bg-primary text-primary-alt" : "bg-card text-muted-alt hover:text-card-alt"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-alt ml-auto">{sortedTests.length} tests</span>
            </div>
            <div className="h-4 bg-gradient-to-b from-background to-transparent pointer-events-none" />
            </div>

            {/* Test List */}
            <div className={`space-y-1 transition-opacity duration-150 ${isListPending ? "opacity-40 pointer-events-none" : ""}`}>
              {sortedTests.map((t, idx) => {
                const globalIdx = tests.indexOf(t);
                const isExpanded = expandedTest === globalIdx;
                const maxStepDuration = Math.max(...t.steps.map(s => s.duration), 1);
                const server = classifyServer(t.suite);
                return (
                  <div key={globalIdx}>
                    <button
                      onClick={() => setExpandedTest(isExpanded ? null : globalIdx)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                        isExpanded ? "bg-card border border-border" :
                        t.status === "failed" ? "bg-destructive/5 hover:bg-destructive/10" :
                        "hover:bg-card/60"
                      }`}
                    >
                      <StatusIcon status={t.status} />
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        server === "admin" ? "text-blue-400 bg-blue-500/10" :
                        server === "doctor" ? "text-emerald-400 bg-emerald-500/10" :
                        server === "clinic" ? "text-violet-400 bg-violet-500/10" :
                        "text-amber-400 bg-amber-500/10"
                      }`}>{SERVER_LABELS[server].slice(0, 3)}</span>
                      <span className="flex-1 text-sm text-card-alt truncate">{t.test}</span>
                      {t.artifacts?.trace ? (
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); setDeepDiveTest(t); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-card-alt hover:bg-white/20 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all duration-200 shrink-0"
                        >
                          <Search className="w-3 h-3" />
                          Deep Dive
                        </span>
                      ) : <span className="w-[86px] shrink-0" />}
                      <span className="text-xs text-muted-alt tabular-nums w-16 text-right shrink-0">{t.steps.length} steps</span>
                      <span className="flex items-center gap-0.5 shrink-0 tabular-nums text-xs w-28 justify-end">
                        <span className={`font-medium w-14 text-right ${getStepDuration(t) > 10000 ? "text-warning" : "text-card-alt"}`}>{fmt(getStepDuration(t))}</span>
                        <span className="text-muted-alt/60 w-14 text-right">{getHookDuration(t) > 500 ? `+${fmt(getHookDuration(t))}` : ""}</span>
                      </span>
                      <span className="text-muted-alt text-xs inline-block transition-transform duration-300 shrink-0" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </button>
                    <div className="grid" style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr", transition: "grid-template-rows 300ms ease-in-out" }}>
                      <div className="overflow-hidden" style={{ transition: "visibility 300ms", visibility: isExpanded ? "visible" : "hidden" }}>
                        <div className="px-4 pb-4 pt-1 bg-card border border-t-0 border-border rounded-b-lg -mt-1">
                          <StepTimeline steps={t.steps} maxDuration={maxStepDuration} suite={t.suite} />
                          {t.errors.length > 0 && (
                            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                              <div className="text-xs font-medium text-destructive mb-1">Error:</div>
                              <pre className="text-xs text-destructive/80 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{stripAnsi(t.errors[0])}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div> {/* main content */}
            </div> {/* flex row max-w-7xl */}
            </div> {/* scrollable area */}
          </>
        )}
      </div>

      {/* Deep Dive Overlay */}
      {deepDiveTest && <DeepDivePanel test={deepDiveTest} onClose={() => setDeepDiveTest(null)} />}
    </div>
  );
}
