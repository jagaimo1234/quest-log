
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db.js";

async function main() {
    console.log("Starting manual migration: Creating insight_feedback table...");

    const db = await getDb();
    if (!db) {
        console.error("Database connection failed");
        process.exit(1);
    }

    try {
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS insight_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                targetType TEXT NOT NULL,
                targetId INTEGER NOT NULL,
                content TEXT NOT NULL,
                createdAt INTEGER NOT NULL
            )
        `);
        console.log("Successfully created insight_feedback table.");
    } catch (e: any) {
        console.error("Migration failed:", e);
        process.exit(1);
    }

    console.log("Migration completed.");
    process.exit(0);
}

main();
