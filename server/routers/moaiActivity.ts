import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import type { TrpcContext } from "../_core/context.js";
import { moaiActivities } from "../../drizzle/schema.js";
import { getDb } from "../db.js";
import { eq, and, desc } from "drizzle-orm";

export const moaiActivityRouter = router({
    list: protectedProcedure
        .query(async ({ ctx }: { ctx: TrpcContext }) => {
            const db = await getDb();
            return db
                .select()
                .from(moaiActivities)
                .where(eq(moaiActivities.userId, ctx.user!.id))
                .orderBy(desc(moaiActivities.createdAt));
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
            const newActivity = await db
                .insert(moaiActivities)
                .values({
                    userId: ctx.user!.id,
                    insight: input.insight,
                    action: input.action || null,
                    date: input.date,
                })
                .returning();
            return newActivity[0];
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
                .update(moaiActivities)
                .set(updateData)
                .where(
                    and(
                        eq(moaiActivities.id, input.id),
                        eq(moaiActivities.userId, ctx.user!.id)
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
                .delete(moaiActivities)
                .where(
                    and(
                        eq(moaiActivities.id, input.id),
                        eq(moaiActivities.userId, ctx.user!.id)
                    )
                );
            return { success: true };
        }),

    toggleApplied: protectedProcedure
        .input(z.object({ id: z.number(), applied: z.boolean() }))
        .mutation(async ({ ctx, input }: { ctx: TrpcContext, input: { id: number; applied: boolean } }) => {
            const db = await getDb();
            const updated = await db
                .update(moaiActivities)
                .set({ applied: input.applied })
                .where(
                    and(
                        eq(moaiActivities.id, input.id),
                        eq(moaiActivities.userId, ctx.user!.id)
                    )
                )
                .returning();
            return updated[0];
        }),
});
