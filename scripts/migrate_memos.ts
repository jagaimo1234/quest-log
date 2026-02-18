import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db.js";

async function main() {
    console.log("Starting migration: Creating memos table...");

    const db = await getDb();
    if (!db) {
        console.error("Database connection failed");
        process.exit(1);
    }

    try {
        await db.run(sql`CREATE TABLE IF NOT EXISTS memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            content TEXT NOT NULL,
            createdAt INTEGER NOT NULL DEFAULT (unixepoch())
        )`);
        console.log("Successfully created memos table.");
    } catch (e: any) {
        console.error("Migration failed:", e);
        process.exit(1);
    }

    console.log("Migration completed.");
    process.exit(0);
}

main();
