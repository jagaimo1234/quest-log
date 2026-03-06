import "dotenv/config";
import { createClient } from "@libsql/client";

async function checkTemplates() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
        console.error("DATABASE_URL not set");
        return;
    }

    const client = createClient({ url, authToken });

    try {
        // Check all templates regardless of isActive
        const rs = await client.execute("SELECT id, userId, questName, questType, frequency, isActive, createdAt FROM quest_templates ORDER BY createdAt DESC LIMIT 50;");
        console.log("--- quest_templates (ALL, including inactive) ---");
        console.log("Total rows:", rs.rows.length);
        rs.rows.forEach(row => console.log(row));
        console.log("-----------------------");
    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        client.close();
    }
}

checkTemplates();
