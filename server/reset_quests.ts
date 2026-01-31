import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { quests } from "../drizzle/schema";

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

async function main() {
    console.log("Deleting all active quests...");
    await db.delete(quests);
    console.log("All quests deleted.");
}

main();
