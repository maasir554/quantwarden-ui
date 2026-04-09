import { prisma } from "@/lib/prisma";
import { claimNextPendingScan, listOrganizationsWithActiveScanWork } from "@/lib/scan-batch-server";
import { runOpenSSLScanItem } from "@/lib/openssl-scan-runner";
import { runPortDiscoveryItem } from "@/lib/port-discovery-runner";
import { ensureScanSchedulingTables, runSchedulerMaintenanceCycle } from "@/lib/scan-schedule-server";
import type { ClaimedScanItem } from "@/lib/scan-batch-server";
import { loadWorkerConfig } from "./config";
import { logger } from "./logger";

const config = loadWorkerConfig();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const runningJobs = new Map<string, Promise<void>>();
let shuttingDown = false;

async function launchScanJob(orgId: string, claimed: ClaimedScanItem) {
  if (runningJobs.has(claimed.scanId)) {
    return;
  }

  const job = (async () => {
    try {
      logger.info("Executing scan item.", {
        orgId,
        scanId: claimed.scanId,
        batchId: claimed.batchId,
        engine: claimed.engine,
        assetId: claimed.assetId,
      });

      if (claimed.engine === "portDiscovery") {
        await runPortDiscoveryItem({
          orgId,
          assetId: claimed.assetId,
          scanId: claimed.scanId,
          batchId: claimed.batchId,
          configSnapshot: claimed.configSnapshot,
        });
      } else {
        await runOpenSSLScanItem({
          orgId,
          assetId: claimed.assetId,
          scanId: claimed.scanId,
          batchId: claimed.batchId,
        });
      }
    } catch (error: any) {
      logger.error("Scan item execution failed.", {
        orgId,
        scanId: claimed.scanId,
        batchId: claimed.batchId,
        engine: claimed.engine,
        message: error?.message || String(error),
      });
    } finally {
      runningJobs.delete(claimed.scanId);
    }
  })();

  runningJobs.set(claimed.scanId, job);
}

async function runExecutorTick() {
  const orgIds = await listOrganizationsWithActiveScanWork(config.activeOrgQueryLimit);

  for (const orgId of orgIds) {
    while (!shuttingDown) {
      const claimed = await claimNextPendingScan(orgId);
      if (!claimed) {
        break;
      }

      await launchScanJob(orgId, claimed);
    }
  }
}

async function runLoop(name: string, tickMs: number, fn: () => Promise<void>) {
  while (!shuttingDown) {
    const startedAt = Date.now();

    try {
      await fn();
    } catch (error: any) {
      logger.error(`${name} loop failed.`, {
        message: error?.message || String(error),
      });
    }

    if (shuttingDown) {
      break;
    }

    const elapsed = Date.now() - startedAt;
    await sleep(Math.max(250, tickMs - elapsed));
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.warn("Shutdown requested.", {
    signal,
    runningJobs: runningJobs.size,
  });

  if (runningJobs.size > 0) {
    await Promise.allSettled([...runningJobs.values()]);
  }

  await prisma.$disconnect().catch(() => undefined);
  process.exit(0);
}

async function main() {
  await ensureScanSchedulingTables();

  logger.info("Worker started.", {
    executorTickMs: config.executorTickMs,
    schedulerTickMs: config.schedulerTickMs,
    activeOrgQueryLimit: config.activeOrgQueryLimit,
  });

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection.", {
      message: reason instanceof Error ? reason.message : String(reason),
    });
  });
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception.", {
      message: error?.message || String(error),
    });
  });

  await Promise.all([
    runLoop("scheduler", config.schedulerTickMs, async () => {
      await runSchedulerMaintenanceCycle();
    }),
    runLoop("executor", config.executorTickMs, async () => {
      await runExecutorTick();
    }),
  ]);
}

void main().catch(async (error: any) => {
  logger.error("Worker boot failed.", {
    message: error?.message || String(error),
  });
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
