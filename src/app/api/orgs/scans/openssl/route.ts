import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId, orgId } = await req.json();

    if (!assetId || !orgId) {
      return NextResponse.json({ error: "Missing config fields" }, { status: 400 });
    }

    const memberRows = await prisma.$queryRawUnsafe<{ role: string }[]>(
      `SELECT role FROM "member" WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1`,
      orgId,
      session.user.id
    );

    if (memberRows.length === 0 || (memberRows[0].role !== "owner" && memberRows[0].role !== "admin")) {
      return NextResponse.json({ error: "Forbidden: Only owners and admins can trigger scans." }, { status: 403 });
    }

    const assetRows = await prisma.$queryRawUnsafe<{ value: string; type: string }[]>(
      `SELECT value, type FROM "asset" WHERE id = $1 AND "organizationId" = $2 LIMIT 1`,
      assetId,
      orgId
    );

    if (!assetRows.length) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const asset = assetRows[0];
    if (asset.type !== "domain") {
      return NextResponse.json({ error: "OpenSSL scans currently support domain assets only." }, { status: 400 });
    }

    const scanId = crypto.randomUUID();

    await prisma.$transaction([
      prisma.$executeRawUnsafe(
        `UPDATE "asset" SET "scanStatus" = 'scanning' WHERE id = $1`,
        assetId
      ),
      prisma.$executeRawUnsafe(
        `INSERT INTO "asset_scan" (id, "assetId", type, status, "createdAt") VALUES ($1, $2, 'openssl', 'pending', $3)`,
        scanId,
        assetId,
        new Date()
      ),
    ]);

    try {
      const opensslUrl = process.env.OPENSSL_API_URL || "http://127.0.0.1:8020";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${opensslUrl}/api/v1/openssl-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: asset.value,
          port: 443,
          timeout_seconds: 25,
          include_raw_debug: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const rawResult = await response.text();
      let parsed: unknown = null;

      try {
        parsed = JSON.parse(rawResult);
      } catch {}

      if (!response.ok) {
        const failurePayload = typeof parsed === "object" && parsed !== null
          ? JSON.stringify(parsed)
          : JSON.stringify({ error: rawResult || "OpenSSL scan failed." });

        await prisma.$transaction([
          prisma.$executeRawUnsafe(
            `UPDATE "asset_scan" SET type = 'openssl', status = 'failed', "resultData" = $1, "completedAt" = $2 WHERE id = $3`,
            failurePayload,
            new Date(),
            scanId
          ),
          prisma.$executeRawUnsafe(
            `UPDATE "asset" SET "scanStatus" = 'failed', "lastScanDate" = $1 WHERE id = $2`,
            new Date(),
            assetId
          ),
        ]);

        return NextResponse.json({ success: true, scanId, status: "failed", data: parsed });
      }

      await prisma.$transaction([
        prisma.$executeRawUnsafe(
          `UPDATE "asset_scan" SET type = 'openssl', status = 'completed', "resultData" = $1, "completedAt" = $2 WHERE id = $3`,
          rawResult,
          new Date(),
          scanId
        ),
        prisma.$executeRawUnsafe(
          `UPDATE "asset" SET "scanStatus" = 'completed', "lastScanDate" = $1 WHERE id = $2`,
          new Date(),
          assetId
        ),
      ]);

      return NextResponse.json({ success: true, scanId, status: "completed", data: parsed });
    } catch (error: any) {
      const failurePayload = JSON.stringify({
        error: error?.name === "AbortError"
          ? "OpenSSL scan timed out before the target completed negotiation."
          : error?.message || "Failed execution",
      });

      await prisma.$transaction([
        prisma.$executeRawUnsafe(
          `UPDATE "asset_scan" SET type = 'openssl', status = 'failed', "resultData" = $1, "completedAt" = $2 WHERE id = $3`,
          failurePayload,
          new Date(),
          scanId
        ),
        prisma.$executeRawUnsafe(
          `UPDATE "asset" SET "scanStatus" = 'failed', "lastScanDate" = $1 WHERE id = $2`,
          new Date(),
          assetId
        ),
      ]);

      return NextResponse.json({ error: error?.message || "Failed execution" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
