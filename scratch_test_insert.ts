import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rs = await prisma.$queryRawUnsafe(
    `SELECT 1 as "num"`
  );
  console.log("Select result:", rs);

  // Note: Replace with some safe values
  try {
    const inserted = await prisma.$queryRawUnsafe(
        `INSERT INTO "asset" (id, value, type, "isRoot", "organizationId", verified, "createdAt")
         VALUES ($1, $2, $3, false, $4, false, NOW())
         ON CONFLICT ("organizationId", value) DO NOTHING
         RETURNING id`,
        "test-id-1234",
        "temp-sub.example.com",
        "domain",
        "test-org"
    );
    console.log("Insert result (new):", inserted);

    const inserted2 = await prisma.$queryRawUnsafe(
        `INSERT INTO "asset" (id, value, type, "isRoot", "organizationId", verified, "createdAt")
         VALUES ($1, $2, $3, false, $4, false, NOW())
         ON CONFLICT ("organizationId", value) DO NOTHING
         RETURNING id`,
        "test-id-1235",
        "temp-sub.example.com",
        "domain",
        "test-org"
    );
    console.log("Insert result (conflict):", inserted2);
    
    // cleanup
    await prisma.$executeRawUnsafe(`DELETE FROM "asset" WHERE id = $1`, "test-id-1234");
  } catch(e) {
    console.error("Error:", e);
  }
}

main();
