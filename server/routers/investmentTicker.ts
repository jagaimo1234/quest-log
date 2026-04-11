import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import type { TrpcContext } from "../_core/context.js";
import { investmentTickers } from "../../drizzle/schema.js";
import { getDb } from "../db.js";
import { eq, and, desc } from "drizzle-orm";

const STEP_KEYS = ["step1", "step2", "step3", "step4", "step5", "step6", "step7"] as const;
type StepKey = typeof STEP_KEYS[number];
const STATUSES = ["unstarted", "in_progress", "cleared", "failed"] as const;

export const investmentTickerRouter = router({
    list: protectedProcedure
        .query(async ({ ctx }: { ctx: TrpcContext }) => {
            const db = await getDb();
            return db
                .select()
                .from(investmentTickers)
                .where(eq(investmentTickers.userId, ctx.user!.id))
                .orderBy(desc(investmentTickers.createdAt));
        }),

    create: protectedProcedure
        .input(z.object({ ticker: z.string().min(1) }))
        .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { ticker: string } }) => {
            const db = await getDb();
            const now = new Date();
            const result = await db
                .insert(investmentTickers)
                .values({
                    userId: ctx.user!.id,
                    ticker: input.ticker.toUpperCase().trim(),
                    step1: "unstarted",
                    step2: "unstarted",
                    step3: "unstarted",
                    step4: "unstarted",
                    step5: "unstarted",
                    step6: "unstarted",
                    step7: "unstarted",
                    stopLossText: "-5%",
                    createdAt: now,
                    updatedAt: now,
                })
                .returning();
            return result[0];
        }),

    updateStep: protectedProcedure
        .input(z.object({
            id: z.number(),
            stepKey: z.enum(["step1", "step2", "step3", "step4", "step5", "step6", "step7"]),
            status: z.enum(["unstarted", "in_progress", "cleared", "failed"]),
        }))
        .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { id: number; stepKey: StepKey; status: string } }) => {
            const db = await getDb();
            const updateData: any = { updatedAt: new Date() };
            updateData[input.stepKey] = input.status;
            const result = await db
                .update(investmentTickers)
                .set(updateData)
                .where(
                    and(
                        eq(investmentTickers.id, input.id),
                        eq(investmentTickers.userId, ctx.user!.id)
                    )
                )
                .returning();
            return result[0];
        }),

    updateStopLoss: protectedProcedure
        .input(z.object({ id: z.number(), stopLossText: z.string() }))
        .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { id: number; stopLossText: string } }) => {
            const db = await getDb();
            const result = await db
                .update(investmentTickers)
                .set({ stopLossText: input.stopLossText, updatedAt: new Date() })
                .where(
                    and(
                        eq(investmentTickers.id, input.id),
                        eq(investmentTickers.userId, ctx.user!.id)
                    )
                )
                .returning();
            return result[0];
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { id: number } }) => {
            const db = await getDb();
            await db
                .delete(investmentTickers)
                .where(
                    and(
                        eq(investmentTickers.id, input.id),
                        eq(investmentTickers.userId, ctx.user!.id)
                    )
                );
            return { success: true };
        }),
});
