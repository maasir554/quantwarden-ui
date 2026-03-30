import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const memberRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "member" WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1`,
      orgId,
      session.user.id
    );

    if (memberRows.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let assets: any[] = [];
    try {
      assets = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, value, type, "isRoot", "parentId", "createdAt", "scanStatus", "lastScanDate" FROM "asset" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC`,
        orgId
      );
    } catch(err) {
      assets = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, value, type, "isRoot", "parentId", "createdAt" FROM "asset" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC`,
        orgId
      );
    }

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Asset fetch error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, value, type, isRoot, parentId } = await req.json();

    if (!orgId || !value) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify permissions (admin or owner required to add assets)
    const memberRows = await prisma.$queryRawUnsafe<{ role: string }[]>(
      `SELECT role FROM "member" WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1`,
      orgId,
      session.user.id
    );

    if (memberRows.length === 0 || (memberRows[0].role !== "owner" && memberRows[0].role !== "admin")) {
      return NextResponse.json({ error: "Forbidden: Only owners and admins can add assets." }, { status: 403 });
    }

    const assetId = crypto.randomUUID();
    let query = "";
    const params: any[] = [assetId, value, type, isRoot, orgId, false, new Date()];
    
    if (parentId) {
      query = `INSERT INTO "asset" (id, value, type, "isRoot", "organizationId", verified, "createdAt", "parentId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
      params.push(parentId);
    } else {
      query = `INSERT INTO "asset" (id, value, type, "isRoot", "organizationId", verified, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    }

    try {
      await prisma.$executeRawUnsafe(query, ...params);
    } catch (dbError: any) {
      // Ignore unique constraint violation, meaning it's already there
      if (dbError.code !== 'P2002' && !dbError.message?.includes('unique constraint')) {
        throw dbError;
      }
    }

    return NextResponse.json({ success: true, asset: { id: assetId } });
  } catch (error) {
    console.error("Asset insert error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const orgId = searchParams.get("orgId");

    if (!id || !orgId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify permissions (admin or owner required to remove assets)
    const memberRows = await prisma.$queryRawUnsafe<{ role: string }[]>(
      `SELECT role FROM "member" WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1`,
      orgId,
      session.user.id
    );

    if (memberRows.length === 0 || (memberRows[0].role !== "owner" && memberRows[0].role !== "admin")) {
      return NextResponse.json({ error: "Forbidden: Only owners and admins can remove assets." }, { status: 403 });
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "asset" WHERE id = $1 AND "organizationId" = $2`, id, orgId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Asset delete error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
