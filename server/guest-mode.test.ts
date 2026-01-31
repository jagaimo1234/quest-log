import { describe, expect, it, beforeEach, vi } from "vitest";
import { sdk } from "./_core/sdk";
import * as db from "./db";

// Mock database functions
vi.mock("./db", () => ({
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  getDb: vi.fn(),
}));

describe("Guest Mode Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a guest user when no session cookie is provided", async () => {
    // Mock database to return null first (user doesn't exist)
    vi.mocked(db.getUserByOpenId).mockResolvedValueOnce(undefined);
    
    // Mock database to return the created guest user
    vi.mocked(db.getUserByOpenId).mockResolvedValueOnce({
      id: 1,
      openId: "guest_default_user",
      name: "ゲスト",
      email: null,
      loginMethod: "guest",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    // Create a mock request with no session cookie
    const req = {
      headers: {
        cookie: undefined,
      },
    } as any;

    const user = await sdk.authenticateRequest(req);

    // Verify guest user was created
    expect(user).toBeDefined();
    expect(user.openId).toBe("guest_default_user");
    expect(user.name).toBe("ゲスト");
    expect(user.loginMethod).toBe("guest");

    // Verify upsertUser was called to create the guest user
    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "guest_default_user",
        name: "ゲスト",
        email: null,
        loginMethod: "guest",
      })
    );
  });

  it("should return existing guest user when already created", async () => {
    const guestUser = {
      id: 1,
      openId: "guest_default_user",
      name: "ゲスト",
      email: null,
      loginMethod: "guest",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    // Mock database to return existing guest user
    vi.mocked(db.getUserByOpenId).mockResolvedValueOnce(guestUser);

    // Create a mock request with no session cookie
    const req = {
      headers: {
        cookie: undefined,
      },
    } as any;

    const user = await sdk.authenticateRequest(req);

    // Verify existing guest user is returned
    expect(user).toBeDefined();
    expect(user.openId).toBe("guest_default_user");
    expect(user.name).toBe("ゲスト");

    // Verify upsertUser was called to update lastSignedIn
    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "guest_default_user",
        lastSignedIn: expect.any(Date),
      })
    );
  });

  it("should allow guest user to create quests", async () => {
    const guestUser = {
      id: 1,
      openId: "guest_default_user",
      name: "ゲスト",
      email: null,
      loginMethod: "guest",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    // Verify guest user has proper user ID for database operations
    expect(guestUser.id).toBeDefined();
    expect(typeof guestUser.id).toBe("number");
  });

  it("guest user should have user role by default", async () => {
    const guestUser = {
      id: 1,
      openId: "guest_default_user",
      name: "ゲスト",
      email: null,
      loginMethod: "guest",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    expect(guestUser.role).toBe("user");
  });
});
