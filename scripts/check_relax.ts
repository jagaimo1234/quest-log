import "dotenv/config";
import { createClient } from "@libsql/client";

async function checkRelax() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }
    const client = createClient({ url, authToken });

    try {
        // Check quests
        const q = await client.execute(`SELECT id, questName, questType, status, templateId FROM quests WHERE questType = 'Relax' ORDER BY id DESC LIMIT 20`);
        console.log("=== Relax Quests ===");
        for (const r of q.rows) console.log(r);

        // Check history for relax type
        const h = await client.execute(`SELECT DISTINCT questName, COUNT(*) as cnt FROM quest_history WHERE questType = 'Relax' GROUP BY questName`);
        console.log("\n=== Relax History (distinct names + count) ===");
        for (const r of h.rows) console.log(r);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}
checkRelax();
