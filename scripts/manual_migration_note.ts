import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("Missing DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
}

const client = createClient({ url, authToken });

async function main() {
    console.log("Starting migration: Adding 'note' column...");

    try {
        // Add note to quests
        console.log("Adding 'note' column to 'quests' table...");
        await client.execute("ALTER TABLE quests ADD COLUMN note TEXT");
        console.log("Successfully added 'note' to 'quests'.");

        // Add note to quest_history
        console.log("Adding 'note' column to 'quest_history' table...");
        await client.execute("ALTER TABLE quest_history ADD COLUMN note TEXT");
        console.log("Successfully added 'note' to 'quest_history'.");

        console.log("Migration completed successfully!");
    } catch (e: any) {
        if (e.message && e.message.includes("duplicate column name")) {
            console.log("Column 'note' already exists. Skipping.");
        } else {
            console.error("Migration failed:", e);
        }
    } finally {
        client.close();
    }
}

main();
