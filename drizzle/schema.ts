import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * ユーザーテーブル
 * Manus OAuth認証用（将来拡張可能）
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * クエストテーブル
 */
export const quests = sqliteTable("quests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),

  // クエスト名（任意）→ 何をするか
  questName: text("questName"),

  // 案件名（任意）→ 何についてのクエストか（例：MOAI活動、仕事、生活など）
  projectName: text("projectName"),

  // クエスト種別（必須）: Daily/Weekly/Monthly/Yearly/Free/Project
  questType: text("questType", { enum: ["Daily", "Weekly", "Monthly", "Yearly", "Free", "Project", "Relax"] }).notNull(),

  // 難易度: ★〜★★★
  difficulty: text("difficulty", { enum: ["1", "2", "3"] }).default("1").notNull(),

  // クエストステータス（ライフサイクル）
  status: text("status", {
    enum: [
      "unreceived",
      "accepted",
      "challenging",
      "almost",
      "cleared",
      "paused",
      "cancelled",
      "failed"
    ]
  }).default("unreceived").notNull(),

  // Time Slot (Intention Log): e.g. "06:00-07:00"
  plannedTimeSlot: text("plannedTimeSlot"),

  // メモ（詳細内容など、例：読んだ本のタイトル）
  note: text("note"),

  // One-off等のマルチステップ用: 見込み回数と現在回数
  targetCount: integer("targetCount").default(1).notNull(),
  currentCount: integer("currentCount").default(0).notNull(),

  // 開始日（任意）- クエストをいつから始めるか
  startDate: integer("startDate", { mode: "timestamp" }),

  // 期限（任意）
  deadline: integer("deadline", { mode: "timestamp" }),

  // モアイタイプ（1-8のランダム）
  moaiType: integer("moaiType").default(1).notNull(),

  // テンプレートから生成された場合のテンプレートID
  templateId: integer("templateId"),

  // 表示順序（同期用）
  displayOrder: integer("displayOrder").default(0).notNull(),

  // タイムスタンプ
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  acceptedAt: integer("acceptedAt", { mode: "timestamp" }),
  clearedAt: integer("clearedAt", { mode: "timestamp" }),
});

export type Quest = typeof quests.$inferSelect;
export type InsertQuest = typeof quests.$inferInsert;

/**
 * クエストテンプレートテーブル
 */
export const questTemplates = sqliteTable("quest_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  projectId: integer("projectId"), // 親プロジェクトID

  // クエスト名（任意）
  questName: text("questName"),

  // 案件名（任意）
  projectName: text("projectName"),

  // クエスト種別
  questType: text("questType", { enum: ["Daily", "Weekly", "Monthly", "Yearly", "Project", "Relax", "Free"] }).notNull(),

  // 難易度
  difficulty: text("difficulty", { enum: ["1", "2", "3"] }).default("1").notNull(),

  // 頻度 (回数)
  frequency: integer("frequency").default(1).notNull(),

  // Weekly用: 曜日（0=日曜〜6=土曜） - JSON配列として保存 e.g. "[1,3,5]"
  daysOfWeek: text("daysOfWeek"),

  // Monthly用: 週（1=第1週〜5=月末週） - JSON配列として保存 e.g. "[1,3]"
  weeksOfMonth: text("weeksOfMonth"),

  // Monthly用: 日付（1-31） - JSON配列として保存 e.g. "[1,15,30]"
  datesOfMonth: text("datesOfMonth"),

  // Yearly用: 月（1-12）
  monthOfYear: integer("monthOfYear"),

  // 期間設定 (Project用)
  startDate: integer("startDate", { mode: "timestamp" }),
  endDate: integer("endDate", { mode: "timestamp" }),

  // 有効/無効 (SQLite boolean is 0/1 integer)
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),

  // 表示順
  displayOrder: integer("displayOrder").default(0).notNull(),

  // 自動スケジュール時刻 (0-23, null=未設定) - Daily専用
  scheduledHour: integer("scheduledHour"),

  // 最後に生成した日付
  lastGeneratedAt: integer("lastGeneratedAt", { mode: "timestamp" }),

  // タイムスタンプ
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type QuestTemplate = typeof questTemplates.$inferSelect;
export type InsertQuestTemplate = typeof questTemplates.$inferInsert;

/**
 * クエスト履歴テーブル
 */
export const questHistory = sqliteTable("quest_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  questId: integer("questId").notNull(),
  // テンプレート由来の場合のID
  templateId: integer("templateId"),

  // クエスト情報のスナップショット
  questName: text("questName"),
  projectName: text("projectName"),
  questType: text("questType", { enum: ["Daily", "Weekly", "Monthly", "Yearly", "Free", "Project", "Relax"] }).notNull(),
  difficulty: text("difficulty", { enum: ["1", "2", "3"] }).default("1").notNull(),

  // 最終ステータス
  finalStatus: text("finalStatus", { enum: ["cleared", "paused", "cancelled", "incomplete", "failed"] }).notNull(),

  // 獲得XP（クリア時のみ）
  xpEarned: integer("xpEarned").default(0).notNull(),

  // 記録日時
  recordedAt: integer("recordedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),

  // 記録日（曜日別表示用）
  recordedDate: text("recordedDate").notNull(), // YYYY-MM-DD形式

  // 時間枠ログ（分析用）
  plannedTimeSlot: text("plannedTimeSlot"),

  // メモ（完了時の記録）
  note: text("note"),
});

export type QuestHistory = typeof questHistory.$inferSelect;
export type InsertQuestHistory = typeof questHistory.$inferInsert;

/**
 * ユーザー進行状況テーブル
 */
export const userProgression = sqliteTable("user_progression", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),

  // 累計XP
  totalXp: integer("totalXp").default(0).notNull(),

  // 現在のストリーク（連続クリア日数）
  currentStreak: integer("currentStreak").default(0).notNull(),

  // 最長ストリーク
  longestStreak: integer("longestStreak").default(0).notNull(),

  // 最後にクエストをクリアした日付（YYYY-MM-DD形式）
  lastClearedDate: text("lastClearedDate"),

  // タイムスタンプ
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type UserProgression = typeof userProgression.$inferSelect;
export type InsertUserProgression = typeof userProgression.$inferInsert;

/**
 * プロジェクト（大枠）テーブル
 */
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),

  // プロジェクト名（例：マルシェ出店）
  name: text("name").notNull(),

  // メモ
  description: text("description"),

  // 期間
  startDate: integer("startDate", { mode: "timestamp" }),
  endDate: integer("endDate", { mode: "timestamp" }),

  status: text("status", { enum: ["active", "archived"] }).default("active").notNull(),

  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * 改善メモテーブル
 */
export const memos = sqliteTable("memos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  content: text("content").notNull(),
  action: text("action"),
  done: integer("done", { mode: "boolean" }).default(false).notNull(),
  likes: integer("likes").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type Memo = typeof memos.$inferSelect;
export type InsertMemo = typeof memos.$inferInsert;

/**
 * 日次設定テーブル (Daily Config)
 */
export const dailyConfig = sqliteTable("daily_config", {
  userId: integer("userId").notNull(),
  date: text("date").notNull(), // format: YYYY-MM-DD
  jobModeDisabled: integer("jobModeDisabled", { mode: "boolean" }).default(false).notNull(),
  lunchCount: integer("lunchCount").default(0).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type DailyConfig = typeof dailyConfig.$inferSelect;
export type InsertDailyConfig = typeof dailyConfig.$inferInsert;

/**
 * 日次インサイトテーブル (Daily Insights)
 */
export const dailyInsights = sqliteTable("daily_insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  insight: text("insight").notNull(),
  action: text("action"),
  applied: integer("applied", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  date: text("date").notNull(), // format: YYYY-MM-DD
});

export type DailyInsight = typeof dailyInsights.$inferSelect;
export type InsertDailyInsight = typeof dailyInsights.$inferInsert;

/**
 * 読書管理テーブル (Reading Books)
 */
export const readingBooks = sqliteTable("reading_books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["reading", "completed"] }).default("reading").notNull(),
  rating: integer("rating"),
  review: text("review"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
});

export type ReadingBook = typeof readingBooks.$inferSelect;
export type InsertReadingBook = typeof readingBooks.$inferInsert;

/**
 * 映画記録テーブル (Watching Movies)
 */
export const watchingMovies = sqliteTable("watching_movies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["watching", "completed"] }).default("watching").notNull(),
  rating: integer("rating"),
  review: text("review"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
});

export type WatchingMovie = typeof watchingMovies.$inferSelect;
export type InsertWatchingMovie = typeof watchingMovies.$inferInsert;

/**
 * 掲示板テーブル (Daily Bulletin Board)
 */
export const dailyBulletinBoards = sqliteTable("daily_bulletin_boards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  date: text("date").notNull(),
  content: text("content").notNull().default(""),   // 自由欄
  diary: text("diary").notNull().default(""),        // 日記欄
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => {
  return {
    userDateUnique: uniqueIndex("user_date_idx").on(table.userId, table.date),
  }
});

export type DailyBulletinBoard = typeof dailyBulletinBoards.$inferSelect;
export type InsertDailyBulletinBoard = typeof dailyBulletinBoards.$inferInsert;

/**
 * 月間目標テーブル (Monthly Goals)
 */
export const monthlyGoals = sqliteTable("monthly_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  month: text("month").notNull(), // 'YYYY-MM'
  content: text("content").notNull().default(""),       // 行動目標
  awareness: text("awareness").notNull().default(""),   // 意識目標
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => {
  return {
    userMonthUnique: uniqueIndex("user_month_idx").on(table.userId, table.month),
  }
});

export type MonthlyGoal = typeof monthlyGoals.$inferSelect;
export type InsertMonthlyGoal = typeof monthlyGoals.$inferInsert;

/**
 * モアイ活動記録テーブル (Moai Activity)
 */
export const moaiActivities = sqliteTable("moai_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  insight: text("insight").notNull(),
  action: text("action"),
  date: text("date").notNull(), // 'YYYY-MM-DD'
  applied: integer("applied", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type MoaiActivity = typeof moaiActivities.$inferSelect;
export type InsertMoaiActivity = typeof moaiActivities.$inferInsert;

/**
 * 投資フロー管理テーブル (Investment Tickers)
 */
export const investmentTickers = sqliteTable("investment_tickers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  ticker: text("ticker").notNull(),

  // ステップステータス ('unstarted', 'in_progress', 'cleared', 'failed')
  step1: text("step1").default("unstarted").notNull(),
  step2: text("step2").default("unstarted").notNull(),
  step3: text("step3").default("unstarted").notNull(),
  step4: text("step4").default("unstarted").notNull(),
  step5: text("step5").default("unstarted").notNull(),
  step6: text("step6").default("unstarted").notNull(),
  step7: text("step7").default("unstarted").notNull(),

  // カスタム入力
  stopLossText: text("stopLossText").default("-5%").notNull(),

  // 期限管理用
  step1StartedAt: integer("step1StartedAt", { mode: "timestamp" }),

  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type InvestmentTicker = typeof investmentTickers.$inferSelect;
export type InsertInvestmentTicker = typeof investmentTickers.$inferInsert;

/**
 * インサイトフィードバック（コメント）テーブル
 */
export const insightFeedback = sqliteTable("insight_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  targetType: text("targetType").notNull(), // 'daily', 'moai', or 'kaizen'
  targetId: integer("targetId").notNull(),
  content: text("content").notNull(),
  likes: integer("likes").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type InsightFeedback = typeof insightFeedback.$inferSelect;
export type InsertInsightFeedback = typeof insightFeedback.$inferInsert;

/**
 * 添付ファイル（写真・画像）テーブル
 * 目標・掲示板・日記・インサイト等で共通利用
 */
export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  targetType: text("targetType").notNull(), // 'goal', 'bulletin', 'diary', 'insight', 'moai', 'kaizen'
  targetId: text("targetId").notNull(),     // 日付 'YYYY-MM-DD', 'YYYY-MM' または レコードID
  dataUrl: text("dataUrl").notNull(),       // WebP圧縮済みのBase64画像データ
  fileName: text("fileName"),               // ファイル名（任意）
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

/**
 * 焚き火日記 Spark考察レポートテーブル
 */
export const diarySparkReports = sqliteTable("diary_spark_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  targetDate: text("targetDate").notNull(),      // 'YYYY-MM-DD'
  periodType: text("periodType").default("daily").notNull(), // 'daily' | 'weekly'
  conditionScore: integer("conditionScore").default(3).notNull(), // 1〜5
  summary: text("summary").default("").notNull(),                 // 要約
  analysis: text("analysis").default("").notNull(),               // 考察本文
  kaizenSuggestions: text("kaizenSuggestions").default("").notNull(), // KAIZEN提案 (JSON or text)
  companionMessage: text("companionMessage").default("").notNull(),   // 焚き火の番人メッセージ
  rawReportMarkdown: text("rawReportMarkdown").default("").notNull(), // Markdown全文
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => {
  return {
    userTargetPeriodUnique: uniqueIndex("user_target_period_idx").on(table.userId, table.targetDate, table.periodType),
  };
});

export type DiarySparkReport = typeof diarySparkReports.$inferSelect;
export type InsertDiarySparkReport = typeof diarySparkReports.$inferInsert;

/**
 * 意識を育てる（Awareness Items）テーブル
 * どこからでも文章を選択して「昇格」させた意識
 */
export const awarenessItems = sqliteTable("awareness_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),              // 選択された文章（意識の中心）
  contextBefore: text("contextBefore"),        // 前後の文脈
  contextAfter: text("contextAfter"),
  sourceType: text("sourceType"),              // 'quest' | 'diary' | 'kaizen' | 'bulletin' | 'goal' | 'memo' | 'general'
  sourceId: text("sourceId"),                  // 元のIDや日付
  sourceTitle: text("sourceTitle"),            // 元のタイトル
  sourceUrl: text("sourceUrl"),                // 元の画面リンク
  status: text("status", { enum: ["active", "standby", "anchored", "archived"] }).default("standby").notNull(), // active: 育成中, standby: 待機中, anchored: 定着済み
  retentionStage: text("retentionStage", { enum: ["sprout", "growing", "anchored"] }).default("sprout").notNull(), // sprout: 芽生え, growing: 成長中, anchored: 定着
  color: text("color").default("amber"),
  notes: text("notes"),                        // 自由メモ・対策など
  mergedIntoId: integer("mergedIntoId"),       // 統合先のID
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type AwarenessItem = typeof awarenessItems.$inferSelect;
export type InsertAwarenessItem = typeof awarenessItems.$inferInsert;

/**
 * 意識の実例ログ（Awareness Logs）テーブル
 * 日常での成功・失敗・気づきのエピソード
 */
export const awarenessLogs = sqliteTable("awareness_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  awarenessId: integer("awarenessId").notNull(),
  userId: integer("userId").notNull(),
  logType: text("logType", { enum: ["success", "failure", "insight"] }).notNull(), // 成功 / 失敗 / 気づき
  content: text("content").notNull(),          // 一言実例メモ
  loggedAt: integer("loggedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type AwarenessLog = typeof awarenessLogs.$inferSelect;
export type InsertAwarenessLog = typeof awarenessLogs.$inferInsert;

/**
 * 意識のインフォビジュアル（Awareness Visuals）テーブル
 * 日記や掲示板から昇格、あるいは直接登録された習慣・気づき・行動の図解画像
 */
export const awarenessVisuals = sqliteTable("awareness_visuals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").default(""),              // 画像タイトル・要約（任意）
  dataUrl: text("dataUrl").notNull(),            // WebP画像データ
  sourceType: text("sourceType"),                // 'bulletin' | 'diary' | 'direct' | 'goal' など
  sourceTitle: text("sourceTitle"),              // 出典元タイトル（例: '日間掲示板 2026-09-23'）
  sourceId: text("sourceId"),                    // 出典元ID / 日付など
  memo: text("memo").default(""),                // 気づき・行動指針メモ
  isPinned: integer("isPinned", { mode: "boolean" }).default(false).notNull(), // ピン留め（常時フォーカス）
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type AwarenessVisual = typeof awarenessVisuals.$inferSelect;
export type InsertAwarenessVisual = typeof awarenessVisuals.$inferInsert;

/**
 * 意識の実践・撃ち落とし（Awareness Practices）テーブル
 * 日々の意識できたチェック（定着トレイへの落下）履歴
 */
export const awarenessPractices = sqliteTable("awareness_practices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  awarenessId: integer("awarenessId").notNull(),
  date: text("date").notNull(), // 'YYYY-MM-DD'
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => {
  return {
    userAwarenessDateUnique: uniqueIndex("user_awareness_date_idx").on(table.userId, table.awarenessId, table.date),
  };
});

export type AwarenessPractice = typeof awarenessPractices.$inferSelect;
export type InsertAwarenessPractice = typeof awarenessPractices.$inferInsert;

