
import { getDb } from "../server/db.js";
import { questHistory, questTemplates } from "../drizzle/schema.js";
import { eq, and } from "drizzle-orm";
import { sendToSpreadsheet, SheetPayload } from "../server/services/sheets.js";
import { sql } from "drizzle-orm";

// Re-implement logic to determine execution type and progress since we lost context from router
async function getTemplateInfo(db: any, templateId: number | null, questType: string) {
    if (!templateId) return { executionType: "NON-FIX" as const, frequency: 1 };

    const [template] = await db.select().from(questTemplates).where(eq(questTemplates.id, templateId));
    if (!template) return { executionType: "NON-FIX" as const, frequency: 1 };

    let executionType: "FIX" | "NON-FIX" = "FIX";
    if (template.questType === "Daily") {
        executionType = "FIX";
    } else {
        const hasFixSetting = (template.daysOfWeek && template.daysOfWeek !== "[]") ||
            (template.weeksOfMonth && template.weeksOfMonth !== "[]") ||
            (template.datesOfMonth && template.datesOfMonth !== "[]") ||
            template.monthOfYear;
        executionType = hasFixSetting ? "FIX" : "NON-FIX";
    }

    return { executionType, frequency: template.frequency || 1 };
}

// Helper to count completions - simplified for batch context
// Note: In batch, calculating "current count at the time of completion" is hard if multiple records exist.
// We will just use "current count in DB now" which is close enough, or just 1/1 for simplicity if specific count history is too expensive.
// Actually, let's try to get count.
async function getContextualProgress(db: any, templateId: number | null, questType: string) {
    if (!templateId) return "1/1";
    // Just count total cleared for this template to show cumulative progress?
    // Or just show "-" to keep it simple and robust?
    // User liked "1/3", "2/3".
    // Let's do a simple count relative to *now* for simplicity.
    const [res] = await db.select({ count: sql<number>`count(*)` })
        .from(questHistory)
        .where(and(eq(questHistory.templateId, templateId), eq(questHistory.finalStatus, 'cleared')));

    // We need the template frequency
    const info = await getTemplateInfo(db, templateId, questType);
    return `${res?.count || 1}/${info.frequency}`;
}


export default async function handler(req: any, res: any) {
    // Vercel Cron authentication (optional but recommended)
    // const cronAuth = req.headers['authorization'];
    // if (cronAuth !== `Bearer ${process.env.CRON_SECRET}`) { // Set CRON_SECRET in env if needed
    //     return res.status(401).end('Unauthorized');
    // }

    console.log("[Cron] Starting Spreadsheet Sync...");

    const db = await getDb();
    if (!db) {
        console.error("[Cron] DB not available");
        return res.status(500).json({ error: "DB not available" });
    }

    try {
        // Fetch unsynced records
        // Limit to 20 to avoid timeouts
        const unsynced = await db.select().from(questHistory)
            .where(eq(questHistory.isSynced, false))
            .limit(20);

        if (unsynced.length === 0) {
            console.log("[Cron] No unsynced records found.");
            return res.status(200).json({ message: "No unsynced records" });
        }

        console.log(`[Cron] Found ${unsynced.length} records to sync.`);

        let successCount = 0;

        for (const record of unsynced) {
            try {
                // Reconstruct payload
                const templateInfo = await getTemplateInfo(db, record.templateId, record.questType);
                // For progress, ideally we stored it, but we didn't. 
                // Let's calculate dynamically.
                const progress = await getContextualProgress(db, record.templateId, record.questType);

                const payload: SheetPayload = {
                    recordedDate: record.recordedDate, // Use the DATE it was recorded
                    questName: record.questName,
                    projectName: record.projectName,
                    questType: record.questType,
                    finalStatus: record.finalStatus,
                    plannedTimeSlot: record.plannedTimeSlot,
                    executionType: templateInfo.executionType,
                    progress: progress
                };

                await sendToSpreadsheet(payload);

                // Mark as synced
                await db.update(questHistory)
                    .set({ isSynced: true })
                    .where(eq(questHistory.id, record.id));

                successCount++;

                // Simple delay to be nice to GAS
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (innerError) {
                console.error(`[Cron] Failed to sync record ID ${record.id}:`, innerError);
                // Continue to next record
            }
        }

        console.log(`[Cron] Sync completed. Success: ${successCount}/${unsynced.length}`);
        return res.status(200).json({
            message: "Sync completed",
            processed: unsynced.length,
            success: successCount
        });

    } catch (error) {
        console.error("[Cron] Critical error during sync:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
