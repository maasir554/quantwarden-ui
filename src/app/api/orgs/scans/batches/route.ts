import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgScanAccess } from "@/lib/org-scan-permissions";
import { getOrgScanActivity } from "@/lib/scan-batch-server";
import type { ScanBatchType } from "@/lib/scan-activity-types";

interface CreateBatchBody {
  orgId?: string;
  type?: ScanBatchType;
  assetIds?: string[];
}

interface ActiveLockRow {
  id: string;
  type: ScanBatchType;
}

const VALID_TYPES = new Set<ScanBatchType>(["single", "group", "full"]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CreateBatchBody;
    const orgId = body.orgId;
    const type = body.type;
    const assetIds = Array.isArray(body.assetIds) ? Array.from(new Set(body.assetIds.filter(Boolean))) : [];

    if (!orgId || !type || !VALID_TYPES.has(type) || assetIds.length === 0) {
      return NextResponse.json({ error: "Invalid batch payload." }, { status: 400 });
    }

    const scanAccess = await getOrgScanAccess(orgId, session.user.id);
    if (!scanAccess?.canScan) {
      return NextResponse.json({ error: "Forbidden: You do not have scan permission." }, { status: 403 });
    }

    const batchId = crypto.randomUUID();
    const now = new Date();
    const transactionResult = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`,
        orgId
      );

      const lockRows = await tx.$queryRawUnsafe<ActiveLockRow[]>(
        `SELECT b.id, b.type
         FROM "asset_scan_batch" b
         WHERE b."organizationId" = $1
           AND b.type IN ('group', 'full')
           AND b.status IN ('queued', 'running')
         ORDER BY b."createdAt" DESC
         LIMIT 1`,
        orgId
      );

      const lock = lockRows[0] ?? null;
      if (lock) {
        return {
          ok: false as const,
          status: 409,
          payload: {
            error: lock.type === "group"
              ? "A group scan is already running for this organization."
              : "A full scan is already running for this organization.",
            lockBatchId: lock.id,
            lockType: lock.type,
          },
        };
      }

      const assetRows = await tx.$queryRawUnsafe<{ id: string; value: string }[]>(
        `SELECT id, value
         FROM "asset"
         WHERE "organizationId" = $1
           AND type = 'domain'
           AND id = ANY($2::text[])
         ORDER BY value ASC`,
        orgId,
        assetIds
      );

      if (assetRows.length === 0) {
        return {
          ok: false as const,
          status: 400,
          payload: { error: "No scannable domain assets were selected." },
        };
      }

      const activeScanRows = await tx.$queryRawUnsafe<{ assetId: string }[]>(
        `SELECT DISTINCT s."assetId" as "assetId"
         FROM "asset_scan" s
         INNER JOIN "asset_scan_batch" b ON b.id = s."batchId"
         WHERE b."organizationId" = $1
           AND b.status IN ('queued', 'running')
           AND s."assetId" = ANY($2::text[])`,
        orgId,
        assetRows.map((asset) => asset.id)
      );

      const activeAssetIds = new Set(activeScanRows.map((row) => row.assetId));
      const batchAssets = assetRows.filter((asset) => !activeAssetIds.has(asset.id));

      if (batchAssets.length === 0) {
        return {
          ok: false as const,
          status: 409,
          payload: { error: "Those assets already have active scans in progress." },
        };
      }

      if (type === "single" && batchAssets.length !== 1) {
        return {
          ok: false as const,
          status: 400,
          payload: { error: "Single scan batches must contain exactly one asset." },
        };
      }

      if (type === "group" && batchAssets.length < 2) {
        return {
          ok: false as const,
          status: 400,
          payload: { error: "Group scans require at least two selected assets." },
        };
      }

      const scanIds = batchAssets.map(() => crypto.randomUUID());
      const scanAssetIds = batchAssets.map((asset) => asset.id);

      await tx.$executeRawUnsafe(
        `INSERT INTO "asset_scan_batch"
          (id, "organizationId", "initiatedByUserId", type, status, "totalAssets", "completedAssets", "failedAssets", "createdAt")
         VALUES ($1, $2, $3, $4, 'queued', $5, 0, 0, $6)`,
        batchId,
        orgId,
        session.user.id,
        type,
        batchAssets.length,
        now
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO "asset_scan" (id, "assetId", "batchId", type, status, "createdAt")
         SELECT scan_row.scan_id, scan_row.asset_id, $3, 'openssl', 'pending', $4
         FROM unnest($1::text[], $2::text[]) AS scan_row(scan_id, asset_id)`,
        scanIds,
        scanAssetIds,
        batchId,
        now
      );

      return {
        ok: true as const,
        queuedAssets: batchAssets.length,
      };
    }, {
      maxWait: 10_000,
      timeout: 15_000,
    });

    if (!transactionResult.ok) {
      return NextResponse.json(transactionResult.payload, { status: transactionResult.status });
    }

    const activity = await getOrgScanActivity(orgId, scanAccess.canScan);
    return NextResponse.json({
      success: true,
      batchId,
      batchType: type,
      queuedAssets: transactionResult.queuedAssets,
      activity,
    });
  } catch (error) {
    console.error("Create scan batch error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
