import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createQuest,
  getQuestById,
  updateQuestStatus,
  updateQuestDeadline,
  getUserProgression,
  updateUserProgression,
  createQuestTemplate,
  getQuestTemplates,
} from "./db";

// Mock user ID for testing
const TEST_USER_ID = 999;

describe("Quest Management", () => {
  let createdQuestId: number;

  describe("Quest Creation", () => {
    it("should create a quest with minimal data", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questType: "Free",
        difficulty: "1",
      });

      expect(quest).toBeDefined();
      expect(quest.userId).toBe(TEST_USER_ID);
      expect(quest.questType).toBe("Free");
      expect(quest.difficulty).toBe("1");
      expect(quest.status).toBe("unreceived");
      expect(quest.moaiType).toBeGreaterThanOrEqual(1);
      expect(quest.moaiType).toBeLessThanOrEqual(8);

      createdQuestId = quest.id;
    });

    it("should create a quest with all data", async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);

      const quest = await createQuest(TEST_USER_ID, {
        questName: "Test Quest",
        projectName: "Test Project",
        questType: "Weekly",
        difficulty: "3",
        deadline,
      });

      expect(quest.questName).toBe("Test Quest");
      expect(quest.projectName).toBe("Test Project");
      expect(quest.questType).toBe("Weekly");
      expect(quest.difficulty).toBe("3");
      expect(quest.deadline).toBeDefined();
    });
  });

  describe("Quest Status Updates", () => {
    it("should update quest status from unreceived to accepted", async () => {
      const updated = await updateQuestStatus(createdQuestId, TEST_USER_ID, "accepted");
      expect(updated.status).toBe("accepted");
    });

    it("should update quest status from accepted to challenging", async () => {
      const updated = await updateQuestStatus(createdQuestId, TEST_USER_ID, "challenging");
      expect(updated.status).toBe("challenging");
    });

    it("should update quest status to cleared and set clearedAt", async () => {
      const updated = await updateQuestStatus(createdQuestId, TEST_USER_ID, "cleared");
      expect(updated.status).toBe("cleared");
      expect(updated.clearedAt).toBeDefined();
    });

    it("should update quest status to paused", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questType: "Daily",
        difficulty: "2",
      });

      const updated = await updateQuestStatus(quest.id, TEST_USER_ID, "paused");
      expect(updated.status).toBe("paused");
    });

    it("should update quest status to cancelled", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questType: "Monthly",
        difficulty: "1",
      });

      const updated = await updateQuestStatus(quest.id, TEST_USER_ID, "cancelled");
      expect(updated.status).toBe("cancelled");
    });
  });

  describe("Deadline Management", () => {
    it("should set a deadline on a quest", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questType: "Free",
        difficulty: "1",
      });

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 3);

      const updated = await updateQuestDeadline(quest.id, TEST_USER_ID, deadline);
      expect(updated.deadline).toBeDefined();
      expect(updated.deadline?.getTime()).toBeCloseTo(deadline.getTime(), -3);
    });

    it("should remove a deadline from a quest", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questType: "Free",
        difficulty: "1",
        deadline: new Date(),
      });

      const updated = await updateQuestDeadline(quest.id, TEST_USER_ID, null);
      expect(updated.deadline).toBeNull();
    });
  });

  describe("User Progression", () => {
    it("should get or create user progression", async () => {
      const progression = await getUserProgression(TEST_USER_ID);
      expect(progression).toBeDefined();
      expect(progression.userId).toBe(TEST_USER_ID);
      expect(progression.totalXp).toBeGreaterThanOrEqual(0);
      expect(progression.currentStreak).toBeGreaterThanOrEqual(0);
    });

    it("should update user XP", async () => {
      const before = await getUserProgression(TEST_USER_ID);
      const beforeXp = before.totalXp;

      await updateUserProgression(TEST_USER_ID, { xpGain: 50 });

      const after = await getUserProgression(TEST_USER_ID);
      // XPが増加していることを確認
      expect(after.totalXp).toBeGreaterThan(beforeXp);
    });

    it("should update streak when quest is cleared", async () => {
      // クエストクリア時にストリークが更新される
      await updateUserProgression(TEST_USER_ID, { questCleared: true });

      const after = await getUserProgression(TEST_USER_ID);
      // クリア後はストリークが1以上になる
      expect(after.currentStreak).toBeGreaterThanOrEqual(1);
      // 今日の日付が記録される
      expect(after.lastClearedDate).toBeDefined();
    });

    it("should track longest streak", async () => {
      // クエストクリアでストリーク更新
      await updateUserProgression(TEST_USER_ID, { questCleared: true });

      const after = await getUserProgression(TEST_USER_ID);
      // 最長ストリークは少なくとも1以上
      expect(after.longestStreak).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Quest Templates", () => {
    it("should create a daily template", async () => {
      const template = await createQuestTemplate(TEST_USER_ID, {
        questName: "Daily Standup",
        questType: "Daily",
        difficulty: "1",
      });

      expect(template).toBeDefined();
      expect(template.userId).toBe(TEST_USER_ID);
      expect(template.questType).toBe("Daily");
      expect(template.isActive).toBe(true);
    });

    it("should create a weekly template with day selection", async () => {
      const template = await createQuestTemplate(TEST_USER_ID, {
        questName: "Weekly Review",
        questType: "Weekly",
        difficulty: "2",
        dayOfWeek: 5, // Friday
      });

      expect(template.questType).toBe("Weekly");
      expect(template.dayOfWeek).toBe(5);
    });

    it("should create a monthly template with week of month", async () => {
      const template = await createQuestTemplate(TEST_USER_ID, {
        questName: "Monthly Planning",
        questType: "Monthly",
        difficulty: "3",
        weekOfMonth: 1, // First week
      });

      expect(template.questType).toBe("Monthly");
      expect(template.weekOfMonth).toBe(1);
    });

    it("should create a yearly template with month and week", async () => {
      const template = await createQuestTemplate(TEST_USER_ID, {
        questName: "Annual Review",
        questType: "Yearly",
        difficulty: "3",
        monthOfYear: 1, // January
        weekOfMonth: 1, // First week
      });

      expect(template.questType).toBe("Yearly");
      expect(template.monthOfYear).toBe(1);
      expect(template.weekOfMonth).toBe(1);
    });

    it("should retrieve all templates for a user", async () => {
      const templates = await getQuestTemplates(TEST_USER_ID);
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe("Quest Lifecycle Validation", () => {
    it("should handle complete quest lifecycle", async () => {
      // Create
      const quest = await createQuest(TEST_USER_ID, {
        questName: "Lifecycle Test",
        questType: "Free",
        difficulty: "2",
      });
      expect(quest.status).toBe("unreceived");

      // Accept
      const accepted = await updateQuestStatus(quest.id, TEST_USER_ID, "accepted");
      expect(accepted.status).toBe("accepted");

      // Challenge
      const challenging = await updateQuestStatus(quest.id, TEST_USER_ID, "challenging");
      expect(challenging.status).toBe("challenging");

      // Clear
      const cleared = await updateQuestStatus(quest.id, TEST_USER_ID, "cleared");
      expect(cleared.status).toBe("cleared");
      expect(cleared.clearedAt).toBeDefined();
    });

    it("should allow pause from accepted state", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questType: "Free",
        difficulty: "1",
      });

      await updateQuestStatus(quest.id, TEST_USER_ID, "accepted");
      const paused = await updateQuestStatus(quest.id, TEST_USER_ID, "paused");
      expect(paused.status).toBe("paused");
    });

    it("should allow cancel from unreceived state", async () => {
      const quest = await createQuest(TEST_USER_ID, {
        questType: "Free",
        difficulty: "1",
      });

      const cancelled = await updateQuestStatus(quest.id, TEST_USER_ID, "cancelled");
      expect(cancelled.status).toBe("cancelled");
    });
  });
});
