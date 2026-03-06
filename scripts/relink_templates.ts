import "dotenv/config";
import { createClient } from "@libsql/client";

async function relinkTemplates() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }

    const client = createClient({ url, authToken });

    try {
        // Show current active quests
        const qRes = await client.execute(`
            SELECT id, questName, questType, status, templateId 
            FROM quests 
            WHERE status IN ('accepted','challenging','almost','unreceived')
            ORDER BY id DESC LIMIT 20
        `);
        console.log("=== Active Quests ===");
        for (const q of qRes.rows) {
            console.log(`id=${q.id} name="${q.questName}" type=${q.questType} status=${q.status} templateId=${q.templateId}`);
        }

        // Show all restored templates
        const tRes = await client.execute("SELECT id, questName, questType FROM quest_templates ORDER BY id");
        console.log("\n=== Templates ===");
        for (const t of tRes.rows) {
            console.log(`id=${t.id} name="${t.questName}" type=${t.questType}`);
        }

        // Build template lookup by name
        const templateByName: Record<string, number> = {};
        for (const t of tRes.rows) {
            templateByName[t.questName as string] = t.id as number;
        }

        // Re-link quests whose questName matches a template
        let updated = 0;
        for (const q of qRes.rows) {
            const matchId = templateByName[q.questName as string];
            if (matchId && q.templateId !== matchId) {
                await client.execute({
                    sql: "UPDATE quests SET templateId = ? WHERE id = ?",
                    args: [matchId, q.id],
                });
                console.log(`\n✓ Re-linked: "${q.questName}" (questId=${q.id}) → templateId=${matchId}`);
                updated++;
            }
        }

        console.log(`\n✅ Done! Updated ${updated} quests.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}

relinkTemplates();
