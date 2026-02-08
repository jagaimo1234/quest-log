
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db.js";
import { quests } from "../drizzle/schema.js";

async function main() {
    console.log("Starting manual migration: Adding displayOrder column...");

    const db = await getDb();
    if (!db) {
        console.error("Database connection failed");
        process.exit(1);
    }

    try {
        // Check if column exists logic is hard in pure SQL cross-db, 
        // but try-catch the add column is simplest for SQLite/LibSQL
        console.log("Executing ALTER TABLE...");

        // Using raw sql execution for ALTER TABLE
        // Drizzle's db.run is for compiled queries usually, but let's try db.run(sql`...`)

        await db.run(sql`ALTER TABLE quests ADD COLUMN displayOrder INTEGER DEFAULT 0 NOT NULL`);

        console.log("Successfully added displayOrder column.");
    } catch (e: any) {
        if (e.message?.includes("duplicate column name")) {
            console.log("Column displayOrder already exists. Skipping.");
        } else {
            console.error("Migration failed:", e);
            process.exit(1);
        }
    }

    console.log("Migration completed.");
    process.exit(0);
}

main();
