
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db.js";

async function main() {
    console.log("Starting manual migration: Adding step1StartedAt column to investment_tickers...");

    const db = await getDb();
    if (!db) {
        console.error("Database connection failed");
        process.exit(1);
    }

    try {
        await db.run(sql`ALTER TABLE investment_tickers ADD COLUMN step1StartedAt INTEGER`);
        console.log("Successfully added step1StartedAt column.");
    } catch (e: any) {
        if (e.message?.includes("duplicate column name")) {
            console.log("Column step1StartedAt already exists. Skipping.");
        } else {
            console.error("Migration failed:", e);
            process.exit(1);
        }
    }

    console.log("Migration completed.");
    process.exit(0);
}

main();
