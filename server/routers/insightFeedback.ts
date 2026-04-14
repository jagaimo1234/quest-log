import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import type { TrpcContext } from "../_core/context.js";
import { insightFeedback } from "../../drizzle/schema.js";
import { getDb } from "../db.js";
import { eq, and, asc } from "drizzle-orm";

export const insightFeedbackRouter = router({
    list: protectedProcedure
        .input(z.object({ 
            targetType: z.enum(["daily", "moai"]), 
            targetId: z.number() 
        }))
        .query(async ({ ctx, input }: { ctx: TrpcContext, input: { targetType: string; targetId: number } }) => {
            const db = await getDb();
            return db
                .select()
                .from(insightFeedback)
                .where(
                    and(
                        eq(insightFeedback.targetType, input.targetType),
                        eq(insightFeedback.targetId, input.targetId)
                    )
                )
                .orderBy(asc(insightFeedback.createdAt));
        }),

    create: protectedProcedure
        .input(z.object({
            targetType: z.enum(["daily", "moai"]),
            targetId: z.number(),
            content: z.string().min(1)
        }))
        .mutation(async ({ ctx, input }: { ctx: TrpcContext, input: { targetType: string; targetId: number; content: string } }) => {
            const db = await getDb();
            const result = await db
                .insert(insightFeedback)
                .values({
                    userId: ctx.user!.id,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    content: input.content,
                })
                .returning();
            return result[0];
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }: { ctx: TrpcContext, input: { id: number } }) => {
            const db = await getDb();
            await db
                .delete(insightFeedback)
                .where(
                    and(
                        eq(insightFeedback.id, input.id),
                        eq(insightFeedback.userId, ctx.user!.id)
                    )
                );
            return { success: true };
        }),
});
