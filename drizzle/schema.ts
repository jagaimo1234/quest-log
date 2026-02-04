import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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

  // 開始日（任意）- クエストをいつから始めるか
  startDate: integer("startDate", { mode: "timestamp" }),

  // 期限（任意）
  deadline: integer("deadline", { mode: "timestamp" }),

  // モアイタイプ（1-8のランダム）
  moaiType: integer("moaiType").default(1).notNull(),

  // テンプレートから生成された場合のテンプレートID
  templateId: integer("templateId"),

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
  questType: text("questType", { enum: ["Daily", "Weekly", "Monthly", "Yearly", "Project", "Relax"] }).notNull(),

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

  // スプレッドシート同期フラグ
  isSynced: integer("isSynced", { mode: "boolean" }).default(false).notNull(),
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

