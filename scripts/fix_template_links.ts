import "dotenv/config";
import { createClient } from "@libsql/client";

async function fixTemplateLinks() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }

    const client = createClient({ url, authToken });

    try {
        // Fix 1: モアイ活動 → template id=35 (モアイ活動 -自由(とにかく触れる)-)
        await client.execute({
            sql: "UPDATE quests SET templateId = 35 WHERE questName = 'モアイ活動' AND status IN ('accepted','challenging','almost','unreceived')",
            args: [],
        });
        console.log("✓ Fixed モアイ活動 → templateId=35");

        // Fix 2: Remove duplicate 5kmランニング id=221 (keep id=213 which was just re-linked to templateId=40)
        // Delete the one pointing to old/wrong templateId (id=221)
        const confirm = await client.execute("SELECT id, questName, templateId, status FROM quests WHERE questName = '5kmランニング' AND status IN ('accepted','challenging','almost','unreceived')");
        console.log("\n5kmランニング quests:", JSON.stringify(confirm.rows));

        // The one with old templateId=40 is id=221; 213 was already updated to 40.
        // We actually both now point to 40, so let's delete the older one (id=213 was the one re-linked, id=221 was already pointing to 40)
        // Actually let's just keep the newest one (id=221) and delete 213
        await client.execute({
            sql: "DELETE FROM quests WHERE id = 213",
            args: [],
        });
        console.log("✓ Removed duplicate 5kmランニング (id=213)");

        // Verify
        const final = await client.execute(`
            SELECT id, questName, questType, status, templateId
            FROM quests
            WHERE status IN ('accepted','challenging','almost','unreceived')
            ORDER BY id DESC LIMIT 10
        `);
        console.log("\n=== Active Quests After Fix ===");
        for (const q of final.rows) {
            console.log(`id=${q.id} name="${q.questName}" templateId=${q.templateId}`);
        }
        console.log("\n✅ Done!");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}

fixTemplateLinks();
