import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getDb } from "../db.js";
import {
  dailyBulletinBoards,
  quests,
  questHistory,
  memos,
  diarySparkReports,
  monthlyGoals,
} from "../../drizzle/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm.js";

interface ParsedSparkOutput {
  conditionScore: number;
  summary: string;
  analysis: string;
  kaizenSuggestions: string;
  companionMessage: string;
  rawReportMarkdown: string;
}

export const sparkRouter = router({
  getReport: protectedProcedure
    .input(
      z.object({
        targetDate: z.string(),
        periodType: z.enum(["daily", "weekly"]).optional().default("daily"),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [report] = await db
        .select()
        .from(diarySparkReports)
        .where(
          and(
            eq(diarySparkReports.userId, ctx.user!.id),
            eq(diarySparkReports.targetDate, input.targetDate),
            eq(diarySparkReports.periodType, input.periodType)
          )
        );

      return report || null;
    }),

  listHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(14),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const history = await db
        .select()
        .from(diarySparkReports)
        .where(eq(diarySparkReports.userId, ctx.user!.id))
        .orderBy(desc(diarySparkReports.targetDate))
        .limit(input.limit);

      return history;
    }),

  analyze: protectedProcedure
    .input(
      z.object({
        targetDate: z.string(),
        periodType: z.enum(["daily", "weekly"]).optional().default("daily"),
        force: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Check existing report if not forcing
      if (!input.force) {
        const [existing] = await db
          .select()
          .from(diarySparkReports)
          .where(
            and(
              eq(diarySparkReports.userId, ctx.user!.id),
              eq(diarySparkReports.targetDate, input.targetDate),
              eq(diarySparkReports.periodType, input.periodType)
            )
          );
        if (existing) return existing;
      }

      // 2. Collect context data
      // (a) Bulletin & Diary
      const [board] = await db
        .select()
        .from(dailyBulletinBoards)
        .where(
          and(
            eq(dailyBulletinBoards.userId, ctx.user!.id),
            eq(dailyBulletinBoards.date, input.targetDate)
          )
        );

      const diaryText = board?.diary?.trim() || "";
      const bulletinText = board?.content?.trim() || "";

      // (b) Quests / Tasks for the day
      const dayQuests = await db
        .select()
        .from(quests)
        .where(eq(quests.userId, ctx.user!.id));

      const clearedQuests = dayQuests.filter((q) => q.status === "cleared");
      const pendingQuests = dayQuests.filter((q) =>
        ["accepted", "challenging", "almost"].includes(q.status)
      );

      // (c) Recent KAIZEN memos
      const recentMemos = await db
        .select()
        .from(memos)
        .where(eq(memos.userId, ctx.user!.id))
        .orderBy(desc(memos.createdAt))
        .limit(5);

      // (d) Monthly Goal
      const currentMonth = input.targetDate.slice(0, 7);
      const [goal] = await db
        .select()
        .from(monthlyGoals)
        .where(
          and(
            eq(monthlyGoals.userId, ctx.user!.id),
            eq(monthlyGoals.month, currentMonth)
          )
        );

      // Check if there is any content to analyze
      if (!diaryText && !bulletinText && clearedQuests.length === 0) {
        throw new Error(
          "本日の日記やタスクの記録がまだありません。まずは日記やタスクを入力してからSpark考察を実行してください。"
        );
      }

      // 3. Perform AI analysis
      let parsedOutput: ParsedSparkOutput;

      try {
        const prompt = `あなたは「Quest Log」の焚き火の番人・メンターAIです。
ユーザーが本日記録した「日記」「日間メモ」「タスク実績」から、深い考察と自己理解を深めるSparkレポートを作成してください。

### 入力データ:
- 対象日: ${input.targetDate}
- 焚き火日記:
${diaryText || "（日記の記入なし）"}
- 日間掲示板（メモ）:
${bulletinText || "（メモの記入なし）"}
- 本月行動目標: ${goal?.content || "（未設定）"}
- 本日クリアしたタスク数: ${clearedQuests.length}件 (${clearedQuests.map((q) => q.questName).join(", ") || "なし"})
- 未完了・進行中タスク: ${pendingQuests.length}件 (${pendingQuests.map((q) => q.questName).join(", ") || "なし"})
- 最近のKAIZENメモ: ${recentMemos.map((m) => m.content).join(" / ") || "なし"}

### レポート作成の要件:
1. 感情・マインドのバイオリズム（充実感、疲れ、焦りなど）を察して温かく受け止める
2. 行動（タスク）と心理（日記）の連動を言語化する
3. 明日に繋がる具体的で小さなKAIZENアクションを2〜3点提案する
4. 焚き火の番人（ロボットや犬の仲間たち）として、読んだ後に心が安らぎ自信が湧く言葉を添える

必ず以下のJSON形式で回答してください:
{
  "conditionScore": 1〜5の数値 (5が最高コンディション),
  "summary": "1〜2行での総括・要約",
  "analysis": "心理バイオリズムと行動連動についての詳細な考察（2〜3段落）",
  "kaizenSuggestions": "明日試せる具体的なアクション提案（箇条書き）",
  "companionMessage": "焚き火の番人からのあたたかいメッセージ"
}`;

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "あなたはユーザーの思考を整理し前進を支える親身なAIパートナーです。JSON形式で誠実かつ温かい回答を行ってください。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          responseFormat: { type: "json_object" },
        });

        const rawContent =
          typeof llmResult.choices[0]?.message?.content === "string"
            ? llmResult.choices[0].message.content
            : JSON.stringify(llmResult.choices[0]?.message?.content || "{}");

        const json = JSON.parse(rawContent);

        const conditionScore = Math.min(5, Math.max(1, Number(json.conditionScore) || 3));
        const summary = String(json.summary || "本日の振り返りとインサイト");
        const analysis = String(json.analysis || "");
        const kaizenSuggestions = String(json.kaizenSuggestions || "");
        const companionMessage = String(
          json.companionMessage || "今日も一日お疲れ様でした。焚き火にあたってゆっくり休んでください。"
        );

        const rawReportMarkdown = `### ✨ [Spark レポート] ${input.targetDate}
**コンディション:** ${"★".repeat(conditionScore)}${"☆".repeat(5 - conditionScore)}

#### 📝 本日の総括
${summary}

#### 💡 考察とバイオリズム
${analysis}

#### 🛠 KAIZEN アクション提案
${kaizenSuggestions}

---
> 🤖 **焚き火の番人より**
> 「${companionMessage}」`;

        parsedOutput = {
          conditionScore,
          summary,
          analysis,
          kaizenSuggestions,
          companionMessage,
          rawReportMarkdown,
        };
      } catch (err: any) {
        console.warn("LLM invocation failed, using smart local fallback reflection:", err?.message);

        // Smart Local Fallback Analysis
        const hasDiary = diaryText.length > 0;
        const taskCount = clearedQuests.length;
        const score = taskCount >= 3 ? 5 : taskCount >= 1 ? 4 : hasDiary ? 3 : 2;

        const summary = hasDiary
          ? `「${diaryText.slice(0, 30)}...」の日記と、${taskCount}件のタスク実績から振り返りを行いました。`
          : `本日${taskCount}件のタスクを達成しました。`;

        const analysis = hasDiary
          ? `日記に思考を言語化できていること自体が素晴らしいセルフケアの一歩です。タスクのクリア状況（${taskCount}件）と合わせても、前進が実感できる一日となっています。夜は脳を休める時間を確保しましょう。`
          : `日々のタスクを着実に進められています。もし余力があれば、焚き火日記に感じたことや小さな出来事を1行でも書き留めると、より深い心理バイオリズムの分析が可能です。`;

        const kaizenSuggestions = `・明日の最優先タスク（FIX）を朝一番に1件だけ決めておく\n・作業の合間に15分の深呼吸や散歩（RELAX）を取り入れる\n・気付いたことをKAIZEN MEMOに記録してルール化する`;

        const companionMessage =
          "パチパチと薪がはぜる音が聞こえます。今日も一日しっかり歩みを進めましたね。温かい飲み物を飲んで、心身をゆるめてください。";

        const rawReportMarkdown = `### ✨ [Spark レポート] ${input.targetDate}
**コンディション:** ${"★".repeat(score)}${"☆".repeat(5 - score)}

#### 📝 本日の総括
${summary}

#### 💡 考察とバイオリズム
${analysis}

#### 🛠 KAIZEN アクション提案
${kaizenSuggestions}

---
> 🤖 **焚き火の番人より**
> 「${companionMessage}」

*(※ より高度なAI考察を行うには、.envにGEMINI_API_KEYまたはOPENAI_API_KEYを設定してください)*`;

        parsedOutput = {
          conditionScore: score,
          summary,
          analysis,
          kaizenSuggestions,
          companionMessage,
          rawReportMarkdown,
        };
      }

      // 4. Upsert into database
      const [existing] = await db
        .select()
        .from(diarySparkReports)
        .where(
          and(
            eq(diarySparkReports.userId, ctx.user!.id),
            eq(diarySparkReports.targetDate, input.targetDate),
            eq(diarySparkReports.periodType, input.periodType)
          )
        );

      if (existing) {
        await db
          .update(diarySparkReports)
          .set({
            conditionScore: parsedOutput.conditionScore,
            summary: parsedOutput.summary,
            analysis: parsedOutput.analysis,
            kaizenSuggestions: parsedOutput.kaizenSuggestions,
            companionMessage: parsedOutput.companionMessage,
            rawReportMarkdown: parsedOutput.rawReportMarkdown,
            createdAt: new Date(),
          })
          .where(eq(diarySparkReports.id, existing.id));

        const [updated] = await db
          .select()
          .from(diarySparkReports)
          .where(eq(diarySparkReports.id, existing.id));

        return updated;
      } else {
        const [inserted] = await db
          .insert(diarySparkReports)
          .values({
            userId: ctx.user!.id,
            targetDate: input.targetDate,
            periodType: input.periodType,
            conditionScore: parsedOutput.conditionScore,
            summary: parsedOutput.summary,
            analysis: parsedOutput.analysis,
            kaizenSuggestions: parsedOutput.kaizenSuggestions,
            companionMessage: parsedOutput.companionMessage,
            rawReportMarkdown: parsedOutput.rawReportMarkdown,
            createdAt: new Date(),
          })
          .returning();

        return inserted;
      }
    }),
});
