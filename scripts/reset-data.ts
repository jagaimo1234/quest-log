
import { getDb } from "../server/db";
import { quests, questHistory } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Resetting mission history...");

    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to database");
        process.exit(1);
    }

    await db.delete(questHistory);
    await db.delete(quests);

    console.log("Reset complete.");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
