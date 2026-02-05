import { z } from "zod";
import { notifyOwner } from "./notification.js";
import { SheetPayload, sendToSpreadsheet } from "../services/sheets.js";
import { adminProcedure, publicProcedure, router } from "./trpc.js";
import { checkDbConnection, getUnsyncedHistory, markHistoryAsSynced } from "../db.js";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  dbCheck: publicProcedure
    .query(async () => {
      return await checkDbConnection();
    }),

  /**
   * スプレッドシート同期漏れの手動/定期実行用API
   */
  syncSpreadsheet: publicProcedure
    .mutation(async () => {
      const unsyncedRecords = await getUnsyncedHistory(20); // Process 20 at a time
      let successCount = 0;
      let failCount = 0;

      for (const record of unsyncedRecords) {
        // Construct payload from record
        const payload: SheetPayload = {
          recordedDate: record.recordedDate,
          questName: record.questName,
          projectName: record.projectName,
          questType: record.questType,
          finalStatus: record.finalStatus,
          plannedTimeSlot: record.plannedTimeSlot,
          executionType: (record.executionType as any) || "FIX",
          progress: record.progress || "-",
        };

        const success = await sendToSpreadsheet(payload);
        if (success) {
          await markHistoryAsSynced(record.id);
          successCount++;
        } else {
          failCount++;
        }
      }

      return {
        message: `Sync processed. Success: ${successCount}, Failed: ${failCount}`,
        successCount,
        failCount
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
