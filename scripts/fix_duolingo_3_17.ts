import "dotenv/config";
import { createClient } from "@libsql/client";

async function fixDuolingo() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }
    const client = createClient({ url, authToken });

    try {
        const uRes = await client.execute("SELECT id FROM users LIMIT 1");
        const userId = uRes.rows[0].id as number;

        // March 17, 2026 JST
        const targetDateStr = "2026-03-17";
        const past = new Date("2026-03-17T12:00:00+09:00");
        const ts = Math.floor(past.getTime() / 1000);
        
        // Template ID for Duolingo is 41
        // Check if quest history already exists
        const existing = await client.execute({ 
            sql: "SELECT id FROM quest_history WHERE templateId = 41 AND recordedDate = ?", 
            args: [targetDateStr] 
        });

        if (existing.rows.length > 0) {
            console.log(`Duolingo history already exists for ${targetDateStr}.`);
        } else {
            console.log(`Inserting Duolingo history for ${targetDateStr}...`);
            await client.execute({
                sql: `INSERT INTO quest_history (userId, questId, questName, questType, difficulty, finalStatus, xpEarned, templateId, recordedAt, recordedDate)
                      VALUES (?, 0, 'デュオリンゴ', 'Daily', '1', 'cleared', 10, 41, ?, ?)`,
                args: [userId, ts, targetDateStr],
            });
            console.log("Insert successful!");
        }

        // Also, we can check if there's a daily quest created on 3/17 that wasn't cleared.
        const quests = await client.execute({ 
            sql: `SELECT id, status FROM quests WHERE templateId = 41 AND date(createdAt, 'unixepoch', 'localtime') = ?`, 
            args: [targetDateStr] 
        });
        
        for (const q of quests.rows) {
            if (q.status !== 'cleared') {
                console.log(`Found uncleared daily quest (id: ${q.id}) for ${targetDateStr}, marking as cleared...`);
                await client.execute({
                    sql: `UPDATE quests SET status = 'cleared' WHERE id = ?`,
                    args: [q.id]
                });
            }
        }
        
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}
fixDuolingo();
