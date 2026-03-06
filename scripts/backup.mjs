/**
 * Turso DB Backup Script (ESM JavaScript - GitHub Actions compatible)
 * Usage: node scripts/backup.mjs
 */

import { createClient } from "@libsql/client";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TABLES = [
    "users",
    "quest_templates",
    "quests",
    "quest_history",
    "projects",
    "user_progression",
    "daily_insights",
];

async function backup() {
    const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !url.startsWith("libsql://")) {
        console.error("❌ ERROR: Not connected to Turso. Check DATABASE_URL or TURSO_DATABASE_URL.");
        process.exit(1);
    }

    const client = createClient({ url, authToken });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupDir = join(__dirname, "..", "backups", timestamp);
    mkdirSync(backupDir, { recursive: true });

    console.log(`📦 Backing up to: backups/${timestamp}/`);
    console.log("─────────────────────────────────────────");

    let totalRows = 0;

    for (const table of TABLES) {
        try {
            const result = await client.execute(`SELECT * FROM ${table}`);
            const rows = result.rows;
            const filePath = join(backupDir, `${table}.json`);
            writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf-8");
            console.log(`  ✓ ${table.padEnd(25)} ${rows.length} rows`);
            totalRows += rows.length;
        } catch (e) {
            console.log(`  - ${table.padEnd(25)} (skipped: ${e.message?.slice(0, 50)})`);
        }
    }

    writeFileSync(
        join(backupDir, "_manifest.json"),
        JSON.stringify({ timestamp, totalRows, tables: TABLES }, null, 2)
    );

    console.log("─────────────────────────────────────────");
    console.log(`✅ Done! ${totalRows} total rows → backups/${timestamp}/`);

    client.close();
}

backup().catch((e) => {
    console.error("❌ Backup failed:", e);
    process.exit(1);
});
