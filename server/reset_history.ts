import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { questHistory } from "../drizzle/schema";

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

async function main() {
    console.log("Deleting all quest history...");
    await db.delete(questHistory);
    console.log("All quest history deleted.");
}

main();
