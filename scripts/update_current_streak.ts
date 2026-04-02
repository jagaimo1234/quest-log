import "dotenv/config";
import { createClient } from "@libsql/client";

async function updateCurrentStreak() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }
    const client = createClient({ url, authToken });

    try {
        const uRes = await client.execute("SELECT id FROM users LIMIT 1");
        const userId = uRes.rows[0].id as number;

        console.log(`Updating currentStreak to 13 for userId ${userId}...`);
        
        await client.execute({
            sql: "UPDATE user_progression SET currentStreak = 13 WHERE userId = ?",
            args: [userId]
        });

        const check = await client.execute({
            sql: "SELECT currentStreak, longestStreak FROM user_progression WHERE userId = ?",
            args: [userId]
        });
        console.log("Updated user_progression:", check.rows[0]);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}
updateCurrentStreak();
