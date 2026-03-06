import "dotenv/config";
import { createClient } from "@libsql/client";

async function restoreRelax() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }
    const client = createClient({ url, authToken });

    try {
        const uRes = await client.execute("SELECT id FROM users LIMIT 1");
        const userId = uRes.rows[0].id as number;
        const now = Math.floor(Date.now() / 1000);

        // Relax missions found in history:
        // ハイローチャレンジ(MACD）: 1 time
        // 散歩: 3 times
        // 温泉: 1 time
        const relaxMissions = [
            { questName: "ハイローチャレンジ(MACD）", executedCount: 1 },
            { questName: "散歩", executedCount: 3 },
            { questName: "温泉", executedCount: 1 },
        ];

        for (const m of relaxMissions) {
            // 1. Create Relax template
            const tmplRes = await client.execute({
                sql: `INSERT INTO quest_templates (userId, questName, questType, difficulty, frequency, isActive, createdAt, updatedAt)
                      VALUES (?, ?, 'Relax', '1', 1, 1, ?, ?)
                      RETURNING id`,
                args: [userId, m.questName, now, now],
            });
            const newTemplateId = tmplRes.rows[0].id as number;
            console.log(`✓ Created Relax template "${m.questName}", id = ${newTemplateId}`);

            // 2. Re-link history records for this mission name
            const updateRes = await client.execute({
                sql: "UPDATE quest_history SET templateId = ? WHERE questName = ? AND questType = 'Relax'",
                args: [newTemplateId, m.questName],
            });
            console.log(`  ✓ Re-linked ${m.executedCount} history record(s)`);
        }

        // Verify
        const templates = await client.execute("SELECT id, questName, questType FROM quest_templates WHERE questType = 'Relax'");
        console.log("\n=== Relax Templates ===");
        for (const t of templates.rows) console.log(`  id=${t.id} "${t.questName}"`);
        console.log("\n✅ Done!");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}

restoreRelax();
