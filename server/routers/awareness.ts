import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import type { TrpcContext } from "../_core/context.js";
import { awarenessItems, awarenessLogs, awarenessVisuals, awarenessPractices } from "../../drizzle/schema.js";
import { getDb, ensureAwarenessTables } from "../db.js";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

export const awarenessRouter = router({
  list: protectedProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ ctx, input }: { ctx: TrpcContext; input?: { date?: string } }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const todayStr = input?.date || new Date().toISOString().slice(0, 10);

      // Fetch non-archived items
      const items = await db
        .select()
        .from(awarenessItems)
        .where(and(
          eq(awarenessItems.userId, ctx.user!.id),
          sql`${awarenessItems.status} != 'archived'`
        ))
        .orderBy(desc(awarenessItems.updatedAt));

      if (items.length === 0) return [];

      const itemIds = items.map((i: any) => i.id);

      // Fetch all logs for these items
      const logs = await db
        .select()
        .from(awarenessLogs)
        .where(and(
          eq(awarenessLogs.userId, ctx.user!.id),
          inArray(awarenessLogs.awarenessId, itemIds)
        ))
        .orderBy(desc(awarenessLogs.loggedAt));

      // Fetch all practices for these items
      const practices = await db
        .select()
        .from(awarenessPractices)
        .where(and(
          eq(awarenessPractices.userId, ctx.user!.id),
          inArray(awarenessPractices.awarenessId, itemIds)
        ));

      // Group logs by awarenessId
      const logsByItem: Record<number, typeof logs> = {};
      logs.forEach((l: any) => {
        if (!logsByItem[l.awarenessId]) logsByItem[l.awarenessId] = [];
        logsByItem[l.awarenessId].push(l);
      });

      // Group practices by awarenessId
      const practicesByItem: Record<number, typeof practices> = {};
      practices.forEach((p: any) => {
        if (!practicesByItem[p.awarenessId]) practicesByItem[p.awarenessId] = [];
        practicesByItem[p.awarenessId].push(p);
      });

      return items.map((item: any) => {
        const itemLogs = logsByItem[item.id] || [];
        const itemPractices = practicesByItem[item.id] || [];
        const successCount = itemLogs.filter((l: any) => l.logType === "success").length;
        const failureCount = itemLogs.filter((l: any) => l.logType === "failure").length;
        const insightCount = itemLogs.filter((l: any) => l.logType === "insight").length;
        const totalCount = itemLogs.length;

        const practiceCount = itemPractices.length;
        const isPracticedToday = itemPractices.some((p: any) => p.date === todayStr);

        // Visual stage calculation (1: 0~2, 2: 3~6, 3: 7~13, 4: 14+)
        let visualStage: 1 | 2 | 3 | 4 = 1;
        if (practiceCount >= 14 || item.status === "anchored") {
          visualStage = 4;
        } else if (practiceCount >= 7) {
          visualStage = 3;
        } else if (practiceCount >= 3) {
          visualStage = 2;
        } else {
          visualStage = 1;
        }

        // Calculate automated stage
        let computedStage = item.retentionStage;
        if (item.status === "anchored" || practiceCount >= 14) {
          computedStage = "anchored";
        } else if (practiceCount >= 3 || totalCount >= 1) {
          computedStage = "growing";
        } else {
          computedStage = "sprout";
        }

        return {
          ...item,
          retentionStage: computedStage,
          visualStage,
          practiceCount,
          isPracticedToday,
          logs: itemLogs,
          counts: {
            success: successCount,
            failure: failureCount,
            insight: insightCount,
            total: totalCount,
          },
        };
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        contextBefore: z.string().optional(),
        contextAfter: z.string().optional(),
        sourceType: z.string().optional(),
        sourceId: z.string().optional(),
        sourceTitle: z.string().optional(),
        sourceUrl: z.string().optional(),
        status: z.enum(["active", "standby", "anchored"]).optional(),
        color: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: any }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Count currently active items
      let defaultStatus = input.status || "standby";
      if (!input.status) {
        const activeItems = await db
          .select({ id: awarenessItems.id })
          .from(awarenessItems)
          .where(and(
            eq(awarenessItems.userId, ctx.user!.id),
            eq(awarenessItems.status, "active")
          ));
        // If user currently has fewer than 3 active items, auto-promote to active
        if (activeItems.length < 3) {
          defaultStatus = "active";
        }
      }

      const now = new Date();
      const result = await db
        .insert(awarenessItems)
        .values({
          userId: ctx.user!.id,
          title: input.title.trim(),
          contextBefore: input.contextBefore || null,
          contextAfter: input.contextAfter || null,
          sourceType: input.sourceType || "general",
          sourceId: input.sourceId ? String(input.sourceId) : null,
          sourceTitle: input.sourceTitle || null,
          sourceUrl: input.sourceUrl || null,
          status: defaultStatus,
          retentionStage: "sprout",
          color: input.color || "amber",
          notes: input.notes || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return result[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        status: z.enum(["active", "standby", "anchored", "archived"]).optional(),
        retentionStage: z.enum(["sprout", "growing", "anchored"]).optional(),
        color: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: any }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const updateData: any = {
        updatedAt: new Date(),
      };
      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.status !== undefined) updateData.status = input.status;
      if (input.retentionStage !== undefined) updateData.retentionStage = input.retentionStage;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const result = await db
        .update(awarenessItems)
        .set(updateData)
        .where(and(
          eq(awarenessItems.id, input.id),
          eq(awarenessItems.userId, ctx.user!.id)
        ))
        .returning();

      return result[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { id: number } }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Delete logs first
      await db
        .delete(awarenessLogs)
        .where(and(
          eq(awarenessLogs.awarenessId, input.id),
          eq(awarenessLogs.userId, ctx.user!.id)
        ));

      // Delete item
      await db
        .delete(awarenessItems)
        .where(and(
          eq(awarenessItems.id, input.id),
          eq(awarenessItems.userId, ctx.user!.id)
        ));

      return { success: true };
    }),

  addLog: protectedProcedure
    .input(
      z.object({
        awarenessId: z.number(),
        logType: z.enum(["success", "failure", "insight"]),
        content: z.string().min(1),
        loggedAt: z.string().optional(), // ISO date string or undefined for now
      })
    )
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: any }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const now = new Date();
      const loggedDate = input.loggedAt ? new Date(input.loggedAt) : now;

      const newLog = await db
        .insert(awarenessLogs)
        .values({
          awarenessId: input.awarenessId,
          userId: ctx.user!.id,
          logType: input.logType,
          content: input.content.trim(),
          loggedAt: loggedDate,
          createdAt: now,
        })
        .returning();

      // Update the parent item's updatedAt timestamp
      await db
        .update(awarenessItems)
        .set({ updatedAt: now })
        .where(and(
          eq(awarenessItems.id, input.awarenessId),
          eq(awarenessItems.userId, ctx.user!.id)
        ));

      return newLog[0];
    }),

  deleteLog: protectedProcedure
    .input(z.object({ logId: z.number(), awarenessId: z.number() }))
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { logId: number; awarenessId: number } }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .delete(awarenessLogs)
        .where(and(
          eq(awarenessLogs.id, input.logId),
          eq(awarenessLogs.userId, ctx.user!.id)
        ));

      return { success: true };
    }),

  togglePractice: protectedProcedure
    .input(
      z.object({
        awarenessId: z.number(),
        date: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { awarenessId: number; date?: string } }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const todayStr = input.date || new Date().toISOString().slice(0, 10);
      const now = new Date();

      // Check if existing practice record exists for this item on this date
      const existing = await db
        .select()
        .from(awarenessPractices)
        .where(and(
          eq(awarenessPractices.userId, ctx.user!.id),
          eq(awarenessPractices.awarenessId, input.awarenessId),
          eq(awarenessPractices.date, todayStr)
        ));

      if (existing.length > 0) {
        // Toggle OFF (remove practice)
        await db
          .delete(awarenessPractices)
          .where(eq(awarenessPractices.id, existing[0].id));

        return { success: true, practiced: false, awarenessId: input.awarenessId };
      } else {
        // Toggle ON (insert practice)
        await db
          .insert(awarenessPractices)
          .values({
            userId: ctx.user!.id,
            awarenessId: input.awarenessId,
            date: todayStr,
            createdAt: now,
          });

        return { success: true, practiced: true, awarenessId: input.awarenessId };
      }
    }),

  merge: protectedProcedure
    .input(
      z.object({
        sourceId: z.number(), // The item to merge and archive
        targetId: z.number(), // The destination item
      })
    )
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { sourceId: number; targetId: number } }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify both items belong to user
      const source = await db
        .select()
        .from(awarenessItems)
        .where(and(
          eq(awarenessItems.id, input.sourceId),
          eq(awarenessItems.userId, ctx.user!.id)
        ))
        .then((res: any) => res[0]);

      const target = await db
        .select()
        .from(awarenessItems)
        .where(and(
          eq(awarenessItems.id, input.targetId),
          eq(awarenessItems.userId, ctx.user!.id)
        ))
        .then((res: any) => res[0]);

      if (!source || !target) {
        throw new Error("Source or target item not found");
      }

      // Reassign all logs from source to target
      await db
        .update(awarenessLogs)
        .set({ awarenessId: input.targetId })
        .where(and(
          eq(awarenessLogs.awarenessId, input.sourceId),
          eq(awarenessLogs.userId, ctx.user!.id)
        ));

      // Append source title/notes to target notes if relevant
      const now = new Date();
      const mergedNoteSnippet = `\n【統合元: 「${source.title}」${source.notes ? ` (メモ: ${source.notes})` : ""}】`;
      const newTargetNotes = (target.notes || "") + mergedNoteSnippet;

      await db
        .update(awarenessItems)
        .set({
          notes: newTargetNotes.trim(),
          updatedAt: now,
        })
        .where(eq(awarenessItems.id, input.targetId));

      // Mark source as archived with mergedIntoId
      await db
        .update(awarenessItems)
        .set({
          status: "archived",
          mergedIntoId: input.targetId,
          updatedAt: now,
        })
        .where(eq(awarenessItems.id, input.sourceId));

      return { success: true };
    }),

  listVisuals: protectedProcedure.query(async ({ ctx }: { ctx: TrpcContext }) => {
    await ensureAwarenessTables();
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const visuals = await db
      .select()
      .from(awarenessVisuals)
      .where(eq(awarenessVisuals.userId, ctx.user!.id))
      .orderBy(desc(awarenessVisuals.isPinned), desc(awarenessVisuals.createdAt));

    return visuals;
  }),

  saveVisual: protectedProcedure
    .input(
      z.object({
        dataUrl: z.string().min(1),
        title: z.string().optional(),
        sourceType: z.string().optional(),
        sourceTitle: z.string().optional(),
        sourceId: z.string().optional(),
        memo: z.string().optional(),
        isPinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: any }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const now = new Date();
      const [inserted] = await db
        .insert(awarenessVisuals)
        .values({
          userId: ctx.user!.id,
          title: input.title || "",
          dataUrl: input.dataUrl,
          sourceType: input.sourceType || "direct",
          sourceTitle: input.sourceTitle || "",
          sourceId: input.sourceId || "",
          memo: input.memo || "",
          isPinned: input.isPinned ? true : false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return inserted;
    }),

  updateVisual: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        memo: z.string().optional(),
        isPinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: any }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const updateData: any = {
        updatedAt: new Date(),
      };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.memo !== undefined) updateData.memo = input.memo;
      if (input.isPinned !== undefined) updateData.isPinned = input.isPinned;

      await db
        .update(awarenessVisuals)
        .set(updateData)
        .where(
          and(
            eq(awarenessVisuals.id, input.id),
            eq(awarenessVisuals.userId, ctx.user!.id)
          )
        );

      return { success: true };
    }),

  deleteVisual: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { id: number } }) => {
      await ensureAwarenessTables();
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .delete(awarenessVisuals)
        .where(
          and(
            eq(awarenessVisuals.id, input.id),
            eq(awarenessVisuals.userId, ctx.user!.id)
          )
        );

      return { success: true };
    }),
});
