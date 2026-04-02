import { prisma } from "@/lib/prisma";

export interface OrgScanAccess {
  memberId: string;
  roleId: string;
  roleName: string;
  canScan: boolean;
}

interface MemberPermissionRow {
  memberId: string;
  roleId: string;
  roleName: string;
  permissions: string | null;
}

function parseScanPermission(raw: string | null) {
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.scan);
  } catch {
    return false;
  }
}

export async function getOrgScanAccess(orgId: string, userId: string): Promise<OrgScanAccess | null> {
  const rows = await prisma.$queryRawUnsafe<MemberPermissionRow[]>(
    `SELECT
        m.id as "memberId",
        m.role as "roleId",
        COALESCE(r.name, m.role) as "roleName",
        r.permissions as permissions
      FROM "member" m
      LEFT JOIN "role" r
        ON r."organizationId" = m."organizationId"
       AND (r.id::text = m.role OR LOWER(r.name) = LOWER(m.role))
      WHERE m."organizationId" = $1 AND m."userId" = $2
      LIMIT 1`,
    orgId,
    userId
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  const isPrivileged = row.roleId === "owner" || row.roleId === "admin" || row.roleName === "owner" || row.roleName === "admin";

  return {
    memberId: row.memberId,
    roleId: row.roleId,
    roleName: row.roleName,
    canScan: isPrivileged || parseScanPermission(row.permissions),
  };
}
