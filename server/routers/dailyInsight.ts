import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import type { TrpcContext } from "../_core/context.js";
import { dailyInsights } from "../../drizzle/schema.js";
import { getDb } from "../db.js";
import { eq, and, desc } from "drizzle-orm";

export const dailyInsightRouter = router({
    list: protectedProcedure
        .input(z.object({ date: z.string() }))
        .query(async ({ ctx, input }: { ctx: TrpcContext, input: { date: string } }) => {
            const db = await getDb();
            return db
                .select()
                .from(dailyInsights)
                .where(
                    and(
                        eq(dailyInsights.userId, ctx.user!.id),
                        eq(dailyInsights.date, input.date)
                    )
                )
                .orderBy(desc(dailyInsights.createdAt));
        }),

    create: protectedProcedure
        .input(
            z.object({
                insight: z.string().min(1),
                action: z.string().optional(),
                date: z.string(),
            })
        )
        .mutation(async ({ ctx, input }: { ctx: TrpcContext, input: { insight: string; action?: string; date: string } }) => {
            const db = await getDb();
            const newInsight = await db
                .insert(dailyInsights)
                .values({
                    userId: ctx.user!.id,
                    insight: input.insight,
                    action: input.action || null,
                    date: input.date,
                })
                .returning();
            return newInsight[0];
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                insight: z.string().min(1).optional(),
                action: z.string().optional(),
                applied: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }: { ctx: TrpcContext, input: any }) => {
            const db = await getDb();

            const updateData: any = {};
            if (input.insight !== undefined) updateData.insight = input.insight;
            if (input.action !== undefined) updateData.action = input.action;
            if (input.applied !== undefined) updateData.applied = input.applied;

            const updated = await db
                .update(dailyInsights)
                .set(updateData)
                .where(
                    and(
                        eq(dailyInsights.id, input.id),
                        eq(dailyInsights.userId, ctx.user!.id)
                    )
                )
                .returning();
            return updated[0];
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }: { ctx: TrpcContext, input: { id: number } }) => {
            const db = await getDb();
            await db
                .delete(dailyInsights)
                .where(
                    and(
                        eq(dailyInsights.id, input.id),
                        eq(dailyInsights.userId, ctx.user!.id)
                    )
                );
            return { success: true };
        }),

    toggleApplied: protectedProcedure
        .input(z.object({ id: z.number(), applied: z.boolean() }))
        .mutation(async ({ ctx, input }: { ctx: TrpcContext, input: { id: number; applied: boolean } }) => {
            const db = await getDb();
            const updated = await db
                .update(dailyInsights)
                .set({ applied: input.applied })
                .where(
                    and(
                        eq(dailyInsights.id, input.id),
                        eq(dailyInsights.userId, ctx.user!.id)
                    )
                )
                .returning();
            return updated[0];
        }),
});
