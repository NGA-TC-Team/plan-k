import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DB_FILE_NAME ?? "./local.db",
  },
  verbose: true,
  strict: true,
});
