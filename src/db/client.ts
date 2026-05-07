import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const DB_FILE = process.env.DB_FILE_NAME ?? "./local.db";
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

const sqlite = new Database(DB_FILE);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle({ client: sqlite, schema });

migrate(db, { migrationsFolder: MIGRATIONS_DIR });

export { schema };
