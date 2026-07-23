import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

type T = ReturnType<typeof convexTest>;

/**
 * convex/admin.ts は全関数が requireAdmin() を通す設計になっている
 * （users.role === "admin" のみ許可）。ここではその契約を
 * 「一般ユーザー」「未認証」の双方から deny-by-default で検証する。
 *
 * 実装を書き換えるテストではない。既存実装が仕様を満たしていれば green、
 * 満たしていなければ red のまま残し、レポートで報告する。
 */

async function seedUser(
  t: T,
  patch: { role?: "user" | "admin"; email?: string } = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name: "テストユーザー",
      email: patch.email ?? `user-${Math.random()}@example.com`,
      role: patch.role ?? "user",
      is_active: true,
    });
  });
}

async function seedEvent(t: T) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("events", {
      slug: `event-${Math.random()}`,
      name: "テストイベント",
      status: "open",
      created_at: now,
      updated_at: now,
    });
  });
}

async function seedEventMember(t: T, eventId: Id<"events">, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("event_members", {
      event_id: eventId,
      user_id: userId,
      display_name: "メンバー",
      participant_count: 1,
      member_role: "member",
      joined_at: now,
      created_at: now,
      updated_at: now,
    });
  });
}

async function seedBringItem(t: T, eventId: Id<"events">, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("bring_items", {
      event_id: eventId,
      user_id: userId,
      display_name: "アイテム",
      item_category: "food",
      item_name: "サラダ",
      quantity: "1",
      carry_method: "bring_on_day",
      status: "active",
      created_at: now,
      updated_at: now,
    });
  });
}

async function seedFixture(t: T) {
  const memberUserId = await seedUser(t, { email: "member@example.com" });
  const eventId = await seedEvent(t);
  const eventMemberId = await seedEventMember(t, eventId, memberUserId);
  const bringItemId = await seedBringItem(t, eventId, memberUserId);
  return { memberUserId, eventId, eventMemberId, bringItemId };
}

describe("admin.*: 管理者は管理操作を実行できる（control）", () => {
  test("[control] 管理者は listEvents を呼べる", async () => {
    const t = convexTest(schema);
    const adminId = await seedUser(t, { role: "admin", email: "admin@example.com" });
    await seedEvent(t);

    const asAdmin = t.withIdentity({ subject: adminId });
    const events = await asAdmin.query(api.admin.listEvents, {});
    expect(Array.isArray(events)).toBe(true);
  });
});

describe("admin.*: 一般ユーザーは管理操作から拒否される（deny-by-default）", () => {
  test("listEvents を呼べない", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    await seedEvent(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(asUser.query(api.admin.listEvents, {})).rejects.toThrow(
      /管理者権限が必要です/,
    );
  });

  test("listUsers を呼べない", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(asUser.query(api.admin.listUsers, {})).rejects.toThrow(
      /管理者権限が必要です/,
    );
  });

  test("listEventMembers を呼べない", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    const { eventId } = await seedFixture(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.query(api.admin.listEventMembers, { event_id: eventId }),
    ).rejects.toThrow(/管理者権限が必要です/);
  });

  test("listBringItemsForEvent を呼べない", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    const { eventId } = await seedFixture(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.query(api.admin.listBringItemsForEvent, { event_id: eventId }),
    ).rejects.toThrow(/管理者権限が必要です/);
  });

  test("updateEvent を呼べない", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    const { eventId } = await seedFixture(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.mutation(api.admin.updateEvent, { id: eventId, name: "改ざん" }),
    ).rejects.toThrow(/管理者権限が必要です/);
  });

  test("updateEventMember を呼べない", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    const { eventMemberId } = await seedFixture(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.mutation(api.admin.updateEventMember, {
        id: eventMemberId,
        display_name: "改ざん",
      }),
    ).rejects.toThrow(/管理者権限が必要です/);
  });

  test("deleteEventMember を呼べない", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    const { eventMemberId } = await seedFixture(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.mutation(api.admin.deleteEventMember, { id: eventMemberId }),
    ).rejects.toThrow(/管理者権限が必要です/);
  });

  test("updateBringItem を呼べない", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    const { bringItemId } = await seedFixture(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.mutation(api.admin.updateBringItem, {
        id: bringItemId,
        display_name: "改ざん",
        convex_account_name: "attacker",
        item_category: "food",
        item_name: "改ざん品名",
        quantity: "1",
        carry_method: "bring_on_day",
      }),
    ).rejects.toThrow(/管理者権限が必要です/);
  });

  test("setBringItemStatus を呼べない", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    const { bringItemId } = await seedFixture(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.mutation(api.admin.setBringItemStatus, {
        id: bringItemId,
        status: "cancelled",
      }),
    ).rejects.toThrow(/管理者権限が必要です/);
  });

  test("updateUserAppProfile を呼べない（他人を admin に昇格させられない）", async () => {
    const t = convexTest(schema);
    const userId = await seedUser(t);
    const { memberUserId } = await seedFixture(t);
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.mutation(api.admin.updateUserAppProfile, {
        user_id: memberUserId,
        role: "admin",
      }),
    ).rejects.toThrow(/管理者権限が必要です/);

    // 実際に昇格していないことも確認する
    const stored = await t.run(async (ctx) => ctx.db.get(memberUserId));
    expect(stored?.role).toBe("user");
  });
});

describe("admin.*: 未認証ユーザーは管理操作から拒否される（deny-by-default）", () => {
  test("listEvents を呼べない", async () => {
    const t = convexTest(schema);
    await seedEvent(t);
    await expect(t.query(api.admin.listEvents, {})).rejects.toThrow(/認証が必要です/);
  });

  test("updateUserAppProfile を呼べない", async () => {
    const t = convexTest(schema);
    const { memberUserId } = await seedFixture(t);
    await expect(
      t.mutation(api.admin.updateUserAppProfile, {
        user_id: memberUserId,
        role: "admin",
      }),
    ).rejects.toThrow(/認証が必要です/);
  });
});
