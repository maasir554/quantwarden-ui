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

    const dnsStateVal = searchParams.get("dnsState") || "";
    const timeoutOnlyVal = searchParams.get("timeoutOnly") || "";
    const selectedKexAlgos = (searchParams.get("kexAlgos") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const selectedKexGroups = (searchParams.get("kexGroups") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
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
         WHERE type = 'openssl'
          AND "assetId" = a."id"
          AND status IN ('completed', 'failed')
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
    const kexAlgorithmOptions = new Set<string>();
    const negotiatedGroupOptions = new Set<string>();

    for (const row of rows) {
      if (!row.resultData) continue;
      const parsed = parseOpenSSLScanResult(row.resultData);
      if (!parsed.summary) continue;
      if (parsed.summary.preferredCipher) cipherOptions.add(parsed.summary.preferredCipher);
      if (parsed.summary.negotiatedCipher) cipherOptions.add(parsed.summary.negotiatedCipher);
      for (const cipher of parsed.summary.cipherPreferenceOrder || []) {
        if (cipher) cipherOptions.add(cipher);
      }
      if (parsed.summary.primaryTlsVersion) tlsOptions.add(parsed.summary.primaryTlsVersion);
      for (const version of parsed.summary.supportedTlsVersions || []) {
        if (version) tlsOptions.add(version);
      }
      if (parsed.summary.publicKeyAlgorithm && parsed.summary.publicKeyBits) {
        keySizeOptions.add(`${parsed.summary.publicKeyAlgorithm} ${parsed.summary.publicKeyBits}-bit`);
      }
      for (const algorithm of parsed.summary.keyExchangeAlgorithms || []) {
        if (algorithm) kexAlgorithmOptions.add(algorithm);
      }
      if (parsed.summary.negotiatedGroup) negotiatedGroupOptions.add(parsed.summary.negotiatedGroup);
    }

    let filtered = [];

    for (const row of rows) {
      // 1. Text Search Filter
      if (searchVal && !row.assetName.toLowerCase().includes(searchVal)) {
        continue;
      }

      let parsed: ReturnType<typeof parseOpenSSLScanResult> | null = null;
      if (row.resultData) {
        parsed = parseOpenSSLScanResult(row.resultData);
      }

      const hasTimedOut = Boolean(parsed?.error && /timed out/i.test(parsed.error));

      if (timeoutOnlyVal === "true" && !hasTimedOut) {
        continue;
      }

      if (selectedKexAlgos.length > 0 || selectedKexGroups.length > 0) {
        if (!parsed?.summary) {
          continue;
        }

        if (selectedKexAlgos.length > 0) {
          const rowAlgos = new Set(parsed.summary.keyExchangeAlgorithms || []);
          const algoMatch = selectedKexAlgos.some((algo) => rowAlgos.has(algo));
          if (!algoMatch) {
            continue;
          }
        }

        if (selectedKexGroups.length > 0) {
          const rowGroups = new Set(parsed.summary.negotiatedGroup ? [parsed.summary.negotiatedGroup] : []);
          const groupMatch = selectedKexGroups.some((group) => rowGroups.has(group));
          if (!groupMatch) {
            continue;
          }
        }
      }

      // If no scan data but there is a structural filter, skip.
      if ((dnsStateVal || cipherVal || keySizeVal || tlsVal) && !parsed?.summary) {
        continue;
      }

      let summary = null;
      if (parsed?.summary) {
        const derived = parsed.summary;

        if (dnsStateVal === "found" && derived.dnsMissing) {
          continue;
        }

        if (dnsStateVal === "not_found" && !derived.dnsMissing) {
          continue;
        }

        // 2. Cipher Filter
        if (cipherVal) {
          const discoveredCipherSuites = new Set<string>([
            ...(derived.cipherPreferenceOrder || []),
            ...(derived.preferredCipher ? [derived.preferredCipher] : []),
            ...(derived.negotiatedCipher ? [derived.negotiatedCipher] : []),
          ]);
          if (!discoveredCipherSuites.has(cipherVal)) {
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
          const discoveredTlsVersions = new Set<string>([
            ...(derived.supportedTlsVersions || []),
            ...(derived.primaryTlsVersion ? [derived.primaryTlsVersion] : []),
          ]);
          if (!discoveredTlsVersions.has(tlsVal)) {
            continue;
          }
        }

        let isDnsMissing = derived.dnsMissing === true;
        let isInvalid = derived.certificateValid === false;
        let daysLeft = derived.daysRemaining;
        let isExpiring = typeof daysLeft === 'number' && daysLeft <= 30;
        let isVuln = derived.tlsVersionSecure === false;

        summary = {
           valid: !isDnsMissing && !isInvalid,
           dnsMissing: isDnsMissing,
           timedOut: hasTimedOut,
           daysRemaining: daysLeft,
           cipher: derived.preferredCipher,
           discoveredCiphers: derived.cipherPreferenceOrder || [],
           tls: derived.primaryTlsVersion,
           keySize: derived.publicKeyAlgorithm && derived.publicKeyBits
             ? `${derived.publicKeyAlgorithm} ${derived.publicKeyBits}-bit`
             : null,
           issue: isDnsMissing ? "DNS Expired" : isInvalid ? "Invalid Certificate" : isExpiring ? "Expiring Soon" : isVuln ? "TLS Vuln" : ""
        };
      } else if (hasTimedOut) {
        summary = {
          valid: false,
          dnsMissing: false,
          timedOut: true,
          daysRemaining: null,
          cipher: null,
          discoveredCiphers: [],
          tls: null,
          keySize: null,
          issue: "Scan Timeout",
        };
      }

      if (dnsStateVal === "found" && !summary) {
        continue;
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
        kexAlgorithms: [...kexAlgorithmOptions].sort(),
        kexGroups: [...negotiatedGroupOptions].sort(),
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to compile exploration data" }, { status: 500 });
  }
}
