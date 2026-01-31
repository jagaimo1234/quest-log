import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("開始日と期限機能", () => {
  it("開始日と期限を指定してクエストを作成できる", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date("2025-12-29");
    const deadline = new Date("2025-12-31");

    const quest = await caller.quest.create({
      questName: "テストクエスト",
      projectName: "テストプロジェクト",
      questType: "Free",
      difficulty: "2",
      startDate,
      deadline,
      autoDeadline: false,
    });

    expect(quest).toBeDefined();
    expect(quest.questName).toBe("テストクエスト");
    expect(quest.projectName).toBe("テストプロジェクト");
    expect(quest.questType).toBe("Free");
    expect(quest.difficulty).toBe("2");
    expect(quest.startDate).toBeDefined();
    expect(quest.deadline).toBeDefined();
  });

  it("開始日のみを指定してクエストを作成できる", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date("2025-12-29");

    const quest = await caller.quest.create({
      questName: "開始日のみのクエスト",
      projectName: "テストプロジェクト",
      questType: "Daily",
      difficulty: "1",
      startDate,
      autoDeadline: true,
    });

    expect(quest).toBeDefined();
    expect(quest.startDate).toBeDefined();
    expect(quest.deadline).toBeDefined(); // 自動期限が設定される
  });

  it("期限のみを指定してクエストを作成できる", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const deadline = new Date("2025-12-31");

    const quest = await caller.quest.create({
      questName: "期限のみのクエスト",
      projectName: "テストプロジェクト",
      questType: "Free",
      difficulty: "3",
      deadline,
      autoDeadline: false,
    });

    expect(quest).toBeDefined();
    expect(quest.deadline).toBeDefined();
  });

  it("開始日と期限を指定しない場合、自動期限が設定される", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const quest = await caller.quest.create({
      questName: "自動期限クエスト",
      projectName: "テストプロジェクト",
      questType: "Daily",
      difficulty: "1",
      autoDeadline: true,
    });

    expect(quest).toBeDefined();
    expect(quest.deadline).toBeDefined(); // Daily の自動期限が設定される
  });

  it("金曜日のためのデイリークエストを作成できる", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 金曜日を指定
    const friday = new Date("2025-12-26"); // 2025年12月26日は金曜日
    
    const quest = await caller.quest.create({
      questName: "金曜日のタスク",
      projectName: "仕事",
      questType: "Daily",
      difficulty: "2",
      startDate: friday,
      autoDeadline: true,
    });

    expect(quest).toBeDefined();
    expect(quest.startDate).toBeDefined();
    expect(quest.questType).toBe("Daily");
  });

  it("来週1週間のウィークリークエストを作成できる", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 来週の月曜日から日曜日までを指定
    const nextMonday = new Date("2026-01-05");
    const nextSunday = new Date("2026-01-11");

    const quest = await caller.quest.create({
      questName: "来週の週間タスク",
      projectName: "生活",
      questType: "Weekly",
      difficulty: "1",
      startDate: nextMonday,
      deadline: nextSunday,
      autoDeadline: false,
    });

    expect(quest).toBeDefined();
    expect(quest.questType).toBe("Weekly");
    expect(quest.startDate).toBeDefined();
    expect(quest.deadline).toBeDefined();
  });

  it("クエスト種別は期間の「ざっくりとした区分」として機能する", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Daily でも明示的に期限を指定できる
    const deadline = new Date("2026-01-15");

    const quest = await caller.quest.create({
      questName: "カスタム期限のデイリークエスト",
      projectName: "テスト",
      questType: "Daily",
      difficulty: "2",
      deadline,
      autoDeadline: false,
    });

    expect(quest).toBeDefined();
    expect(quest.questType).toBe("Daily");
    expect(quest.deadline?.getTime()).toBe(deadline.getTime());
  });
});
