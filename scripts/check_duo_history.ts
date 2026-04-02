import "dotenv/config";
import { createClient } from "@libsql/client";

async function check() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) { console.error("DATABASE_URL not set"); return; }
    const client = createClient({ url, authToken });

    try {
        const hist = await client.execute({ 
            sql: "SELECT id, recordedDate, recordedAt FROM quest_history WHERE templateId = 41 ORDER BY recordedDate DESC LIMIT 7", 
            args: [] 
        });
        console.log("Recent Duolingo History:");
        console.table(hist.rows);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}
check();
