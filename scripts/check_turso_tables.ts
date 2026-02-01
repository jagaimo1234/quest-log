import "dotenv/config";
import { createClient } from "@libsql/client";

async function checkTables() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    console.log("Checking DB Connection...");
    console.log("URL starts with:", url?.substring(0, 10) + "...");
    console.log("Is Turso?:", url?.startsWith("libsql://"));

    if (!url || !url.startsWith("libsql://")) {
        console.error("ERROR: Not connected to Turso. Current URL:", url);
        return;
    }

    const client = createClient({
        url,
        authToken,
    });

    try {
        const rs = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
        console.log("--- Tables in Turso ---");
        if (rs.rows.length === 0) {
            console.log("(No tables found - Database is empty)");
        } else {
            rs.rows.forEach(row => console.log(row.name));
        }
        console.log("-----------------------");
    } catch (e) {
        console.error("Connection failed:", e);
    } finally {
        client.close();
    }
}

checkTables();
