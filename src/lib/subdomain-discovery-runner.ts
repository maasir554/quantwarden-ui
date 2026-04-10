import { prisma } from "@/lib/prisma";

function getAssetType(value: string): "domain" | "ip" | "unknown" {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$/;
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (ipv4Regex.test(value) || ipv6Regex.test(value)) return "ip";
  if (domainRegex.test(value)) return "domain";
  return "unknown";
}

export interface RunSubdomainDiscoveryItemInput {
  orgId: string;
  assetId: string;
  scanId: string;
  batchId: string;
}

/**
 * Executes a single subdomain discovery scan item:
 * 1. Calls the Subfinder API for the root domain
 * 2. Upserts discovered subdomains as leaf asset rows
 * 3. Marks the scan item completed (or failed on error)
 * 4. Updates batch aggregate counters
 */
export async function runSubdomainDiscoveryItem(input: RunSubdomainDiscoveryItemInput): Promise<void> {
  const { orgId, assetId, scanId, batchId } = input;
  const now = new Date();

  // Mark scan item as running
  await prisma.$executeRawUnsafe(
    `UPDATE "asset_scan" SET status = 'running', "startedAt" = $1 WHERE id = $2`,
    now,
    scanId
  );

  // Fetch the root domain value
  const assetRows = await prisma.$queryRawUnsafe<{ value: string }[]>(
    `SELECT value FROM "asset" WHERE id = $1 AND "organizationId" = $2 LIMIT 1`,
    assetId,
    orgId
  );

  if (assetRows.length === 0) {
    await markScanFailed(scanId, batchId, "Asset not found", now);
    return;
  }

  const domain = assetRows[0].value;
  const subfinderUrl = process.env.SUBFINDER_API_URL || "http://127.0.0.1:8085";

  let subdomains: string[] = [];

  try {
    const response = await fetch(`${subfinderUrl}/subdomains`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
      signal: AbortSignal.timeout(240_000), // 4 min per domain
    });

    if (!response.ok) {
      throw new Error(`Subfinder returned ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const data: unknown = JSON.parse(text);

    if (Array.isArray(data)) {
      subdomains = data as string[];
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.subdomains)) subdomains = obj.subdomains as string[];
      else if (Array.isArray(obj.data)) subdomains = obj.data as string[];
      else if (Array.isArray(obj.result)) subdomains = obj.result as string[];
    }
  } catch (err: any) {
    await markScanFailed(scanId, batchId, `Subfinder failed: ${err?.message ?? String(err)}`, now);
    return;
  }

  // Filter and deduplicate
  const uniqueSubs = [...new Set(subdomains)]
    .filter((s) => typeof s === "string" && s.trim().length > 0 && s !== domain);

  // Upsert discovered subdomains as leaf assets
  for (const sub of uniqueSubs) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "asset" (id, value, type, "isRoot", "organizationId", verified, "openPorts", "createdAt", "parentId")
         VALUES ($1, $2, $3, false, $4, false, $5, $6, $7)
         ON CONFLICT (value, "organizationId") DO NOTHING`,
        crypto.randomUUID(),
        sub,
        getAssetType(sub),
        orgId,
        JSON.stringify([{ number: 443, protocol: "tcp" }]),
        now,
        assetId
      );
    } catch {
      // Skip duplicates / constraint violations
    }
  }

  // Update root asset lastScanDate
  await prisma.$executeRawUnsafe(
    `UPDATE "asset" SET "lastScanDate" = $1, "scanStatus" = 'idle' WHERE id = $2`,
    now,
    assetId
  );

  // Mark scan item completed
  await prisma.$executeRawUnsafe(
    `UPDATE "asset_scan" SET status = 'completed', "completedAt" = $1 WHERE id = $2`,
    now,
    scanId
  );

  // Update batch aggregate counters
  await updateBatchCounters(batchId);
}

async function markScanFailed(scanId: string, batchId: string, error: string, now: Date): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "asset_scan" SET status = 'failed', "completedAt" = $1, error = $2 WHERE id = $3`,
    now,
    error,
    scanId
  );
  await updateBatchCounters(batchId);
}

async function updateBatchCounters(batchId: string): Promise<void> {
  // Recompute completedAssets, failedAssets, and batch status from scan items
  await prisma.$executeRawUnsafe(`
    UPDATE "asset_scan_batch" b
    SET
      "completedAssets" = counts.completed,
      "failedAssets"    = counts.failed,
      status = CASE
        WHEN counts.pending + counts.running = 0 AND counts.failed > 0 AND counts.completed = 0 THEN 'failed'
        WHEN counts.pending + counts.running = 0 THEN 'completed'
        ELSE b.status
      END,
      "completedAt" = CASE
        WHEN counts.pending + counts.running = 0 THEN NOW()
        ELSE b."completedAt"
      END
    FROM (
      SELECT
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'failed'    THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'running'   THEN 1 ELSE 0 END) AS running
      FROM "asset_scan"
      WHERE "batchId" = $1
    ) counts
    WHERE b.id = $1
  `, batchId);
}
