import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const dbUrl = process.env.DATABASE_URL || "file:sqlite.db";
const isTurso = dbUrl.startsWith("libsql://");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: isTurso ? "turso" : "sqlite",
  dbCredentials: isTurso ? {
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  } : {
    url: dbUrl,
  },
});
