import "dotenv/config";
import { createClient } from "@libsql/client";

async function restoreTemplates() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
        console.error("DATABASE_URL not set");
        return;
    }

    const client = createClient({ url, authToken });

    try {
        // Get userId (first user)
        const userResult = await client.execute("SELECT id, email FROM users LIMIT 1");
        if (userResult.rows.length === 0) {
            console.error("No users found!");
            return;
        }
        const userId = userResult.rows[0].id;
        console.log("Restoring templates for userId:", userId, "email:", userResult.rows[0].email);

        const now = Math.floor(Date.now() / 1000);

        // NON-FIX (Weekly Pool) templates from screenshot
        // questType: Weekly, no daysOfWeek (pool)
        const templates = [
            { questName: "一文英作文 -一つでも英作文書く。-", frequency: 5 },
            { questName: "自炊チャレンジ -昼でも夜でもよい。-", frequency: 4 },
            { questName: "英語の本を読む", frequency: 4 },
            { questName: "モアイ活動 -自由(とにかく触れる)-", frequency: 10 },
            { questName: "ハイロー勉強（15分）　-戦略勉強(MACD)-", frequency: 2 },
            { questName: "ジムで筋トレ", frequency: 2 },
            { questName: "FAMILY6(1銘柄)　-銘柄を理解する。-", frequency: 3 },
            { questName: "部屋の掃除", frequency: 1 },
            { questName: "5kmランニング", frequency: 3 },
        ];

        for (const t of templates) {
            await client.execute({
                sql: `INSERT INTO quest_templates (userId, questName, questType, difficulty, frequency, isActive, createdAt, updatedAt) 
                      VALUES (?, ?, 'Weekly', '1', ?, 1, ?, ?)`,
                args: [userId, t.questName, t.frequency, now, now],
            });
            console.log(`✓ Inserted: ${t.questName} (x${t.frequency}/week)`);
        }

        // Verify
        const check = await client.execute("SELECT COUNT(*) as cnt FROM quest_templates");
        console.log("\n✅ Done! Total templates now:", check.rows[0].cnt);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}

restoreTemplates();
