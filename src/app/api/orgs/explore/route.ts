import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { parseOpenSSLScanResult } from "@/lib/openssl-scan";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const member = await prisma.member.findFirst({
      where: { organizationId: orgId, userId: session.user.id }
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filterVal = searchParams.get("filter") || "";
    const cipherVal = searchParams.get("cipher") || "";
    const keySizeVal = searchParams.get("keySize") || "";
    const tlsVal = searchParams.get("tls") || "";
    const searchVal = (searchParams.get("search") || "").toLowerCase();

    // Fetch all assets with their latest scan for this org
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
          a."id" as "assetId", 
          a."value" as "assetName", 
          a."type" as "assetType",
          a."isRoot", 
          a."createdAt" as "addedAt",
          s."resultData",
          s."completedAt"
       FROM "asset" a
       LEFT JOIN LATERAL (
          SELECT "resultData", "completedAt" 
          FROM "asset_scan" 
          WHERE type = 'openssl' AND "assetId" = a."id"
          ORDER BY "completedAt" DESC 
          LIMIT 1
       ) s ON true
       WHERE a."organizationId" = $1
       ORDER BY a."createdAt" DESC`,
      orgId
    );

    // Pre-pass: collect available filter options from ALL scanned assets
    const cipherOptions = new Set<string>();
    const keySizeOptions = new Set<string>();
    const tlsOptions = new Set<string>();

    for (const row of rows) {
      if (!row.resultData) continue;
      const parsed = parseOpenSSLScanResult(row.resultData);
      if (!parsed.summary) continue;
      if (parsed.summary.preferredCipher) cipherOptions.add(parsed.summary.preferredCipher);
      if (parsed.summary.primaryTlsVersion) tlsOptions.add(parsed.summary.primaryTlsVersion);
      if (parsed.summary.publicKeyAlgorithm && parsed.summary.publicKeyBits) {
        keySizeOptions.add(`${parsed.summary.publicKeyAlgorithm} ${parsed.summary.publicKeyBits}-bit`);
      }
    }

    let filtered = [];

    for (const row of rows) {
      // 1. Text Search Filter
      if (searchVal && !row.assetName.toLowerCase().includes(searchVal)) {
        continue;
      }

      let parsed: any = null;
      if (row.resultData) {
        parsed = parseOpenSSLScanResult(row.resultData);
      }

      // If no scan data but there is a structural filter, skip (unless we want to see unscanned assets? For now, we only show what matches).
      if ((filterVal === "attention" || cipherVal || keySizeVal || tlsVal) && !parsed?.summary) {
        continue;
      }

      let summary = null;
      if (parsed?.summary) {
        const derived = parsed.summary;

        // 2. Cipher Filter
        if (cipherVal) {
          const cipherSuite = derived.preferredCipher || "";
          if (cipherSuite !== cipherVal) {
            continue;
          }
        }

        // 2b. Key Size Filter (e.g. "RSA 2048-bit")
        if (keySizeVal) {
          const actualKey = derived.publicKeyAlgorithm && derived.publicKeyBits
            ? `${derived.publicKeyAlgorithm} ${derived.publicKeyBits}-bit`
            : "";
          if (actualKey !== keySizeVal) {
            continue;
          }
        }

        // 2c. TLS Version Filter
        if (tlsVal) {
          const tlsVersion = derived.primaryTlsVersion || "";
          if (tlsVersion !== tlsVal) {
            continue;
          }
        }

        // 3. Immediate Attention Filter
        let isInvalid = derived.certificateValid === false;
        let daysLeft = derived.daysRemaining;
        let isExpiring = typeof daysLeft === 'number' && daysLeft <= 30;
        let isVuln = derived.tlsVersionSecure === false;

        if (filterVal === "attention") {
          if (!isInvalid && !isExpiring && !isVuln) {
            continue;
          }
        }

        summary = {
           valid: !isInvalid,
           daysRemaining: daysLeft,
           cipher: derived.preferredCipher,
           tls: derived.primaryTlsVersion,
           keySize: derived.publicKeyAlgorithm && derived.publicKeyBits
             ? `${derived.publicKeyAlgorithm} ${derived.publicKeyBits}-bit`
             : null,
           issue: isInvalid ? "Invalid Certificate" : isExpiring ? "Expiring Soon" : isVuln ? "TLS Vuln" : ""
        };
      }

      filtered.push({
        id: row.assetId,
        name: row.assetName,
        type: row.assetType,
        isRoot: row.isRoot,
        addedAt: row.addedAt,
        scanCompletedAt: row.completedAt,
        summary: summary
      });
    }

    // Limit returned array to 500 for performance/safety (client can handle pagination if needed later)
    return NextResponse.json({ 
      assets: filtered.slice(0, 500), 
      totalMatch: filtered.length,
      filterOptions: {
        ciphers: [...cipherOptions].sort(),
        keySizes: [...keySizeOptions].sort(),
        tlsVersions: [...tlsOptions].sort(),
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to compile exploration data" }, { status: 500 });
  }
}
