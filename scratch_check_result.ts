import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const latestScan = await prisma.$queryRawUnsafe(`
    SELECT "resultData"
    FROM "asset_scan" s
    JOIN "asset_scan_batch" b on b.id = s."batchId"
    WHERE b.engine = 'subdomainDiscovery'
    ORDER BY s."completedAt" DESC NULLS LAST
    LIMIT 1
  `);
  console.log("Latest scan resultData:", latestScan);
}
main();
