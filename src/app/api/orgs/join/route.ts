import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await req.json();

    if (!slug || slug.length < 3) {
      return NextResponse.json({ error: "Invalid organization code." }, { status: 400 });
    }

    // Find organization
    const orgRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "organization" WHERE slug = $1 LIMIT 1`,
      slug.toLowerCase()
    );

    if (orgRows.length === 0) {
      return NextResponse.json({ error: "Organization not found. Check the code and try again." }, { status: 404 });
    }
    const orgId = orgRows[0].id;

    // Check if user is already a member
    const memberRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "member" WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1`,
      orgId,
      session.user.id
    );

    if (memberRows.length > 0) {
      return NextResponse.json({ error: "You are already a member of this organization." }, { status: 400 });
    }

    // Add user as a member
    const newMemberId = crypto.randomUUID().replace(/-/g, "");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "member" (id, "organizationId", "userId", role, "createdAt") VALUES ($1, $2, $3, $4, $5)`,
      newMemberId,
      orgId,
      session.user.id,
      "member",
      new Date()
    );

    return NextResponse.json({ success: true, organizationId: orgId });
  } catch (error) {
    console.error("Join org error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
