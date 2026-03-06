/**
 * Turso DB Backup Script
 * 使い方: npx tsx scripts/backup.ts
 * 
 * 全テーブルをJSONファイルとしてbackups/フォルダに保存します。
 */

import "dotenv/config";
import { createClient } from "@libsql/client";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const TABLES = [
    "users",
    "quest_templates",
    "quests",
    "quest_history",
    "projects",
    "user_progression",
    "daily_insights",
    "kaizen_memos",
];

async function backup() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !url.startsWith("libsql://")) {
        console.error("❌ ERROR: Not connected to Turso. Check DATABASE_URL.");
        process.exit(1);
    }

    const client = createClient({ url, authToken });

    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupDir = join(process.cwd(), "backups", timestamp);
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
        } catch (e: any) {
            // Table might not exist
            console.log(`  - ${table.padEnd(25)} (skipped: ${e.message?.slice(0, 40)})`);
        }
    }

    // Write a manifest file
    const manifest = {
        timestamp,
        url: url.split("@")[0] + "@***",
        tables: TABLES,
        totalRows,
    };
    writeFileSync(join(backupDir, "_manifest.json"), JSON.stringify(manifest, null, 2));

    console.log("─────────────────────────────────────────");
    console.log(`✅ Done! ${totalRows} total rows backed up to backups/${timestamp}/`);

    client.close();
}

backup().catch((e) => {
    console.error("❌ Backup failed:", e);
    process.exit(1);
});
