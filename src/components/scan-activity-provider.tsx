"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  Loader2,
  Radar,
} from "lucide-react";

const STORAGE_KEY = "quantwarden-openssl-scan-activity-v1";
const CHANNEL_NAME = "quantwarden-openssl-scan-activity";
const MAX_CONCURRENT_SCANS = 3;
const POLL_INTERVAL_MS = 4000;
const RUNNING_RECOVERY_MS = 30000;
const RETAIN_COMPLETED_TASKS = 20;

type TaskStatus = "queued" | "running" | "completed" | "failed";
type FullScanStatus = "running" | "completed";

export interface ScanActivityTask {
  id: string;
  orgId: string;
  orgSlug: string;
  assetId: string;
  assetValue: string;
  source: "manual" | "full-scan";
  fullScanId?: string | null;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  scanId?: string | null;
  error?: string | null;
}

export interface FullScanOperation {
  id: string;
  orgId: string;
  orgSlug: string;
  status: FullScanStatus;
  createdAt: string;
  completedAt?: string | null;
  totalAssets: number;
}

interface ScanActivityState {
  tasks: ScanActivityTask[];
  fullScans: FullScanOperation[];
  monitorCollapsed: boolean;
}

interface QueueScanInput {
  orgId: string;
  orgSlug: string;
  assetId: string;
  assetValue: string;
}

interface QueueFullScanInput {
  orgId: string;
  orgSlug: string;
  assets: Array<{ id: string; value: string }>;
}

interface OrgScanActivity {
  tasks: ScanActivityTask[];
  activeTasks: ScanActivityTask[];
  runningTasks: ScanActivityTask[];
  queuedTasks: ScanActivityTask[];
  recentTasks: ScanActivityTask[];
  fullScan: FullScanOperation | null;
  isFullScanActive: boolean;
}

interface ScanActivityContextValue {
  hydrated: boolean;
  stateVersion: number;
  monitorCollapsed: boolean;
  setMonitorCollapsed: (collapsed: boolean) => void;
  queueAssetScan: (input: QueueScanInput) => boolean;
  queueFullScan: (input: QueueFullScanInput) => boolean;
  getOrgActivity: (orgId: string) => OrgScanActivity;
}

interface PersistedScansResponse {
  assets?: Array<{
    id: string;
    value: string;
    scanStatus?: string | null;
    latestScan?: {
      id: string;
      status: "pending" | "completed" | "failed";
      createdAt: string;
      completedAt: string | null;
    } | null;
  }>;
}

const defaultState: ScanActivityState = {
  tasks: [],
  fullScans: [],
  monitorCollapsed: false,
};

const ScanActivityContext = createContext<ScanActivityContextValue | null>(null);

function dedupeTasks(tasks: ScanActivityTask[]) {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}

function sortTasks(tasks: ScanActivityTask[]) {
  return [...tasks].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return rightTime - leftTime;
  });
}

function pruneTasks(tasks: ScanActivityTask[]) {
  const active = tasks.filter((task) => task.status === "queued" || task.status === "running");
  const completed = tasks
    .filter((task) => task.status === "completed" || task.status === "failed")
    .sort((left, right) => {
      const leftTime = new Date(left.completedAt || left.createdAt).getTime();
      const rightTime = new Date(right.completedAt || right.createdAt).getTime();
      return rightTime - leftTime;
    })
    .slice(0, RETAIN_COMPLETED_TASKS);

  return sortTasks(dedupeTasks([...active, ...completed]));
}

function deriveFullScans(tasks: ScanActivityTask[], fullScans: FullScanOperation[]) {
  return fullScans
    .map((operation) => {
      const scopedTasks = tasks.filter((task) => task.fullScanId === operation.id);
      if (scopedTasks.length === 0) {
        return operation.status === "completed" ? operation : null;
      }

      const hasActive = scopedTasks.some((task) => task.status === "queued" || task.status === "running");
      return {
        ...operation,
        status: hasActive ? "running" : "completed",
        completedAt: hasActive ? null : operation.completedAt || new Date().toISOString(),
        totalAssets: Math.max(operation.totalAssets, scopedTasks.length),
      };
    })
    .filter((operation): operation is FullScanOperation => operation !== null)
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 10);
}

function readStoredState(): ScanActivityState {
  if (typeof window === "undefined") return defaultState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<ScanActivityState>;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      fullScans: Array.isArray(parsed.fullScans) ? parsed.fullScans : [],
      monitorCollapsed: Boolean(parsed.monitorCollapsed),
    };
  } catch {
    return defaultState;
  }
}

function persistState(state: ScanActivityState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function orgFromPathname(pathname: string | null) {
  if (!pathname) return null;
  const match = pathname.match(/^\/app\/([^/]+)/);
  return match ? match[1] : null;
}

export function ScanActivityProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<ScanActivityState>(defaultState);
  const [stateVersion, setStateVersion] = useState(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const stored = readStoredState();
    const normalized: ScanActivityState = {
      ...stored,
      tasks: pruneTasks(stored.tasks || []),
      fullScans: deriveFullScans(stored.tasks || [], stored.fullScans || []),
    };
    setState(normalized);
    setHydrated(true);

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (event) => {
        if (!event.data) return;
        const incoming = event.data as ScanActivityState;
        setState({
          tasks: pruneTasks(incoming.tasks || []),
          fullScans: deriveFullScans(incoming.tasks || [], incoming.fullScans || []),
          monitorCollapsed: Boolean(incoming.monitorCollapsed),
        });
        setStateVersion((version) => version + 1);
      };
      return () => {
        channel.close();
        channelRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const incoming = JSON.parse(event.newValue) as ScanActivityState;
        setState({
          tasks: pruneTasks(incoming.tasks || []),
          fullScans: deriveFullScans(incoming.tasks || [], incoming.fullScans || []),
          monitorCollapsed: Boolean(incoming.monitorCollapsed),
        });
        setStateVersion((version) => version + 1);
      } catch {}
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const updateState = useCallback((updater: (previous: ScanActivityState) => ScanActivityState) => {
    setState((previous) => {
      const next = updater(previous);
      const normalized: ScanActivityState = {
        tasks: pruneTasks(next.tasks),
        fullScans: deriveFullScans(next.tasks, next.fullScans),
        monitorCollapsed: next.monitorCollapsed,
      };
      persistState(normalized);
      channelRef.current?.postMessage(normalized);
      return normalized;
    });
    setStateVersion((version) => version + 1);
  }, []);

  const queueAssetScan = useCallback((input: QueueScanInput) => {
    let queued = false;

    updateState((previous) => {
      const duplicate = previous.tasks.some(
        (task) =>
          task.orgId === input.orgId &&
          task.assetId === input.assetId &&
          (task.status === "queued" || task.status === "running")
      );

      if (duplicate) return previous;

      queued = true;
      return {
        ...previous,
        tasks: [
          {
            id: crypto.randomUUID(),
            orgId: input.orgId,
            orgSlug: input.orgSlug,
            assetId: input.assetId,
            assetValue: input.assetValue,
            source: "manual",
            status: "queued",
            createdAt: new Date().toISOString(),
          },
          ...previous.tasks,
        ],
      };
    });

    return queued;
  }, [updateState]);

  const queueFullScan = useCallback((input: QueueFullScanInput) => {
    let queued = false;

    updateState((previous) => {
      const existingFullScan = previous.fullScans.find(
        (operation) => operation.orgId === input.orgId && operation.status === "running"
      );

      if (existingFullScan) return previous;

      const fullScanId = crypto.randomUUID();
      const newTasks = input.assets
        .filter((asset) => {
          return !previous.tasks.some(
            (task) =>
              task.orgId === input.orgId &&
              task.assetId === asset.id &&
              (task.status === "queued" || task.status === "running")
          );
        })
        .map<ScanActivityTask>((asset) => ({
          id: crypto.randomUUID(),
          orgId: input.orgId,
          orgSlug: input.orgSlug,
          assetId: asset.id,
          assetValue: asset.value,
          source: "full-scan",
          fullScanId,
          status: "queued",
          createdAt: new Date().toISOString(),
        }));

      if (newTasks.length === 0) return previous;

      queued = true;

      return {
        ...previous,
        tasks: [...newTasks, ...previous.tasks],
        fullScans: [
          {
            id: fullScanId,
            orgId: input.orgId,
            orgSlug: input.orgSlug,
            status: "running",
            createdAt: new Date().toISOString(),
            totalAssets: newTasks.length,
          },
          ...previous.fullScans,
        ],
      };
    });

    return queued;
  }, [updateState]);

  const processTask = useCallback(async (task: ScanActivityTask) => {
    if (inFlightRef.current.has(task.id)) return;
    inFlightRef.current.add(task.id);

    updateState((previous) => ({
      ...previous,
      tasks: previous.tasks.map((existing) =>
        existing.id === task.id
          ? { ...existing, status: "running", startedAt: new Date().toISOString(), error: null }
          : existing
      ),
    }));

    try {
      const response = await fetch("/api/orgs/scans/openssl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: task.assetId, orgId: task.orgId }),
      });

      const data = await response.json().catch(() => ({}));
      const status: TaskStatus =
        response.ok && data?.status === "completed"
          ? "completed"
          : data?.status === "failed"
            ? "failed"
            : response.ok
              ? "completed"
              : "failed";

      updateState((previous) => ({
        ...previous,
        tasks: previous.tasks.map((existing) =>
          existing.id === task.id
            ? {
                ...existing,
                status,
                scanId: typeof data?.scanId === "string" ? data.scanId : existing.scanId,
                completedAt: new Date().toISOString(),
                error: status === "failed" ? data?.error || data?.data?.error || "Scan failed." : null,
              }
            : existing
        ),
      }));
    } catch (error: any) {
      updateState((previous) => ({
        ...previous,
        tasks: previous.tasks.map((existing) =>
          existing.id === task.id
            ? {
                ...existing,
                status: "failed",
                completedAt: new Date().toISOString(),
                error: error?.message || "Scan failed.",
              }
            : existing
        ),
      }));
    } finally {
      inFlightRef.current.delete(task.id);
    }
  }, [updateState]);

  useEffect(() => {
    if (!hydrated) return;

    const runningCount = state.tasks.filter((task) => task.status === "running").length;
    const availableSlots = Math.max(0, MAX_CONCURRENT_SCANS - runningCount);
    if (availableSlots === 0) return;

    const queuedTasks = state.tasks.filter((task) => task.status === "queued");
    if (queuedTasks.length === 0) return;

    queuedTasks.slice(0, availableSlots).forEach((task) => {
      void processTask(task);
    });
  }, [hydrated, state.tasks, processTask]);

  useEffect(() => {
    if (!hydrated) return;

    const activeOrgIds = Array.from(
      new Set(
        state.tasks
          .filter((task) => task.status === "queued" || task.status === "running")
          .map((task) => task.orgId)
      )
    );

    if (activeOrgIds.length === 0) return;

    const interval = window.setInterval(async () => {
      for (const orgId of activeOrgIds) {
        try {
          const response = await fetch(`/api/orgs/scans?orgId=${orgId}`, { cache: "no-store" });
          if (!response.ok) continue;
          const data = (await response.json()) as PersistedScansResponse;
          const assetMap = new Map((data.assets || []).map((asset) => [asset.id, asset]));

          updateState((previous) => {
            const now = Date.now();
            const tasks: ScanActivityTask[] = previous.tasks.map((task): ScanActivityTask => {
              if (task.orgId !== orgId || (task.status !== "running" && task.status !== "queued")) {
                return task;
              }

              const asset = assetMap.get(task.assetId);
              const latestScan = asset?.latestScan;
              const taskStartedAt = task.startedAt ? new Date(task.startedAt).getTime() : 0;
              const latestCreatedAt = latestScan?.createdAt ? new Date(latestScan.createdAt).getTime() : 0;

              if (task.status === "queued") return task;

              if (latestScan?.status === "completed" && latestCreatedAt >= taskStartedAt) {
                return {
                  ...task,
                  status: "completed",
                  scanId: latestScan.id,
                  completedAt: latestScan.completedAt || new Date().toISOString(),
                  error: null,
                };
              }

              if (latestScan?.status === "failed" && latestCreatedAt >= taskStartedAt) {
                return {
                  ...task,
                  status: "failed",
                  scanId: latestScan.id,
                  completedAt: latestScan.completedAt || new Date().toISOString(),
                  error: task.error || "Scan failed.",
                };
              }

              if (latestScan?.status === "pending" || asset?.scanStatus === "scanning") {
                return task;
              }

              if (task.startedAt && now - taskStartedAt > RUNNING_RECOVERY_MS) {
                return {
                  ...task,
                  status: "queued",
                  startedAt: null,
                  error: "Recovered after reload. Re-queuing scan.",
                };
              }

              return task;
            });

            return { ...previous, tasks };
          });
        } catch {
          continue;
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [hydrated, state.tasks, updateState]);

  const setMonitorCollapsed = useCallback((collapsed: boolean) => {
    updateState((previous) => ({ ...previous, monitorCollapsed: collapsed }));
  }, [updateState]);

  const getOrgActivity = useCallback((orgId: string): OrgScanActivity => {
    const tasks = state.tasks
      .filter((task) => task.orgId === orgId)
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();
        return rightTime - leftTime;
      });

    const fullScan =
      state.fullScans.find((operation) => operation.orgId === orgId && operation.status === "running") ||
      state.fullScans.find((operation) => operation.orgId === orgId) ||
      null;

    return {
      tasks,
      activeTasks: tasks.filter((task) => task.status === "queued" || task.status === "running"),
      runningTasks: tasks.filter((task) => task.status === "running"),
      queuedTasks: tasks.filter((task) => task.status === "queued"),
      recentTasks: tasks.filter((task) => task.status === "completed" || task.status === "failed").slice(0, 8),
      fullScan,
      isFullScanActive: Boolean(fullScan && fullScan.status === "running"),
    };
  }, [state.fullScans, state.tasks]);

  const currentOrgSlug = orgFromPathname(pathname);
  const currentOrgActivity = useMemo(() => {
    if (!currentOrgSlug) return null;
    const orgTask = state.tasks.find((task) => task.orgSlug === currentOrgSlug);
    const orgFullScan = state.fullScans.find((operation) => operation.orgSlug === currentOrgSlug);
    const orgId = orgTask?.orgId || orgFullScan?.orgId;
    return orgId ? getOrgActivity(orgId) : null;
  }, [currentOrgSlug, getOrgActivity, state.fullScans, state.tasks]);

  const contextValue = useMemo<ScanActivityContextValue>(() => ({
    hydrated,
    stateVersion,
    monitorCollapsed: state.monitorCollapsed,
    setMonitorCollapsed,
    queueAssetScan,
    queueFullScan,
    getOrgActivity,
  }), [getOrgActivity, hydrated, queueAssetScan, queueFullScan, setMonitorCollapsed, state.monitorCollapsed, stateVersion]);

  const showMonitor = Boolean(currentOrgSlug && currentOrgActivity && currentOrgActivity.tasks.length > 0);

  return (
    <ScanActivityContext.Provider value={contextValue}>
      {children}

      {showMonitor && currentOrgActivity && (
        <div className="pointer-events-none fixed inset-y-24 right-4 z-50 hidden lg:flex items-start">
          <div className="pointer-events-auto flex">
            {state.monitorCollapsed ? (
              <button
                onClick={() => setMonitorCollapsed(false)}
                className="rounded-l-2xl rounded-r-lg border border-amber-500/20 bg-white/90 px-3 py-4 shadow-lg backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 text-[#3d200a]">
                  <Activity className="h-4 w-4 text-[#8B0000]" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {currentOrgActivity.runningTasks.length + currentOrgActivity.queuedTasks.length} active
                  </span>
                  <ChevronLeft className="h-4 w-4" />
                </div>
              </button>
            ) : (
              <aside className="w-[340px] rounded-3xl border border-amber-500/20 bg-white/88 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-amber-500/10 px-4 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a5d33]/55">Scan Activity</p>
                    <h3 className="text-sm font-black text-[#3d200a]">
                      {currentOrgActivity.runningTasks.length} running, {currentOrgActivity.queuedTasks.length} queued
                    </h3>
                  </div>
                  <button
                    onClick={() => setMonitorCollapsed(true)}
                    className="rounded-xl p-2 text-[#8a5d33] transition-colors hover:bg-amber-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {currentOrgActivity.fullScan && (
                  <div className="border-b border-amber-500/10 px-4 py-3">
                    <div className="rounded-2xl bg-amber-50/80 p-3">
                      <div className="flex items-center gap-2">
                        <Radar className={`h-4 w-4 ${currentOrgActivity.isFullScanActive ? "text-amber-600 animate-pulse" : "text-emerald-600"}`} />
                        <p className="text-xs font-black uppercase tracking-widest text-[#8a5d33]/60">
                          Full Scan {currentOrgActivity.isFullScanActive ? "Running" : "Completed"}
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-bold text-[#3d200a]">
                        {currentOrgActivity.fullScan.totalAssets} assets in this batch
                      </p>
                    </div>
                  </div>
                )}

                <div className="max-h-[68vh] overflow-y-auto p-4 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Loader2 className={`h-4 w-4 ${currentOrgActivity.activeTasks.some((task) => task.status === "running") ? "animate-spin text-amber-600" : "text-[#8a5d33]/50"}`} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a5d33]/55">Running & Queued</p>
                    </div>
                    <div className="space-y-2">
                      {currentOrgActivity.activeTasks.map((task) => (
                        <div key={task.id} className="rounded-2xl border border-amber-500/10 bg-[#fdf8f0]/65 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[#3d200a]">{task.assetValue}</p>
                              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-[#8a5d33]/55">
                                {task.source === "full-scan" ? "Full Scan" : "Manual"}
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                              task.status === "running"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          {task.error && (
                            <p className="mt-2 text-xs font-semibold text-amber-700">{task.error}</p>
                          )}
                        </div>
                      ))}

                      {currentOrgActivity.activeTasks.length === 0 && (
                        <p className="text-sm font-semibold text-[#8a5d33]/60">No active scans right now.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <ListTodo className="h-4 w-4 text-[#8a5d33]/55" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a5d33]/55">Recent</p>
                    </div>
                    <div className="space-y-2">
                      {currentOrgActivity.recentTasks.map((task) => (
                        <div key={task.id} className="rounded-2xl border border-amber-500/10 bg-white/75 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[#3d200a]">{task.assetValue}</p>
                              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#8a5d33]/60">
                                <Clock3 className="h-3.5 w-3.5" />
                                {task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : new Date(task.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                              task.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          {task.error && (
                            <p className="mt-2 text-xs font-semibold text-red-700">{task.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </ScanActivityContext.Provider>
  );
}

export function useScanActivity(orgId: string) {
  const context = useContext(ScanActivityContext);
  if (!context) {
    throw new Error("useScanActivity must be used within ScanActivityProvider");
  }

  return {
    hydrated: context.hydrated,
    stateVersion: context.stateVersion,
    monitorCollapsed: context.monitorCollapsed,
    setMonitorCollapsed: context.setMonitorCollapsed,
    queueAssetScan: context.queueAssetScan,
    queueFullScan: context.queueFullScan,
    ...context.getOrgActivity(orgId),
  };
}
