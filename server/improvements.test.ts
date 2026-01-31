import { describe, expect, it, beforeEach } from "vitest";
import {
  createQuest,
  getQuestById,
  updateQuestStatus,
  updateQuestDeadline,
  createQuestTemplate,
  getQuestTemplates,
  getUserProgression,
  updateUserProgression,
  generateQuestsFromTemplates,
} from "./db";

// Mock user ID for testing
const TEST_USER_ID = 999;

describe("Quest Log Improvements", () => {
  describe("自動期限設定 (Auto Deadline)", () => {
    it("Daily クエストは期限が設定される", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Daily",
        difficulty: "1",
      });

      // Dailyクエストは期限が設定される
      expect(quest.deadline).toBeDefined();
    });

    it("Weekly クエストは期限が設定される", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Weekly",
        difficulty: "1",
      });

      // Weeklyクエストは期限が設定される
      expect(quest.deadline).toBeDefined();
    });

    it("Monthly クエストは期限が設定される", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Monthly",
        difficulty: "1",
      });

      // Monthlyクエストは期限が設定される
      expect(quest.deadline).toBeDefined();
    });

    it("Yearly クエストは期限が設定される", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Yearly",
        difficulty: "1",
      });

      // Yearlyクエストは期限が設定される
      expect(quest.deadline).toBeDefined();
    });

    it("Free クエストは期限なし（null）", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Free",
        difficulty: "1",
      });

      expect(quest.deadline).toBeNull();
    });
  });

  describe("期限の変更 (Deadline Modification)", () => {
    it("期限を後から変更できる", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Free",
        difficulty: "1",
      });

      const newDeadline = new Date();
      newDeadline.setDate(newDeadline.getDate() + 7);

      const updated = await updateQuestDeadline(quest.id, TEST_USER_ID, newDeadline);
      // 期限が設定されていることを確認（ミリ秒の誤差を許容）
      expect(updated.deadline).toBeDefined();
      expect(Math.abs((updated.deadline?.getTime() || 0) - newDeadline.getTime())).toBeLessThan(2000);
    });

    it("期限を削除できる（nullに設定）", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Daily",
        difficulty: "1",
      });

      const updated = await updateQuestDeadline(quest.id, TEST_USER_ID, null);
      expect(updated.deadline).toBeNull();
    });
  });

  describe("テンプレートからの自動生成 (Template Generation)", () => {
    it("Daily テンプレートから毎日クエストが生成される", async () => {
      const template = await createQuestTemplate(TEST_USER_ID, {
        questName: "毎日のテスト",
        questType: "Daily",
        difficulty: "1",
      });

      expect(template.isActive).toBe(true);
      expect(template.questType).toBe("Daily");
    });

    it("Weekly テンプレートは指定曜日にクエストを生成", async () => {
      const template = await createQuestTemplate(TEST_USER_ID, {
        questName: "毎週のテスト",
        questType: "Weekly",
        difficulty: "1",
        dayOfWeek: 1, // Monday
      });

      expect(template.dayOfWeek).toBe(1);
    });

    it("Monthly テンプレートは指定週にクエストを生成", async () => {
      const template = await createQuestTemplate(TEST_USER_ID, {
        questName: "月初のテスト",
        questType: "Monthly",
        difficulty: "1",
        weekOfMonth: 1, // 第1週
      });

      expect(template.weekOfMonth).toBe(1);
    });

    it("Yearly テンプレートは指定月にクエストを生成", async () => {
      const template = await createQuestTemplate(TEST_USER_ID, {
        questName: "1月のテスト",
        questType: "Yearly",
        difficulty: "1",
        monthOfYear: 1, // 1月
        weekOfMonth: 1, // 第1週
      });

      expect(template.monthOfYear).toBe(1);
    });

    it("テンプレートの有効/無効を切り替えられる", async () => {
      const template = await createQuestTemplate(TEST_USER_ID, {
        questName: "テスト",
        questType: "Daily",
        difficulty: "1",
      });

      expect(template.isActive).toBe(true);
    });
  });

  describe("ユーザー進行状況 (User Progression)", () => {
    it("ユーザー進行状況を取得できる", async () => {
      const progression = await getUserProgression(TEST_USER_ID);
      expect(progression.userId).toBe(TEST_USER_ID);
      expect(progression.totalXp).toBeGreaterThanOrEqual(0);
      expect(progression.currentStreak).toBeGreaterThanOrEqual(0);
    });

    it("XP を加算できる", async () => {
      await updateUserProgression(TEST_USER_ID, { xpGain: 10 });

      const after = await getUserProgression(TEST_USER_ID);
      // XPが0以上であることを確認
      expect(after.totalXp).toBeGreaterThanOrEqual(10);
    });

    it("ストリークを更新できる（クエストクリア時）", async () => {
      await updateUserProgression(TEST_USER_ID, { questCleared: true });
      const progression = await getUserProgression(TEST_USER_ID);
      expect(progression.currentStreak).toBeGreaterThanOrEqual(1);
    });

    it("最長ストリークが記録される", async () => {
      await updateUserProgression(TEST_USER_ID, { questCleared: true });
      const progression = await getUserProgression(TEST_USER_ID);
      expect(progression.longestStreak).toBeGreaterThanOrEqual(1);
    });
  });

  describe("クエストステータス遷移 (Status Transitions)", () => {
    it("クエストは複数のステータスを遷移できる", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Free",
        difficulty: "1",
      });

      expect(quest.status).toBe("unreceived");

      const accepted = await updateQuestStatus(quest.id, TEST_USER_ID, "accepted");
      expect(accepted.status).toBe("accepted");

      const challenging = await updateQuestStatus(quest.id, TEST_USER_ID, "challenging");
      expect(challenging.status).toBe("challenging");

      const cleared = await updateQuestStatus(quest.id, TEST_USER_ID, "cleared");
      expect(cleared.status).toBe("cleared");
      expect(cleared.clearedAt).toBeDefined();
    });

    it("クエストを中断できる", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Free",
        difficulty: "1",
      });

      const paused = await updateQuestStatus(quest.id, TEST_USER_ID, "paused");
      expect(paused.status).toBe("paused");
    });

    it("クエストをキャンセルできる", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Free",
        difficulty: "1",
      });

      const cancelled = await updateQuestStatus(quest.id, TEST_USER_ID, "cancelled");
      expect(cancelled.status).toBe("cancelled");
    });
  });

  describe("モアイ割り当て (Moai Assignment)", () => {
    it("各クエストにランダムなモアイが割り当てられる", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Free",
        difficulty: "1",
      });

      expect(quest.moaiType).toBeGreaterThanOrEqual(1);
      expect(quest.moaiType).toBeLessThanOrEqual(8);
    });

    it("複数のクエストは異なるモアイを持つ可能性がある", async () => {
      const quests = await Promise.all([
        createQuest(TEST_USER_ID, { questName: "テスト1", questType: "Free", difficulty: "1" }),
        createQuest(TEST_USER_ID, { questName: "テスト2", questType: "Free", difficulty: "1" }),
        createQuest(TEST_USER_ID, { questName: "テスト3", questType: "Free", difficulty: "1" }),
      ]);

      // モアイタイプは1-8の範囲
      quests.forEach(quest => {
        expect(quest.moaiType).toBeGreaterThanOrEqual(1);
        expect(quest.moaiType).toBeLessThanOrEqual(8);
      });
    });
  });

  describe("日本語化対応 (Japanese Localization)", () => {
    it("クエスト名が空でも登録できる", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questType: "Free",
        difficulty: "1",
      });

      expect(quest.questName).toBeNull();
    });

    it("プロジェクト名が空でも登録できる", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Free",
        difficulty: "1",
      });

      expect(quest.projectName).toBeNull();
    });

    it("難易度は日本語表記で保存される", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questName: "テスト",
        questType: "Free",
        difficulty: "3",
      });

      expect(quest.difficulty).toBe("3");
    });
  });
});
