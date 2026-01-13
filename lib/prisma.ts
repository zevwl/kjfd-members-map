import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

// 1. Init Postgres Pool
const pool = new Pool({ connectionString });

// 2. Init Prisma Adapter
const adapter = new PrismaPg(pool);

// 3. Init Prisma Client with Adapter (and singleton pattern for Next.js hot-reloading)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
