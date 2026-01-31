import { eq, and, desc, gte, lte, or, isNull, sql, isNotNull, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { format } from "date-fns";
import {
  InsertUser,
  users,
  quests,
  questTemplates,
  questHistory,
  userProgression,
  Quest,
  QuestTemplate,
  QuestHistory,
  UserProgression,
  InsertQuest,
  InsertQuestTemplate,
  InsertQuestHistory,
  projects,
  InsertProject,
  Project,
} from "../drizzle/schema";
import { ENV } from './_core/env';

// Database Instance (Dual Support: SQLite & Turso)
let _db: any;

const dbUrl = process.env.DATABASE_URL || 'file:sqlite.db';

if (dbUrl.startsWith("libsql://")) {
  console.log("Using Turso (LibSQL) Database");
  const client = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  _db = drizzle(client);
} else {
  // Local Development
  console.log("Using Local SQLite Database");
  const sqlite = new Database('sqlite.db');
  _db = drizzleSqlite(sqlite);
}

export async function getDb() {
  return _db;
}

// ============================================
// ユーザー管理
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// クエスト管理
// ============================================

/**
 * ランダムなモアイタイプを生成（1-8）
 */
function getRandomMoaiType(): number {
  return Math.floor(Math.random() * 8) + 1;
}

/**
 * クエスト種別に基づいて自動期限を計算
 * 
 * 要求仕様:
 * - Daily: 当日中（23:59:59）
 * - Weekly: 週末（日曜23:59:59）
 * - Monthly: 月末（23:59:59）
 * - Yearly: 年末（12/31 23:59:59）
 * - Free: 期限なし
 */
function calculateAutoDeadline(questType: string): Date | null {
  const now = new Date();

  switch (questType) {
    case "Daily": {
      const deadline = new Date(now);
      deadline.setHours(23, 59, 59, 999);
      return deadline;
    }
    case "Weekly": {
      const deadline = new Date(now);
      const dayOfWeek = deadline.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      deadline.setDate(deadline.getDate() + daysUntilSunday);
      deadline.setHours(23, 59, 59, 999);
      return deadline;
    }
    case "Monthly": {
      const deadline = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      deadline.setHours(23, 59, 59, 999);
      return deadline;
    }
    case "Yearly": {
      const deadline = new Date(now.getFullYear(), 11, 31);
      deadline.setHours(23, 59, 59, 999);
      return deadline;
    }
    case "Relax":
    case "Free":
    default:
      return null;
  }
}

/**
 * クエストを作成
 * 
 * 要求仕様:
 * - クエスト名・案件名は任意（空でも登録可能）
 * - 入力必須はクエスト種別のみ
 * - 期限は任意（設定しなくても良い）
 */
export async function createQuest(
  userId: number,
  input: {
    questName?: string | null;
    projectName?: string | null;
    questType: "Daily" | "Weekly" | "Monthly" | "Yearly" | "Free" | "Project" | "Relax";
    difficulty?: "1" | "2" | "3";
    startDate?: Date | null; // クエストをいつから始めるか
    deadline?: Date | null;
    templateId?: number | null;
    autoDeadline?: boolean;
    status?: "unreceived" | "accepted"; // Allow immediate accept
  }
): Promise<Quest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 期限の決定
  let deadline: Date | null = null;
  if (input.deadline !== undefined) {
    deadline = input.deadline;
  } else if (input.autoDeadline !== false) {
    // デフォルトで自動期限を設定
    deadline = calculateAutoDeadline(input.questType);
  }

  const values: InsertQuest = {
    userId,
    questName: input.questName || null,
    projectName: input.projectName || null,
    questType: input.questType,
    difficulty: input.difficulty || "1",
    status: input.status || "unreceived",
    startDate: input.startDate || null,
    deadline: deadline,
    moaiType: getRandomMoaiType(),
    templateId: input.templateId || null,
    acceptedAt: input.status === "accepted" ? new Date() : null,
  };

  const result = await db.insert(quests).values(values).returning();
  return result[0];
}

/**
 * アクティブなクエスト一覧を取得
 * （cleared, cancelled 以外のすべてのクエスト）
 */
export async function getActiveQuests(userId: number): Promise<Quest[]> {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db.select()
    .from(quests)
    .where(
      and(
        eq(quests.userId, userId),
        or(
          eq(quests.status, "unreceived"),
          eq(quests.status, "accepted"),
          eq(quests.status, "challenging"),
          eq(quests.status, "almost"),
          // Include Cleared/Failed only if updated today
          and(
            or(eq(quests.status, "cleared"), eq(quests.status, "failed")),
            gte(quests.updatedAt, today)
          )
        )
      )
    )
    .orderBy(desc(quests.createdAt));
}

/**
 * 受注中のクエスト一覧を取得
 * （accepted, challenging, almost のクエスト）
 */
export async function getInProgressQuests(userId: number): Promise<Quest[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(quests)
    .where(
      and(
        eq(quests.userId, userId),
        or(
          eq(quests.status, "accepted"),
          eq(quests.status, "challenging"),
          eq(quests.status, "almost")
        )
      )
    )
    .orderBy(desc(quests.createdAt));
}

/**
 * 未受注のクエスト一覧を取得
 */
export async function getUnreceivedQuests(userId: number): Promise<Quest[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(quests)
    .where(
      and(
        eq(quests.userId, userId),
        eq(quests.status, "unreceived")
      )
    )
    .orderBy(desc(quests.createdAt));
}

/**
 * クエストを取得
 */
export async function getQuestById(questId: number, userId: number): Promise<Quest | null> {
  const db = await getDb();
  if (!db) return null;

  const [quest] = await db.select()
    .from(quests)
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)));

  return quest || null;
}

/**
 * クエストステータスを更新
 * 
 * 要求仕様:
 * - unreceived → accepted（受注）
 * - accepted → challenging（チャレンジ開始）
 * - challenging → almost（もう少し）
 * - almost → cleared（クリア）
 * - 任意のステータス → paused（中断）
 * - 任意のステータス → cancelled（キャンセル）
 */
export async function updateQuestStatus(
  questId: number,
  userId: number,
  newStatus: "unreceived" | "accepted" | "challenging" | "almost" | "cleared" | "paused" | "cancelled" | "failed"
): Promise<Quest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<Quest> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  // 受注時刻を記録
  if (newStatus === "accepted") {
    updateData.acceptedAt = new Date();
  }

  // クリア時刻を記録
  if (newStatus === "cleared") {
    updateData.clearedAt = new Date();
  }

  await db.update(quests)
    .set(updateData)
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)));

  const [quest] = await db.select().from(quests).where(eq(quests.id, questId));
  return quest;
}

/**
 * クエスト期限を更新
 * 
 * 要求仕様:
 * - 期限は登録時・受注時・進行中いつでも変更可能
 * - 期限を超えても「失敗」ではない
 */
export async function updateQuestDeadline(
  questId: number,
  userId: number,
  deadline: Date | null
): Promise<Quest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quests)
    .set({ deadline, updatedAt: new Date() })
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)));

  const [quest] = await db.select().from(quests).where(eq(quests.id, questId));
  return quest;
}

/**
 * クエスト情報を更新（編集機能）
 */
export async function updateQuest(
  questId: number,
  userId: number,
  input: {
    questName?: string | null;
    projectName?: string | null;
    questType?: "Daily" | "Weekly" | "Monthly" | "Yearly" | "Free" | "Project" | "Relax";
    difficulty?: "1" | "2" | "3";
    deadline?: Date | null;
    plannedTimeSlot?: string | null;
  }
): Promise<Quest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<Quest> = {
    updatedAt: new Date(),
  };

  if (input.questName !== undefined) updateData.questName = input.questName;
  if (input.projectName !== undefined) updateData.projectName = input.projectName;
  if (input.questType !== undefined) updateData.questType = input.questType;
  if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;
  if (input.plannedTimeSlot !== undefined) updateData.plannedTimeSlot = input.plannedTimeSlot;
  if (input.deadline !== undefined) updateData.deadline = input.deadline;

  await db.update(quests)
    .set(updateData)
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)));

  const [quest] = await db.select().from(quests).where(eq(quests.id, questId));
  return quest;
}

/**
 * クエストを削除
 */
export async function deleteQuest(questId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(quests)
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)));
}

// ============================================
// テンプレート管理
// ============================================

/**
 * テンプレートを作成
 */
export async function createQuestTemplate(
  userId: number,
  input: {
    questName?: string | null;
    projectName?: string | null;
    questType: "Daily" | "Weekly" | "Monthly" | "Yearly" | "Project" | "Relax";
    difficulty?: "1" | "2" | "3";
    frequency?: number;
    daysOfWeek?: number[] | null;
    weeksOfMonth?: number[] | null;
    datesOfMonth?: number[] | null;
    monthOfYear?: number | null;
    startDate?: Date | null;
    endDate?: Date | null;
    projectId?: number | null;
  }
): Promise<QuestTemplate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertQuestTemplate = {
    userId,
    questName: input.questName || null,
    projectName: input.projectName || null,
    questType: input.questType,
    difficulty: input.difficulty || "1",
    frequency: input.frequency || 1,
    daysOfWeek: input.daysOfWeek ? JSON.stringify(input.daysOfWeek) : null,
    weeksOfMonth: input.weeksOfMonth ? JSON.stringify(input.weeksOfMonth) : null,
    datesOfMonth: input.datesOfMonth ? JSON.stringify(input.datesOfMonth) : null,
    monthOfYear: input.monthOfYear ?? null,
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    isActive: true,
    projectId: input.projectId || null,
  };

  const result = await db.insert(questTemplates).values(values).returning();
  return result[0];
}

/**
 * テンプレート一覧を取得
 */
export async function getQuestTemplates(userId: number): Promise<(QuestTemplate & { executedCount: number, parentProjectName?: string | null })[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select({
    template: questTemplates,
    project: projects
  })
    .from(questTemplates)
    .leftJoin(projects, eq(questTemplates.projectId, projects.id))
    .where(eq(questTemplates.userId, userId))
    .orderBy(desc(questTemplates.createdAt));

  const results = await Promise.all(rows.map(async ({ template, project }) => {
    const [res] = await db.select({ count: sql<number>`count(*)` })
      .from(questHistory)
      .where(and(eq(questHistory.templateId, template.id), eq(questHistory.finalStatus, 'cleared')));

    return {
      ...template,
      executedCount: res?.count || 0,
      parentProjectName: project?.name || null
    };
  }));

  return results;
}

/**
 * テンプレートの有効/無効を切り替え
 */
export async function updateTemplateStatus(
  templateId: number,
  userId: number,
  isActive: boolean
): Promise<QuestTemplate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(questTemplates)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(questTemplates.id, templateId), eq(questTemplates.userId, userId)));

  const [template] = await db.select().from(questTemplates).where(eq(questTemplates.id, templateId));
  return template;
}

/**
 * テンプレート情報を更新（編集機能）
 */
export async function updateQuestTemplate(
  templateId: number,
  userId: number,
  input: {
    questName?: string | null;
    projectName?: string | null;
    questType?: "Daily" | "Weekly" | "Monthly" | "Yearly" | "Project" | "Relax";
    difficulty?: "1" | "2" | "3";
    frequency?: number;
    daysOfWeek?: number[] | null;
    weeksOfMonth?: number[] | null;
    datesOfMonth?: number[] | null;
    monthOfYear?: number | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }
): Promise<QuestTemplate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<QuestTemplate> = {
    updatedAt: new Date(),
  };

  if (input.questName !== undefined) updateData.questName = input.questName;
  if (input.projectName !== undefined) updateData.projectName = input.projectName;
  if (input.questType !== undefined) updateData.questType = input.questType;
  if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;
  if (input.frequency !== undefined) updateData.frequency = input.frequency;
  if (input.daysOfWeek !== undefined) updateData.daysOfWeek = input.daysOfWeek ? JSON.stringify(input.daysOfWeek) : null;
  if (input.weeksOfMonth !== undefined) updateData.weeksOfMonth = input.weeksOfMonth ? JSON.stringify(input.weeksOfMonth) : null;
  if (input.datesOfMonth !== undefined) updateData.datesOfMonth = input.datesOfMonth ? JSON.stringify(input.datesOfMonth) : null;
  if (input.monthOfYear !== undefined) updateData.monthOfYear = input.monthOfYear;
  if (input.startDate !== undefined) updateData.startDate = input.startDate;
  if (input.endDate !== undefined) updateData.endDate = input.endDate;

  await db.update(questTemplates)
    .set(updateData)
    .where(and(eq(questTemplates.id, templateId), eq(questTemplates.userId, userId)));

  const [template] = await db.select().from(questTemplates).where(eq(questTemplates.id, templateId));
  return template;
}

/**
 * テンプレートを削除
 */
export async function deleteTemplate(templateId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(questTemplates)
    .where(and(eq(questTemplates.id, templateId), eq(questTemplates.userId, userId)));
}

/**
 * テンプレートからクエストを自動生成
 * 
 * "TODAY" ロジック:
 * 1. テンプレートが今日有効か判定 (Date/Day check)
 * 2. 今週/今月の目標回数に達していないか判定 (Frequency check)
 * 3. すでに今日分が生成されていないか、または未消化のクエストが残っていないか判定
 */
export async function generateQuestsFromTemplates(userId: number): Promise<Quest[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentDayOfWeek = now.getDay(); // 0-6
  const currentDate = now.getDate(); // 1-31
  // Week calculation
  const currentWeekOfMonth = Math.ceil(currentDate / 7);
  const currentMonth = now.getMonth() + 1; // 1-12

  const generatedQuests: Quest[] = [];

  // Helper to parse JSON safely
  const parseJson = (str: string | null): number[] => {
    if (!str) return [];
    try { return JSON.parse(str); } catch { return []; }
  };

  // Helper to count completions in period
  const countCompletions = async (templateId: number, type: string): Promise<number> => {
    let startDateStr = "";

    if (type === "Weekly") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      // To keep it simple and consistent with "Weeks of Month", let's assume Sunday start or Monday start?
      // JS getDay(): 0 is Sunday.
      // Let's rely on simple "this week" logic: Reset on Sunday or Monday? usually Monday for habits.
      // But standard GetWeek often assumes Sunday. 
      // Let's just use the last 7 days? No, frequency is usually "per calendar week".
      // Let's find the most recent Monday (or Sunday).
      // If today is Tuesday (2), last Sunday was 2 days ago.
      const d2 = new Date(now);
      d2.setDate(now.getDate() - now.getDay()); // Last Sunday
      startDateStr = d2.toISOString().split('T')[0];
    } else if (type === "Monthly") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      startDateStr = d.toISOString().split('T')[0];
    } else if (type === "Yearly") {
      const d = new Date(now.getFullYear(), 0, 1);
      startDateStr = d.toISOString().split('T')[0];
    } else {
      return 0; // Daily resets daily
    }

    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(questHistory)
      .where(and(
        eq(questHistory.questType, type as any),
        or(
          eq(questHistory.templateId, templateId),
          // Fallback: Name match if templateId is null (for legacy records)
          and(
            isNull(questHistory.templateId),
            eq(questHistory.questName, templates.find(t => t.id === templateId)?.questName || "")
          )
        ),
        gte(questHistory.recordedAt, new Date(startDateStr)),
        eq(questHistory.finalStatus, "cleared")
      ));

    return result.count;
  };

  // Get all active quests to prevent duplicates
  const activeQuests = await db.select().from(quests).where(
    and(
      eq(quests.userId, userId),
      or(
        eq(quests.status, "unreceived"),
        eq(quests.status, "accepted"),
        eq(quests.status, "challenging"),
        eq(quests.status, "almost")
      )
    )
  );

  const templatesWithProject = await db.select({
    template: questTemplates,
    project: projects
  })
    .from(questTemplates)
    .leftJoin(projects, eq(questTemplates.projectId, projects.id))
    .where(and(eq(questTemplates.userId, userId), eq(questTemplates.isActive, true)));

  // Re-define templates array for backward compatibility logic in helper
  const templates = templatesWithProject.map(t => t.template);

  for (const { template, project } of templatesWithProject) {
    // 1. Is Today Valid?
    let isTodayValid = false;
    const days = parseJson(template.daysOfWeek);
    const dates = parseJson(template.datesOfMonth);
    const weeks = parseJson(template.weeksOfMonth);

    switch (template.questType) {
      case "Daily":
        isTodayValid = true;
        break;
      case "Weekly":
        // 指定がない場合はPool扱い（自動生成しない）
        if (days.length === 0) isTodayValid = false;
        else if (days.includes(currentDayOfWeek)) isTodayValid = true;
        break;
        // 日付一致 OR (週一致 AND 曜日一致)
        if (dates.length > 0) {
          if (dates.includes(currentDate)) isTodayValid = true;
        } else if (weeks.length > 0) {
          // 週・曜日指定
          let weekMatch = weeks.includes(currentWeekOfMonth);
          let dayMatch = days.length === 0 || days.includes(currentDayOfWeek);
          if (weekMatch && dayMatch) isTodayValid = true;
        } else {
          // 完全に指定がない(Monthly Pool) -> 自動生成しない
          isTodayValid = false;
        }
        break;
      case "Yearly":
        if (template.monthOfYear === currentMonth) {
          // Simplify Yearly to act like Monthly within that month
          let weekMatch = weeks.length === 0 || weeks.includes(currentWeekOfMonth);
          let dayMatch = days.length === 0 || days.includes(currentDayOfWeek);
          if (weekMatch && dayMatch) isTodayValid = true;
        }
        break;
    }

    if (!isTodayValid) continue;

    // 2. Already Active? (Prevent duplication)
    const existingQuest = activeQuests.find(q => q.templateId === template.id);
    if (existingQuest) continue; // Already have one, don't generate another until it's done.

    // 3. Frequency Check (Goal Met?)
    const freq = template.frequency || 1;
    const currentCount = await countCompletions(template.id, template.questType);

    if (currentCount >= freq) continue;

    // 4. Generate Name with Progress (if needed)
    let questName = template.questName;
    if (freq > 1) {
      questName = `${template.questName} (${currentCount + 1}/${freq})`;
    }

    // 5. Generate
    const quest = await createQuest(userId, {
      questName: questName,
      projectName: project?.name || template.projectName,
      questType: template.questType,
      difficulty: template.difficulty,
      templateId: template.id,
      autoDeadline: true,
    });

    generatedQuests.push(quest);

    // Update last generated (just for record, not strict logic anymore)
    await db.update(questTemplates)
      .set({ lastGeneratedAt: now })
      .where(eq(questTemplates.id, template.id));
  }

  return generatedQuests;
}

// ============================================
// 履歴管理
// ============================================

/**
 * 履歴に追加
 * 
 * 要求仕様:
 * - クリア、中断、キャンセル、未完了を記録
 * - 評価・点数なし（事実ログのみ）
 */
export async function addToHistory(
  userId: number,
  questId: number,
  input: {
    questName?: string | null;
    projectName?: string | null;
    questType: "Daily" | "Weekly" | "Monthly" | "Yearly" | "Free" | "Project" | "Relax";
    difficulty?: "1" | "2" | "3";
    finalStatus: "cleared" | "paused" | "cancelled" | "incomplete" | "failed";
    xpEarned?: number;
    templateId?: number | null;
    plannedTimeSlot?: string | null;
  }
): Promise<QuestHistory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const recordedDate = format(now, 'yyyy-MM-dd'); // Local date

  const values: InsertQuestHistory = {
    userId,
    questId,
    questName: input.questName || null,
    projectName: input.projectName || null,
    questType: input.questType,
    difficulty: input.difficulty || "1",
    finalStatus: input.finalStatus,
    xpEarned: input.xpEarned || 0,
    recordedDate,
    templateId: input.templateId || null,
    plannedTimeSlot: input.plannedTimeSlot || null,
  };

  const result = await db.insert(questHistory).values(values).returning();
  return result[0];
}

/**
 * 日付別の履歴を取得
 * 
 * 要求仕様:
 * - 日付＋曜日ごとの表示
 */
export async function getQuestHistoryByDate(
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<QuestHistory[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select()
    .from(questHistory)
    .where(eq(questHistory.userId, userId));

  if (startDate && endDate) {
    query = db.select()
      .from(questHistory)
      .where(
        and(
          eq(questHistory.userId, userId),
          gte(questHistory.recordedDate, startDate),
          lte(questHistory.recordedDate, endDate)
        )
      );
  }

  return query.orderBy(desc(questHistory.recordedAt));
}

// ============================================
// ユーザー進行状況管理
// ============================================

/**
 * ユーザー進行状況を取得または作成
 */
export async function getUserProgression(userId: number): Promise<UserProgression> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select()
    .from(userProgression)
    .where(eq(userProgression.userId, userId));

  if (existing) return existing;

  // 新規作成
  const result = await db.insert(userProgression).values({ userId }).returning();
  return result[0];
}

/**
 * ユーザー進行状況を更新
 * 
 * 要求仕様:
 * - クリア時のみXP・報酬付与
 * - 1日1クエスト以上クリアで継続
 * - 中断・キャンセルのみの日は継続扱いしないが減点もしない
 */
export async function updateUserProgression(
  userId: number,
  input: {
    xpGain?: number;
    questCleared?: boolean;
  }
): Promise<UserProgression> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const progression = await getUserProgression(userId);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  let newTotalXp = progression.totalXp;
  let newCurrentStreak = progression.currentStreak;
  let newLongestStreak = progression.longestStreak;
  let newLastClearedDate = progression.lastClearedDate;

  // XP加算
  if (input.xpGain) {
    newTotalXp += input.xpGain;
  }

  // ストリーク計算（クエストクリア時のみ）
  if (input.questCleared) {
    if (progression.lastClearedDate === today) {
      // 今日すでにクリア済み - ストリークは変更なし
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (progression.lastClearedDate === yesterdayStr) {
        // 昨日クリアしていた - ストリーク継続
        newCurrentStreak += 1;
      } else if (!progression.lastClearedDate) {
        // 初めてのクリア
        newCurrentStreak = 1;
      } else {
        // 昨日クリアしていなかった - ストリークリセット
        // ただし「中断・キャンセルのみの日は減点もしない」ので、
        // 単に新しいストリークを開始
        newCurrentStreak = 1;
      }

      newLastClearedDate = today;

      // 最長ストリーク更新
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }
    }
  }

  await db.update(userProgression)
    .set({
      totalXp: newTotalXp,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastClearedDate: newLastClearedDate,
      updatedAt: new Date(),
    })
    .where(eq(userProgression.userId, userId));

  const [updated] = await db.select().from(userProgression).where(eq(userProgression.userId, userId));
  return updated;
}

/**
 * ストリークをリセット（必要に応じて）
 * 
 * 要求仕様:
 * - 中断・キャンセルのみの日は継続扱いしないが減点もしない
 */
export async function resetStreakIfNeeded(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const progression = await getUserProgression(userId);

  if (!progression.lastClearedDate) return;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 昨日も今日もクリアしていない場合、ストリークをリセット
  if (progression.lastClearedDate !== today && progression.lastClearedDate !== yesterdayStr) {
    await db.update(userProgression)
      .set({
        currentStreak: 0,
        updatedAt: new Date(),
      })
      .where(eq(userProgression.userId, userId));
  }
}

/**
 * 難易度に基づくXP計算
 */
export function calculateXpReward(difficulty: "1" | "2" | "3"): number {
  switch (difficulty) {
    case "1": return 10;  // ★
    case "2": return 25;  // ★★
    case "3": return 50;  // ★★★
    default: return 10;
  }
}

// ============================================
// プロジェクト管理 (Hierarchy)
// ============================================

/**
 * プロジェクトを作成
 */
export async function createProject(
  userId: number,
  input: {
    name: string;
    description?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }
): Promise<Project> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertProject = {
    userId,
    name: input.name,
    description: input.description || null,
    startDate: input.startDate || null,
    endDate: input.endDate || null,
  };

  const result = await db.insert(projects).values(values).returning();
  return result[0];
}

/**
 * プロジェクト一覧を取得
 */
export async function getProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
}

/**
 * プロジェクトを更新
 */
export async function updateProject(
  projectId: number,
  userId: number,
  input: {
    name?: string;
    description?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: "active" | "archived";
  }
): Promise<Project> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<Project> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.startDate !== undefined) updateData.startDate = input.startDate;
  if (input.endDate !== undefined) updateData.endDate = input.endDate;
  if (input.status !== undefined) updateData.status = input.status;

  await db.update(projects)
    .set(updateData)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  return project;
}

/**
 * プロジェクトを削除 (配下のテンプレートも削除するか、連動は任意だが一旦プロジェクトのみ)
 */
export async function deleteProject(projectId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // プロジェクト自体を削除
  await db.delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  // 配下のテンプレートのprojectIdをnullにするか、削除するか。
  // ここでは安全のため紐付けを解除する（アーカイブ扱い）
  await db.update(questTemplates)
    .set({ projectId: null, isActive: false })
    .where(and(eq(questTemplates.projectId, projectId), eq(questTemplates.userId, userId)));
}

/**
 * レガシープロジェクト（フラット構造）を階層構造へ移行
 * - projectIdを持たない "Project" タイプのテンプレートを探す
 * - それぞれに対して親プロジェクトを作成 (名前はテンプレートのクエスト名)
 * - テンプレートをそのプロジェクトに紐付ける
 */
export async function migrateLegacyProjects(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const legacyTemplates = await db.select()
    .from(questTemplates)
    .where(and(
      eq(questTemplates.userId, userId),
      eq(questTemplates.questType, "Project"),
      isNull(questTemplates.projectId)
    ));

  for (const tmpl of legacyTemplates) {
    if (!tmpl.questName) continue;

    // Create Parent Project
    const project = await createProject(userId, {
      name: tmpl.questName, // 旧: Project Name (UIではプロジェクト名として表示されていた)
      description: tmpl.projectName, // 旧: Work Name (UIではメモとして表示されていた) - 逆転していたので注意
      // Memo: 以前の変更で UI上「プロジェクト名」= DB `questName`, UI上「ワーク名」= DB `projectName`
      // ユーザー要望: 
      // 親フォルダ作成時の「プロジェクト名」 -> スプレッドシート Project
      // 子ワーク作成時の「ワーク名」 -> スプレッドシート QuestName

      // ここでの移行: 
      // 旧テンプレートは「プロジェクト」そのものだった。
      // なので、このテンプレート自体を「親プロジェクト」に格上げするイメージだが、
      // 実際には「親プロジェクト」を作り、このテンプレートは「デフォルトのワーク」として中に格納するのが自然。

      startDate: tmpl.startDate,
      endDate: tmpl.endDate,
    });

    // Link Template to Project
    // Update the template to represent a "Work" inside this project
    await db.update(questTemplates)
      .set({
        projectId: project.id,
        // Work Name should be... what?
        // If the legacy template was "Marche", now "Marche" is the project.
        // The work inside it... maybe "General Task"? Or keep the name "Marche"?
        // Let's keep the name as is for now.
      })
  }

  await fixReversedData(userId);
}

// Helper to fix data that was migrated but not swapped (Project Name <-> Work Name)
export async function fixReversedData(userId: number) {
  const db = await getDb();
  if (!db) return;

  // 1. Fix Templates
  // Find templates where questName matches the Parent Project Name (Legacy artifact)
  const templatesToCheck = await db.select({
    template: questTemplates,
    project: projects
  })
    .from(questTemplates)
    .innerJoin(projects, eq(questTemplates.projectId, projects.id))
    .where(and(
      eq(questTemplates.userId, userId),
      eq(questTemplates.questType, "Project")
    ));

  for (const { template, project } of templatesToCheck) {
    if (template.questName === project.name) {
      // It's reversed!
      // questName has Project Name
      // projectName has Work Name
      const realWorkName = template.projectName || "General Work";

      await db.update(questTemplates)
        .set({
          questName: realWorkName,
          projectName: null // Clear memo
        })
        .where(eq(questTemplates.id, template.id));
    }
  }

  // 2. Fix Active Quests
  // Find quests that look like they have the Project Name as their Quest Name
  const questsToCheck = await db.select({
    quest: quests,
    template: questTemplates,
    project: projects
  })
    .from(quests)
    .leftJoin(questTemplates, eq(quests.templateId, questTemplates.id))
    .leftJoin(projects, eq(questTemplates.projectId, projects.id))
    .where(and(
      eq(quests.userId, userId),
      eq(quests.questType, "Project"),
      or(eq(quests.status, "accepted"), eq(quests.status, "challenging"), eq(quests.status, "almost"))
    ));

  for (const row of questsToCheck) {
    const { quest, project } = row;
    if (!project) continue;

    let shouldUpdate = false;
    let newQuestName = quest.questName;
    let newProjectName = quest.projectName;

    // Logic 1: Swap if reversed (Quest Name has Project Name, Project Name has Work Name)
    if (quest.questName === project.name && quest.projectName !== project.name && quest.projectName) {
      newQuestName = quest.projectName;
      newProjectName = project.name;
      shouldUpdate = true;
    }
    // Logic 2: Fill Project Name if missing or wrong (and not reversed case)
    else if (quest.projectName !== project.name) {
      newProjectName = project.name;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await db.update(quests)
        .set({
          questName: newQuestName,
          projectName: newProjectName
        })
        .where(eq(quests.id, quest.id));
    }
  }
}

/**
 * IDでテンプレートを取得
 */
export async function getQuestTemplateById(templateId: number): Promise<QuestTemplate | null> {
  const db = await getDb();
  if (!db) return null;

  const [template] = await db.select().from(questTemplates).where(eq(questTemplates.id, templateId));
  return template || null;
}

/**
 * 指定されたテンプレートの期間内クリア回数を取得
 */
export async function getTemplateCompletionCount(templateId: number, questType: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  let startDateStr = "";

  if (questType === "Weekly") {
    // 週の開始（月曜基準とみなす、または日曜基準）
    // ここでは generateQuestsFromTemplates とロジックを合わせる
    // 今日の曜日を取得し、直近の日曜(または月曜)まで戻る
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay()); // Last Sunday (0 is Sunday)
    startDateStr = d.toISOString().split('T')[0];
  } else if (questType === "Monthly") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of month
    startDateStr = d.toISOString().split('T')[0];
  } else if (questType === "Yearly") {
    const d = new Date(now.getFullYear(), 0, 1); // 1st of year
    startDateStr = d.toISOString().split('T')[0];
  } else {
    // Dailyなどは「期間内回数」という概念が「今日」だけなので、
    // ここでは便宜上、今日0時以降を返す
    startDateStr = now.toISOString().split('T')[0];
  }

  const [result] = await db.select({ count: sql<number>`count(*)` })
    .from(questHistory)
    .where(and(
      eq(questHistory.questType, questType as any),
      or(
        eq(questHistory.templateId, templateId),
        // Fallback: Name match if templateId is null (only if template exists to check name)
        // 簡易化のためテンプレートID一致を優先
      ),
      gte(questHistory.recordedAt, new Date(startDateStr)),
      eq(questHistory.finalStatus, "cleared")
    ));

  return result?.count || 0;
}

// Replaces fixReversedData with stronger logic
export async function fixInconsistentData(userId: number) {
  const db = await getDb();
  if (!db) return;

  // 1. Force Fix Templates (Legacy Migration Cleanup)
  const templatesToFix = await db.select()
    .from(questTemplates)
    .where(and(
      eq(questTemplates.userId, userId),
      eq(questTemplates.questType, "Project"),
      isNotNull(questTemplates.projectName),
      ne(questTemplates.projectName, "")
    ));

  for (const tmpl of templatesToFix) {
    if (tmpl.projectId) {
      await db.update(questTemplates)
        .set({
          questName: tmpl.projectName,
          projectName: null
        })
        .where(eq(questTemplates.id, tmpl.id));
    }
  }

  // 2. Force Sync Active Quests to Master Data
  const questsToSync = await db.select({
    quest: quests,
    template: questTemplates,
    project: projects
  })
    .from(quests)
    .innerJoin(questTemplates, eq(quests.templateId, questTemplates.id))
    .innerJoin(projects, eq(questTemplates.projectId, projects.id))
    .where(and(
      eq(quests.userId, userId),
      eq(quests.questType, "Project"),
      or(eq(quests.status, "accepted"), eq(quests.status, "challenging"), eq(quests.status, "almost"))
    ));

  for (const { quest, template, project } of questsToSync) {
    if (quest.questName !== template.questName || quest.projectName !== project.name) {
      await db.update(quests)
        .set({
          questName: template.questName,
          projectName: project.name
        })
        .where(eq(quests.id, quest.id));
    }
  }
}
