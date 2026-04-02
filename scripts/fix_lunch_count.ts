import { getDb } from "../server/db";
import { dailyConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    if (!db) {
        console.error("Database connection failed");
        return;
    }

    const today = "2026-03-11";

    console.log(`Setting lunchCount to 1 for date ${today}...`);

    await db.update(dailyConfig)
        .set({ lunchCount: 1 })
        .where(eq(dailyConfig.date, today));

    console.log("Done.");
}

main().catch(console.error);
