import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db.js";

async function main() {
    console.log("Starting migration: KAIZEN MEMO v2 (action + likes columns)...");

    const db = await getDb();
    if (!db) {
        console.error("Database connection failed");
        process.exit(1);
    }

    try {
        // 1. Add action column to memos table
        try {
            await db.run(sql`ALTER TABLE memos ADD COLUMN action TEXT`);
            console.log("✅ Added 'action' column to memos table.");
        } catch (e: any) {
            if (e.message?.includes("duplicate column")) {
                console.log("⏭️ 'action' column already exists in memos.");
            } else {
                throw e;
            }
        }

        // 2. Add likes column to memos table
        try {
            await db.run(sql`ALTER TABLE memos ADD COLUMN likes INTEGER NOT NULL DEFAULT 0`);
            console.log("✅ Added 'likes' column to memos table.");
        } catch (e: any) {
            if (e.message?.includes("duplicate column")) {
                console.log("⏭️ 'likes' column already exists in memos.");
            } else {
                throw e;
            }
        }

        // 3. Add likes column to insight_feedback table
        try {
            await db.run(sql`ALTER TABLE insight_feedback ADD COLUMN likes INTEGER NOT NULL DEFAULT 0`);
            console.log("✅ Added 'likes' column to insight_feedback table.");
        } catch (e: any) {
            if (e.message?.includes("duplicate column")) {
                console.log("⏭️ 'likes' column already exists in insight_feedback.");
            } else {
                throw e;
            }
        }

        console.log("\n📝 Existing memos will be treated as '気付き' (insights) automatically.");
    } catch (e: any) {
        console.error("Migration failed:", e);
        process.exit(1);
    }

    console.log("\n✅ Migration completed successfully.");
    process.exit(0);
}

main();
