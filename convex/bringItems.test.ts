import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { DEFAULT_EVENT_SLUG } from "./constants";
import schema from "./schema";

type T = ReturnType<typeof convexTest>;

/**
 * bring_items の認可 contract test。
 *
 * 実装（convex/bringItems.ts）が満たすべき仕様:
 * - 未認証は拒否される
 * - 自分の持ち込み品は本人が編集・取消できる
 * - 他人の持ち込み品は編集・取消できない（deny-by-default）
 * - 他人の持ち込み品は getForEdit で中身を取得できない（null を返す）
 * - admin ロールは全ユーザーの持ち込み品を編集・取消できる（仕様上の例外）
 *
 * 実装を書き換えるためのテストではない。既存実装が上記を満たしていれば green、
 * 満たしていなければ red のまま残し、レポートで報告する。
 */

async function seedUser(
  t: T,
  patch: { role?: "user" | "admin"; is_active?: boolean; email?: string } = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name: "テストユーザー",
      email: patch.email ?? `user-${Math.random()}@example.com`,
      role: patch.role ?? "user",
      is_active: patch.is_active ?? true,
    });
  });
}

async function seedDefaultEvent(t: T) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("events", {
      slug: DEFAULT_EVENT_SLUG,
      name: "テストイベント",
      status: "open",
      created_at: now,
      updated_at: now,
    });
  });
}

async function seedBringItem(
  t: T,
  eventId: Id<"events">,
  userId: Id<"users">,
  patch: Partial<{ display_name: string }> = {},
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("bring_items", {
      event_id: eventId,
      user_id: userId,
      display_name: patch.display_name ?? "オーナー",
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

const validUpdatePayload = (id: Id<"bring_items">) => ({
  id,
  display_name: "書き換え後",
  convex_account_name: "attacker-account",
  item_category: "food" as const,
  item_name: "改ざんされた品名",
  quantity: "999",
  carry_method: "bring_on_day" as const,
});

describe("bringItems: 本人と管理者は自分（全員）の持ち込み品を操作できる（control）", () => {
  test("[control] 本人は自分の持ち込み品を更新できる", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, { email: "owner@example.com" });
    const eventId = await seedDefaultEvent(t);
    const itemId = await seedBringItem(t, eventId, ownerId);

    const asOwner = t.withIdentity({ subject: ownerId });
    await expect(
      asOwner.mutation(api.bringItems.update, validUpdatePayload(itemId)),
    ).resolves.toBe(itemId);
  });

  test("[control] admin ロールは他人の持ち込み品も編集できる（仕様通りの例外）", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, { email: "owner2@example.com" });
    const adminId = await seedUser(t, { role: "admin", email: "admin@example.com" });
    const eventId = await seedDefaultEvent(t);
    const itemId = await seedBringItem(t, eventId, ownerId);

    const asAdmin = t.withIdentity({ subject: adminId });
    await expect(
      asAdmin.mutation(api.bringItems.update, validUpdatePayload(itemId)),
    ).resolves.toBe(itemId);
  });
});

describe("bringItems: 権限のないユーザーは他人のデータ/操作にアクセスできない（deny-by-default）", () => {
  test("他人の持ち込み品は更新できない", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, { email: "owner3@example.com" });
    const attackerId = await seedUser(t, { email: "attacker@example.com" });
    const eventId = await seedDefaultEvent(t);
    const itemId = await seedBringItem(t, eventId, ownerId);

    const asAttacker = t.withIdentity({ subject: attackerId });
    await expect(
      asAttacker.mutation(api.bringItems.update, validUpdatePayload(itemId)),
    ).rejects.toThrow(/編集する権限がありません/);

    // 実際に書き換わっていないことも確認する
    const stored = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(stored?.display_name).toBe("オーナー");
  });

  test("他人の持ち込み品は取消（キャンセル）できない", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, { email: "owner4@example.com" });
    const attackerId = await seedUser(t, { email: "attacker2@example.com" });
    const eventId = await seedDefaultEvent(t);
    const itemId = await seedBringItem(t, eventId, ownerId);

    const asAttacker = t.withIdentity({ subject: attackerId });
    await expect(
      asAttacker.mutation(api.bringItems.cancel, { id: itemId }),
    ).rejects.toThrow(/削除する権限がありません/);

    const stored = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(stored?.status).toBe("active");
  });

  test("他人の持ち込み品は getForEdit で取得できない（null が返る）", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, { email: "owner5@example.com" });
    const attackerId = await seedUser(t, { email: "attacker3@example.com" });
    const eventId = await seedDefaultEvent(t);
    const itemId = await seedBringItem(t, eventId, ownerId);

    const asAttacker = t.withIdentity({ subject: attackerId });
    const result = await asAttacker.query(api.bringItems.getForEdit, { id: itemId });
    expect(result).toBeNull();
  });

  test("未認証ユーザーは持ち込み品を作成できない", async () => {
    const t = convexTest(schema);
    await seedDefaultEvent(t);

    await expect(
      t.mutation(api.bringItems.create, {
        display_name: "名無し",
        convex_account_name: "anon",
        item_category: "food",
        item_name: "不正な作成",
        quantity: "1",
        carry_method: "bring_on_day",
      }),
    ).rejects.toThrow(/認証が必要です/);
  });

  test("未認証ユーザーは一覧クエリを呼べない", async () => {
    const t = convexTest(schema);
    await seedDefaultEvent(t);

    await expect(t.query(api.bringItems.listActiveForDefaultEvent, {})).rejects.toThrow(
      /認証が必要です/,
    );
  });
});

describe("[既知の懸念] is_active=false（無効化済み）ユーザーの扱い", () => {
  test("無効化されたユーザーは持ち込み品を作成できない、はず", async () => {
    const t = convexTest(schema);
    const deactivatedId = await seedUser(t, { is_active: false, email: "deactivated@example.com" });
    await seedDefaultEvent(t);

    const asDeactivated = t.withIdentity({ subject: deactivatedId });

    // 期待仕様: is_active=false のユーザーは書き込み操作から拒否されるべき。
    // 現状の convex/bringItems.ts の requireUser() は is_active を一切見ていないため、
    // このテストは red のまま残る想定（実装バグの検出）。本体コードは書き換えない。
    await expect(
      asDeactivated.mutation(api.bringItems.create, {
        display_name: "無効ユーザー",
        convex_account_name: "deactivated-account",
        item_category: "food",
        item_name: "本来は拒否されるべき作成",
        quantity: "1",
        carry_method: "bring_on_day",
      }),
    ).rejects.toThrow();
  });
});
