import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://rundlauf:rundlauf@localhost:5432/rundlauf",
  },
  strict: true,
  verbose: true,
} satisfies Config;
