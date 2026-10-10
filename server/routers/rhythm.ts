import { router, protectedProcedure } from "../_core/trpc.js";
import { z } from "zod";
import { getDb } from "../db.js";
import { questHistory } from "../../drizzle/schema.js";
import { eq, and, desc, gte, lte } from "drizzle-orm";

interface SlotDetail {
  hour: number;
  label: string;
}

function parseTimeSlots(slotStr: string | null | undefined): SlotDetail[] {
  if (!slotStr) return [];
  let slots: string[] = [];
  try {
    const parsed = JSON.parse(slotStr);
    if (Array.isArray(parsed)) {
      slots = parsed;
    } else if (typeof parsed === "string") {
      slots = [parsed];
    }
  } catch {
    // If not valid JSON, treat as comma separated or plain string
    slots = slotStr.split(",").map(s => s.trim()).filter(Boolean);
  }

  const results: SlotDetail[] = [];
  for (const s of slots) {
    // Match "08:00-09:00" or "8:00-9:00"
    const match = s.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (match) {
      const startHour = parseInt(match[1], 10);
      const endHour = parseInt(match[3], 10);
      const label = `${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00`;
      results.push({ hour: startHour, label });
    }
  }
  return results;
}

export const rhythmRouter = router({
  getHeatmap: protectedProcedure
    .input(z.object({
      daysRange: z.enum(["all", "30", "90", "180"]).optional().default("all"),
      questType: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const daysRange = input?.daysRange || "all";
      const questType = input?.questType;

      // Calculate date threshold if range specified
      let minDateStr: string | null = null;
      if (daysRange !== "all") {
        const days = parseInt(daysRange, 10);
        const d = new Date();
        d.setDate(d.getDate() - days);
        minDateStr = d.toISOString().split("T")[0];
      }

      // Fetch questHistory items
      const conditions = [eq(questHistory.userId, ctx.user!.id)];
      if (minDateStr) {
        conditions.push(gte(questHistory.recordedDate, minDateStr));
      }
      if (questType && questType !== "ALL") {
        conditions.push(eq(questHistory.questType, questType as any));
      }

      const rows = await db.select().from(questHistory)
        .where(and(...conditions))
        .orderBy(desc(questHistory.recordedDate));

      // Aggregations
      let totalLogged = rows.length;
      let totalWithSlots = 0;
      let clearedCount = 0;
      let failedCount = 0;

      // 0-23 hours
      const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: `${String(i).padStart(2, "0")}:00`,
        cleared: 0,
        failed: 0,
        other: 0,
        total: 0,
        topQuests: {} as Record<string, number>,
      }));

      // 7 days (0=日, 1=月, ..., 6=土) x 24 hours
      // We will index as matrix[dayOfWeek][hour]
      const matrix: Record<string, {
        dayOfWeek: number;
        hour: number;
        count: number;
        clearedCount: number;
        failedCount: number;
        questCounts: Record<string, number>;
      }> = {};

      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          const key = `${d}-${h}`;
          matrix[key] = {
            dayOfWeek: d,
            hour: h,
            count: 0,
            clearedCount: 0,
            failedCount: 0,
            questCounts: {},
          };
        }
      }

      // Top quests overall
      const overallQuestStats: Record<string, { count: number; cleared: number; hours: Record<number, number> }> = {};

      for (const row of rows) {
        const isCleared = row.finalStatus === "cleared";
        const isFailed = row.finalStatus === "failed";
        if (isCleared) clearedCount++;
        else if (isFailed) failedCount++;

        const slots = parseTimeSlots(row.plannedTimeSlot);
        if (slots.length > 0) {
          totalWithSlots++;
        }

        // Get day of week
        // recordedDate is YYYY-MM-DD
        const dateObj = new Date(`${row.recordedDate}T00:00:00`);
        const dayOfWeek = isNaN(dateObj.getTime()) ? 0 : dateObj.getDay();
        const questName = row.questName || "名称なし";

        if (!overallQuestStats[questName]) {
          overallQuestStats[questName] = { count: 0, cleared: 0, hours: {} };
        }
        overallQuestStats[questName].count++;
        if (isCleared) overallQuestStats[questName].cleared++;

        for (const slot of slots) {
          const h = slot.hour;
          if (h >= 0 && h < 24) {
            hourlyDistribution[h].total++;
            if (isCleared) hourlyDistribution[h].cleared++;
            else if (isFailed) hourlyDistribution[h].failed++;
            else hourlyDistribution[h].other++;

            hourlyDistribution[h].topQuests[questName] = (hourlyDistribution[h].topQuests[questName] || 0) + 1;

            overallQuestStats[questName].hours[h] = (overallQuestStats[questName].hours[h] || 0) + 1;

            const key = `${dayOfWeek}-${h}`;
            matrix[key].count++;
            if (isCleared) matrix[key].clearedCount++;
            if (isFailed) matrix[key].failedCount++;
            matrix[key].questCounts[questName] = (matrix[key].questCounts[questName] || 0) + 1;
          }
        }
      }

      // Convert matrix to array
      const weekdayHourGrid = Object.values(matrix).map(item => {
        const topQuests = Object.entries(item.questCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));
        return {
          dayOfWeek: item.dayOfWeek,
          hour: item.hour,
          count: item.count,
          clearedCount: item.clearedCount,
          failedCount: item.failedCount,
          topQuests,
        };
      });

      // Find peak hour and peak day
      let peakHour = { hour: 0, count: 0, label: "00:00" };
      for (const h of hourlyDistribution) {
        if (h.total > peakHour.count) {
          peakHour = { hour: h.hour, count: h.total, label: h.label };
        }
      }

      const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
      const dayTotals = Array.from({ length: 7 }, (_, d) => ({
        dayOfWeek: d,
        name: dayNames[d],
        total: 0,
      }));

      weekdayHourGrid.forEach(g => {
        dayTotals[g.dayOfWeek].total += g.count;
      });

      let peakDay = { dayOfWeek: 0, count: 0, name: "日" };
      for (const dt of dayTotals) {
        if (dt.total > peakDay.count) {
          peakDay = { dayOfWeek: dt.dayOfWeek, count: dt.total, name: dt.name };
        }
      }

      // Format top quests summary
      const topQuestsSummary = Object.entries(overallQuestStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([name, stat]) => {
          let bestHour = 0;
          let maxHourCount = 0;
          for (const [hStr, count] of Object.entries(stat.hours)) {
            if (count > maxHourCount) {
              maxHourCount = count;
              bestHour = parseInt(hStr, 10);
            }
          }
          return {
            name,
            totalCount: stat.count,
            clearedCount: stat.cleared,
            peakTime: maxHourCount > 0 ? `${String(bestHour).padStart(2, "0")}:00-${String(bestHour + 1).padStart(2, "0")}:00` : "未定",
          };
        });

      // Date range info
      const dates = rows.map((r: any) => r.recordedDate).filter(Boolean);
      const minDate = dates.length > 0 ? dates[dates.length - 1] : null;
      const maxDate = dates.length > 0 ? dates[0] : null;

      return {
        summary: {
          totalLogged,
          totalWithSlots,
          clearedCount,
          failedCount,
          completionRate: totalLogged > 0 ? Math.round((clearedCount / totalLogged) * 100) : 0,
          peakHour,
          peakDay,
          minDate,
          maxDate,
        },
        dayTotals,
        hourlyDistribution: hourlyDistribution.map(h => ({
          ...h,
          topQuests: Object.entries(h.topQuests)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count })),
        })),
        weekdayHourGrid,
        topQuestsSummary,
      };
    }),
});
