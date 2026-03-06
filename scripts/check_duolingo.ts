import "dotenv/config";
import { createClient } from "@libsql/client";

async function checkDuolingo() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }
    const client = createClient({ url, authToken });

    try {
        // Check existing quests
        const q = await client.execute(`SELECT id, questName, questType, status, templateId FROM quests WHERE questName LIKE '%デュオリンゴ%' OR questName LIKE '%Duolingo%' ORDER BY id DESC`);
        console.log("=== Duolingo Quests ===");
        for (const r of q.rows) console.log(r);

        // Check history
        const h = await client.execute(`SELECT COUNT(*) as cnt FROM quest_history WHERE questName LIKE '%デュオリンゴ%' OR questName LIKE '%Duolingo%'`);
        console.log("\nDuolingo history count:", h.rows[0].cnt);

        // Show templates list (to see what's there)
        const t = await client.execute("SELECT id, questName, questType FROM quest_templates ORDER BY id");
        console.log("\n=== All Templates ===");
        for (const r of t.rows) console.log(`id=${r.id} "${r.questName}" (${r.questType})`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}
checkDuolingo();
