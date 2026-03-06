import "dotenv/config";
import { createClient } from "@libsql/client";

async function restoreHistory() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }

    const client = createClient({ url, authToken });

    try {
        const tRes = await client.execute("SELECT id, questName, frequency FROM quest_templates ORDER BY id ASC");
        const uRes = await client.execute("SELECT id FROM users LIMIT 1");
        const userId = uRes.rows[0].id as number;

        const templateMap: Record<string, { id: number, frequency: number }> = {};
        for (const row of tRes.rows) {
            templateMap[row.questName as string] = { id: row.id as number, frequency: row.frequency as number };
        }

        // From screenshot: { questName, totalExecuted, thisWeekCount }
        const data = [
            { questName: "一文英作文 -一つでも英作文書く。-", totalExecuted: 5, thisWeekCount: 0 },
            { questName: "自炊チャレンジ -昼でも夜でもよい。-", totalExecuted: 10, thisWeekCount: 1 },
            { questName: "英語の本を読む", totalExecuted: 1, thisWeekCount: 0 },
            { questName: "モアイ活動 -自由(とにかく触れる)-", totalExecuted: 20, thisWeekCount: 0 },
            { questName: "ハイロー勉強（15分）　-戦略勉強(MACD)-", totalExecuted: 0, thisWeekCount: 0 },
            { questName: "ジムで筋トレ", totalExecuted: 5, thisWeekCount: 1 },
            { questName: "FAMILY6(1銘柄)　-銘柄を理解する。-", totalExecuted: 0, thisWeekCount: 0 },
            { questName: "部屋の掃除", totalExecuted: 4, thisWeekCount: 1 },
            { questName: "5kmランニング", totalExecuted: 9, thisWeekCount: 1 },
        ];

        // Current week started Mon March 2, 2026 (JST)
        let totalInserted = 0;

        for (const item of data) {
            const tmpl = templateMap[item.questName];
            if (!tmpl) { console.warn(`⚠ Template not found: ${item.questName}`); continue; }

            const historicalCount = item.totalExecuted - item.thisWeekCount;

            // Historical records (before this week)
            for (let i = 0; i < historicalCount; i++) {
                const weeksAgo = Math.floor(i / (tmpl.frequency || 1)) + 1;
                const daysAgo = weeksAgo * 7 + (i % 7);
                const past = new Date("2026-03-02T00:00:00+09:00");
                past.setDate(past.getDate() - daysAgo);
                const ts = Math.floor(past.getTime() / 1000);
                const dateStr = past.toISOString().split("T")[0];

                await client.execute({
                    sql: `INSERT INTO quest_history (userId, questId, questName, questType, difficulty, finalStatus, xpEarned, templateId, recordedAt, recordedDate)
                          VALUES (?, 0, ?, 'Weekly', '1', 'cleared', 50, ?, ?, ?)`,
                    args: [userId, item.questName, tmpl.id, ts, dateStr],
                });
                totalInserted++;
            }

            // This week's records (March 2-5, 2026)
            for (let i = 0; i < item.thisWeekCount; i++) {
                const thisWeek = new Date("2026-03-02T12:00:00+09:00");
                thisWeek.setDate(thisWeek.getDate() + i);
                const ts = Math.floor(thisWeek.getTime() / 1000);
                const dateStr = thisWeek.toISOString().split("T")[0];

                await client.execute({
                    sql: `INSERT INTO quest_history (userId, questId, questName, questType, difficulty, finalStatus, xpEarned, templateId, recordedAt, recordedDate)
                          VALUES (?, 0, ?, 'Weekly', '1', 'cleared', 50, ?, ?, ?)`,
                    args: [userId, item.questName, tmpl.id, ts, dateStr],
                });
                totalInserted++;
            }

            if (item.totalExecuted > 0) {
                console.log(`✓ ${item.questName}: 達成回数 ${item.totalExecuted} (今週 ${item.thisWeekCount})`);
            } else {
                console.log(`- ${item.questName}: 達成回数 0 (スキップ)`);
            }
        }

        const check = await client.execute("SELECT COUNT(*) as cnt FROM quest_history");
        console.log(`\n✅ Done! Inserted ${totalInserted} records. Total quest_history: ${check.rows[0].cnt}`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}

restoreHistory();
