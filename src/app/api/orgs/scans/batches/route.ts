import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgScanAccess } from "@/lib/org-scan-permissions";
import { getOrgScanActivity } from "@/lib/scan-batch-server";
import { createScanBatch, isCreateScanBatchFailure } from "@/lib/scan-batch-create";
import type { ScanBatchType, ScanEngine } from "@/lib/scan-activity-types";

interface CreateBatchBody {
  orgId?: string;
  type?: ScanBatchType;
  engine?: ScanEngine;
  assetIds?: string[];
  configSnapshot?: unknown;
}

const VALID_TYPES = new Set<ScanBatchType>(["single", "group", "full"]);
const VALID_ENGINES = new Set<ScanEngine>(["openssl", "portDiscovery"]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: CreateBatchBody;
    try {
      const rawBody = await req.text();
      if (!rawBody.trim()) {
        return NextResponse.json({ error: "Missing batch payload." }, { status: 400 });
      }

      body = JSON.parse(rawBody) as CreateBatchBody;
    } catch {
      return NextResponse.json({ error: "Invalid batch payload." }, { status: 400 });
    }

    const orgId = body.orgId;
    const type = body.type;
    const engine = body.engine && VALID_ENGINES.has(body.engine) ? body.engine : "openssl";
    const assetIds = Array.isArray(body.assetIds) ? Array.from(new Set(body.assetIds.filter(Boolean))) : [];

    if (!orgId || !type || !VALID_TYPES.has(type) || assetIds.length === 0) {
      return NextResponse.json({ error: "Invalid batch payload." }, { status: 400 });
    }

    const scanAccess = await getOrgScanAccess(orgId, session.user.id);
    if (!scanAccess?.canScan) {
      return NextResponse.json({ error: "Forbidden: You do not have scan permission." }, { status: 403 });
    }

    const result = await createScanBatch({
      orgId,
      initiatedByUserId: session.user.id,
      type,
      engine,
      assetIds,
      configSnapshot: body.configSnapshot,
    });

    if (isCreateScanBatchFailure(result)) {
      return NextResponse.json(
        {
          error: result.error,
          lockBatchId: result.lockBatchId,
          lockEngine: result.lockEngine,
          lockType: result.lockType,
        },
        { status: result.status }
      );
    }

    const activity = await getOrgScanActivity(orgId, scanAccess.canScan);
    return NextResponse.json({
      success: true,
      batchId: result.batchId,
      batchType: type,
      queuedAssets: result.queuedAssets,
      activity,
    });
  } catch (error) {
    console.error("Create scan batch error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
