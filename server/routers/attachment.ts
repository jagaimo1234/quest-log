import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import type { TrpcContext } from "../_core/context.js";
import { getAttachments, createAttachment, deleteAttachment } from "../db.js";

export const attachmentRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        targetType: z.string(),
        targetId: z.string(),
      })
    )
    .query(async ({ ctx, input }: { ctx: TrpcContext; input: { targetType: string; targetId: string } }) => {
      return await getAttachments(ctx.user!.id, input.targetType, input.targetId);
    }),

  upload: protectedProcedure
    .input(
      z.object({
        targetType: z.string(),
        targetId: z.string(),
        dataUrl: z.string().min(1),
        fileName: z.string().optional(),
      })
    )
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: TrpcContext;
        input: { targetType: string; targetId: string; dataUrl: string; fileName?: string };
      }) => {
        return await createAttachment(
          ctx.user!.id,
          input.targetType,
          input.targetId,
          input.dataUrl,
          input.fileName
        );
      }
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { id: number } }) => {
      await deleteAttachment(ctx.user!.id, input.id);
      return { success: true };
    }),
});
