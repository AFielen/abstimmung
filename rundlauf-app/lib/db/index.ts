import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbType = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __rundlaufDb: DbType | undefined;
  var __rundlaufSql: ReturnType<typeof postgres> | undefined;
}

function build(): DbType {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt");
  }
  const client = postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  const drizzleDb = drizzle(client, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalThis.__rundlaufSql = client;
    globalThis.__rundlaufDb = drizzleDb;
  }
  return drizzleDb;
}

// Modul-lokales Singleton: In Produktion (kein globalThis-Cache) darf pro
// Prozess nur ein Client mit einem Connection-Pool existieren.
let dbSingleton: DbType | undefined;

function getDb(): DbType {
  if (!dbSingleton) dbSingleton = globalThis.__rundlaufDb ?? build();
  return dbSingleton;
}

// Proxy, damit Module-Top-Level-Imports nicht sofort eine Verbindung aufbauen
// (Next.js evaluiert Module beim Build, ohne DATABASE_URL → Crash).
export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop as string];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export { schema };
