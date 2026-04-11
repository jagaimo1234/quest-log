
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db.js";

async function main() {
    console.log("Starting manual migration: Creating investment_tickers table...");

    const db = await getDb();
    if (!db) {
        console.error("Database connection failed");
        process.exit(1);
    }

    try {
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS investment_tickers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                ticker TEXT NOT NULL,
                step1 TEXT NOT NULL DEFAULT 'unstarted',
                step2 TEXT NOT NULL DEFAULT 'unstarted',
                step3 TEXT NOT NULL DEFAULT 'unstarted',
                step4 TEXT NOT NULL DEFAULT 'unstarted',
                step5 TEXT NOT NULL DEFAULT 'unstarted',
                step6 TEXT NOT NULL DEFAULT 'unstarted',
                step7 TEXT NOT NULL DEFAULT 'unstarted',
                stopLossText TEXT NOT NULL DEFAULT '-5%',
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL
            )
        `);
        console.log("Successfully created investment_tickers table.");
    } catch (e: any) {
        if (e.message?.includes("already exists")) {
            console.log("Table investment_tickers already exists. Skipping.");
        } else {
            console.error("Migration failed:", e);
            process.exit(1);
        }
    }

    console.log("Migration completed.");
    process.exit(0);
}

main();
