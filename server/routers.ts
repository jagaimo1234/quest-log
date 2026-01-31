import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  createQuest,
  getActiveQuests,
  getInProgressQuests,
  getUnreceivedQuests,
  getQuestById,
  updateQuestStatus,
  updateQuestDeadline,
  getQuestTemplates,
  createQuestTemplate,
  updateTemplateStatus,
  generateQuestsFromTemplates,
  addToHistory,
  getQuestHistoryByDate,
  getUserProgression,
  updateUserProgression,
  resetStreakIfNeeded,
  calculateXpReward,
  updateQuest,
  updateQuestTemplate,
  deleteQuest,
  deleteTemplate,
  getQuestTemplateById,
  getTemplateCompletionCount,
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  migrateLegacyProjects,
  fixInconsistentData,
} from "./db";
import { SheetPayload, sendToSpreadsheet } from "./services/sheets";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================
  // クエスト管理
  // ============================================
  quest: router({
    /**
     * アクティブなクエスト一覧を取得
     * （cleared, cancelled 以外のすべてのクエスト）
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      // Auto-fix reversed data on list load to ensure consistency
      await fixInconsistentData(ctx.user.id);
      return getActiveQuests(ctx.user.id);
    }),

    /**
     * 受注中のクエスト一覧を取得
     * （accepted, challenging, almost のクエスト）
     */
    inProgress: protectedProcedure.query(async ({ ctx }) => {
      return getInProgressQuests(ctx.user.id);
    }),

    /**
     * 未受注のクエスト一覧を取得
     */
    unreceived: protectedProcedure.query(async ({ ctx }) => {
      return getUnreceivedQuests(ctx.user.id);
    }),

    /**
     * クエストを取得
     */
    get: protectedProcedure
      .input(z.object({ questId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getQuestById(input.questId, ctx.user.id);
      }),

    /**
     * クエストを作成
     * 
     * 要求仕様:
     * - クエスト名・案件名は任意（空でも登録可能）
     * - 入力必須はクエスト種別のみ
     */
    create: protectedProcedure
      .input(z.object({
        questName: z.string().optional().nullable(),
        projectName: z.string().optional().nullable(),
        questType: z.enum(["Daily", "Weekly", "Monthly", "Yearly", "Free", "Project", "Relax"]),
        difficulty: z.enum(["1", "2", "3"]).optional(),
        startDate: z.date().optional().nullable(),
        deadline: z.date().optional().nullable(),
        autoDeadline: z.boolean().optional(),
        templateId: z.number().optional().nullable(),
        status: z.enum(["unreceived", "accepted"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createQuest(ctx.user.id, input);
      }),

    /**
     * クエストステータスを更新
     */
    updateStatus: protectedProcedure
      .input(z.object({
        questId: z.number(),
        status: z.enum(["unreceived", "accepted", "challenging", "almost", "cleared", "paused", "cancelled", "failed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const quest = await updateQuestStatus(input.questId, ctx.user.id, input.status);

        // Helper to prepare spreadsheet payload
        const preparePayload = async (finalStatus: string, earnedXp: number = 0): Promise<SheetPayload> => {
          let executionType: "FIX" | "NON-FIX" = "FIX"; // Default to FIX
          let progress = "-"; // Default

          if (quest.templateId) {
            const template = await getQuestTemplateById(quest.templateId);
            if (template) {
              // FIX/NON-FIX Logic
              // Daily is always FIX (conceptually)
              if (quest.questType === "Daily") {
                executionType = "FIX";
              } else {
                const hasFixSetting = (template.daysOfWeek && template.daysOfWeek !== "[]") ||
                  (template.weeksOfMonth && template.weeksOfMonth !== "[]") ||
                  (template.datesOfMonth && template.datesOfMonth !== "[]") ||
                  template.monthOfYear;
                executionType = hasFixSetting ? "FIX" : "NON-FIX";
              }

              // Progress Logic
              // Count how many times cleared in this period
              const currentCount = await getTemplateCompletionCount(template.id, quest.questType);
              // If this action is "cleared", the history record is already inserted? 
              // Wait, updateQuestStatus does NOT insert history. 
              // The history is inserted via addToHistory inside the if blocks below.
              // So if we are about to insert "cleared", the count from DB will NOT include this one yet?
              // `getTemplateCompletionCount` counts from `questHistory`.
              // So we should add +1 if the current action is 'cleared'.

              const count = currentCount;
              progress = `${count}/${template.frequency || 1}`;
            }
          } else {
            // Manual quest: Daily/Free/Project usually don't have frequency per se, default to 1/1 ?
            // Or just leave as "-" or "1/1"
            progress = "1/1";
          }



          return {
            recordedDate: new Date().toISOString().split('T')[0],
            questName: quest.questName,
            projectName: quest.projectName,
            questType: quest.questType,
            finalStatus: finalStatus,
            plannedTimeSlot: quest.plannedTimeSlot,
            executionType: executionType,
            progress: progress
          };
        };

        // クリア時の処理
        if (input.status === "cleared") {
          const xpReward = calculateXpReward(quest.difficulty);

          // XPを加算し、ストリークを更新
          await updateUserProgression(ctx.user.id, {
            xpGain: xpReward,
            questCleared: true,
          });

          // 履歴に追加
          await addToHistory(ctx.user.id, input.questId, {
            questName: quest.questName,
            projectName: quest.projectName,
            questType: quest.questType,
            difficulty: quest.difficulty,
            finalStatus: "cleared",
            xpEarned: xpReward,
            templateId: quest.templateId,
            plannedTimeSlot: quest.plannedTimeSlot,
          });

          // スプレッドシートに送信
          const payload = await preparePayload("cleared", xpReward);
          await sendToSpreadsheet(payload);

          return { ...quest, xpEarned: xpReward };
        }

        // 中断、キャンセル、失敗時の処理
        if (input.status === "paused" || input.status === "cancelled" || input.status === "failed") {
          await addToHistory(ctx.user.id, input.questId, {
            questName: quest.questName,
            projectName: quest.projectName,
            questType: quest.questType,
            difficulty: quest.difficulty,
            finalStatus: input.status,
            xpEarned: 0,
            templateId: quest.templateId,
            plannedTimeSlot: quest.plannedTimeSlot,
          });

          const payload = await preparePayload(input.status, 0);
          await sendToSpreadsheet(payload);
        }

        return quest;
      }),

    /**
     * クエスト期限を更新
     * 
     * 要求仕様:
     * - 期限は登録時・受注時・進行中いつでも変更可能
     */
    updateDeadline: protectedProcedure
      .input(z.object({
        questId: z.number(),
        deadline: z.date().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateQuestDeadline(input.questId, ctx.user.id, input.deadline || null);
      }),

    /**
     * クエスト情報を更新（編集）
     */
    update: protectedProcedure
      .input(z.object({
        questId: z.number(),
        questName: z.string().optional().nullable(),
        projectName: z.string().optional().nullable(),
        questType: z.enum(["Daily", "Weekly", "Monthly", "Yearly", "Free", "Relax"]).optional(),
        difficulty: z.enum(["1", "2", "3"]).optional(),
        deadline: z.date().optional().nullable(),
        plannedTimeSlot: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateQuest(input.questId, ctx.user.id, input);
      }),

    /**
     * クエストを削除
     */
    delete: protectedProcedure
      .input(z.object({ questId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteQuest(input.questId, ctx.user.id);
      }),
  }),

  // ============================================
  // プロジェクト管理 (Hierarchy)
  // ============================================
  project: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Auto-migrate legacy projects on access
      await migrateLegacyProjects(ctx.user.id);
      return getProjects(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional().nullable(),
        startDate: z.string().optional().nullable(), // ISO string from frontend
        endDate: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createProject(ctx.user.id, {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().optional(),
        description: z.string().optional().nullable(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
        status: z.enum(["active", "archived"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateProject(input.projectId, ctx.user.id, {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteProject(input.projectId, ctx.user.id);
      }),
  }),

  // ============================================
  // テンプレート管理
  // ============================================
  template: router({
    /**
     * テンプレート一覧を取得
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getQuestTemplates(ctx.user.id);
    }),

    /**
     * テンプレートを作成
     */
    create: protectedProcedure
      .input(z.object({
        questName: z.string().optional().nullable(),
        projectName: z.string().optional().nullable(),
        questType: z.enum(["Daily", "Weekly", "Monthly", "Yearly", "Project", "Relax"]),
        difficulty: z.enum(["1", "2", "3"]).optional(),
        frequency: z.number().min(1).optional(),
        daysOfWeek: z.array(z.number()).optional().nullable(),
        weeksOfMonth: z.array(z.number()).optional().nullable(),
        datesOfMonth: z.array(z.number()).optional().nullable(),
        monthOfYear: z.number().min(1).max(12).optional().nullable(),
        startDate: z.date().optional().nullable(),
        endDate: z.date().optional().nullable(),
        projectId: z.number().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createQuestTemplate(ctx.user.id, input);
      }),

    /**
     * テンプレートの有効/無効を切り替え
     */
    toggleActive: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateTemplateStatus(input.templateId, ctx.user.id, input.isActive);
      }),

    /**
     * テンプレートからクエストを自動生成
     */
    generate: protectedProcedure
      .mutation(async ({ ctx }) => {
        return generateQuestsFromTemplates(ctx.user.id);
      }),

    /**
     * テンプレート情報を更新（編集）
     */
    update: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        questName: z.string().optional().nullable(),
        projectName: z.string().optional().nullable(),
        questType: z.enum(["Daily", "Weekly", "Monthly", "Yearly", "Project", "Relax"]).optional(),
        difficulty: z.enum(["1", "2", "3"]).optional(),
        frequency: z.number().min(1).optional(),
        daysOfWeek: z.array(z.number()).optional().nullable(),
        weeksOfMonth: z.array(z.number()).optional().nullable(),
        datesOfMonth: z.array(z.number()).optional().nullable(),
        monthOfYear: z.number().min(1).max(12).optional().nullable(),
        startDate: z.date().optional().nullable(),
        endDate: z.date().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateQuestTemplate(input.templateId, ctx.user.id, input);
      }),

    /**
     * テンプレートを削除
     */
    delete: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteTemplate(input.templateId, ctx.user.id);
      }),
  }),

  // ============================================
  // 履歴管理
  // ============================================
  history: router({
    /**
     * 履歴を取得
     * 
     * 要求仕様:
     * - 日付＋曜日ごとの表示
     */
    list: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getQuestHistoryByDate(
          ctx.user.id,
          input?.startDate,
          input?.endDate
        );
      }),
  }),

  // ============================================
  // ユーザー進行状況管理
  // ============================================
  progression: router({
    /**
     * 進行状況を取得
     */
    get: protectedProcedure.query(async ({ ctx }) => {
      // ストリークリセットチェック
      await resetStreakIfNeeded(ctx.user.id);
      return getUserProgression(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
