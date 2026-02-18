import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db.js";

async function main() {
    const db = await getDb();
    if (!db) { console.error("DB fail"); process.exit(1); }
    try {
        await db.run(sql`ALTER TABLE memos ADD COLUMN done INTEGER DEFAULT 0 NOT NULL`);
        console.log("Added done column to memos");
    } catch (e: any) {
        if (e.message?.includes("duplicate column name")) {
            console.log("Column done already exists. Skipping.");
        } else { throw e; }
    }
    process.exit(0);
}
main();
