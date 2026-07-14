import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/seed-database";

async function main() {
  const prisma = new PrismaClient();
  try {
    const seeded = await seedDatabase(prisma);
    if (!seeded) {
      console.log("Database already seeded, skipping import.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
