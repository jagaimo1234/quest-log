import "dotenv/config";
import { createClient } from "@libsql/client";

async function restoreDuolingo() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }
    const client = createClient({ url, authToken });

    try {
        const uRes = await client.execute("SELECT id FROM users LIMIT 1");
        const userId = uRes.rows[0].id as number;
        const now = Math.floor(Date.now() / 1000);

        // 1. Create Daily template for Duolingo
        const tmplRes = await client.execute({
            sql: `INSERT INTO quest_templates (userId, questName, questType, difficulty, frequency, isActive, createdAt, updatedAt)
                  VALUES (?, 'デュオリンゴ', 'Daily', '1', 1, 1, ?, ?)
                  RETURNING id`,
            args: [userId, now, now],
        });
        const newTemplateId = tmplRes.rows[0].id as number;
        console.log("✓ Created Daily template 'デュオリンゴ', id =", newTemplateId);

        // 2. Re-link existing quest (id=192) to new template
        await client.execute({
            sql: "UPDATE quests SET templateId = ? WHERE questName = 'デュオリンゴ'",
            args: [newTemplateId],
        });
        console.log("✓ Re-linked existing Duolingo quest(s) to templateId =", newTemplateId);

        // 3. Update the history records to point to new template
        await client.execute({
            sql: "UPDATE quest_history SET templateId = ? WHERE questName = 'デュオリンゴ'",
            args: [newTemplateId],
        });
        console.log("✓ Re-linked 20 history records");

        // 4. Quick verify
        const check = await client.execute("SELECT COUNT(*) as cnt FROM quest_history WHERE templateId = ?", [newTemplateId]);
        const tmplCheck = await client.execute("SELECT id, questName, questType FROM quest_templates ORDER BY id DESC LIMIT 5");
        console.log("\nHistory count for new template:", check.rows[0].cnt);
        console.log("Latest templates:");
        for (const t of tmplCheck.rows) console.log(`  id=${t.id} "${t.questName}" (${t.questType})`);
        console.log("\n✅ Done!");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}
restoreDuolingo();
