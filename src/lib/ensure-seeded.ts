import { prisma } from "./prisma";
import { seedDatabase } from "./seed-database";

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = seedDatabase(prisma).then(() => undefined);
  return seedPromise;
}
