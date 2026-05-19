import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt");
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolve(here, "migrations");
  console.log(`[migrate] Verbinde mit Datenbank …`);
  const client = postgres(url, { max: 1 });
  try {
    const db = drizzle(client);
    console.log(`[migrate] Wende Migrationen aus ${migrationsFolder} an …`);
    await migrate(db, { migrationsFolder });
    console.log(`[migrate] Fertig.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[migrate] Fehler:", err);
  process.exit(1);
});
