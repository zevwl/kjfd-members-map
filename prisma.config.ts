import { defineConfig } from '@prisma/config';
import 'dotenv/config';

// Use a fallback to allow 'prisma generate' to run in build environments (like Vercel)
// where the real DB connection might not be available during the build phase.
const url = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";

export default defineConfig({
  datasource: {
    url,
  },
});
