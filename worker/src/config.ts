function parseIntEnv(name: string, fallback: number, bounds: { min: number; max: number }) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(bounds.max, Math.max(bounds.min, parsed));
}

export interface WorkerConfig {
  executorTickMs: number;
  schedulerTickMs: number;
  activeOrgQueryLimit: number;
}

export function loadWorkerConfig(): WorkerConfig {
  return {
    executorTickMs: parseIntEnv("SCAN_WORKER_EXECUTOR_TICK_MS", 1500, { min: 250, max: 60000 }),
    schedulerTickMs: parseIntEnv("SCAN_WORKER_SCHEDULER_TICK_MS", 10000, { min: 1000, max: 300000 }),
    activeOrgQueryLimit: parseIntEnv("SCAN_WORKER_ACTIVE_ORG_LIMIT", 100, { min: 1, max: 1000 }),
  };
}
