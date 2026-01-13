import { defineConfig } from '@prisma/config';
import 'dotenv/config';

const url = process.env.DATABASE_URL;

if (!url) {
  // Config files run in the CLI context, so we can throw or warn
  throw new Error('DATABASE_URL is not set in environment variables.');
}

export default defineConfig({
  datasource: {
    url,
  },
});
