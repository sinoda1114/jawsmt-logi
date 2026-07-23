import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { DEFAULT_EVENT_SLUG } from "./constants";
import { assertBringItemFields } from "./lib/bringItemValidation";
import {
  carryMethodValidator,
  itemCategoryValidator,
  shippingStatusValidator,
} from "./lib/validators";

type DbCtx = QueryCtx | MutationCtx;

async function requireUser(ctx: DbCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("認証が必要です");
  }
  const user = await ctx.db.get(userId);
  if (user === null) {
    throw new Error("認証が必要です");
  }
  if (user.is_active === false) {
    throw new Error("アカウントが無効化されています");
  }
  return { userId, user };
}

async function getDefaultEvent(ctx: DbCtx) {
  return await ctx.db
    .query("events")
    .withIndex("by_slug", (q) => q.eq("slug", DEFAULT_EVENT_SLUG))
    .unique();
}

function resolvedShippingStatus(
  carryMethod: "bring_on_day" | "ship_in_advance",
  input: "before_ship" | "shipped" | undefined,
): "before_ship" | "shipped" | undefined {
  if (carryMethod === "bring_on_day") return undefined;
  return input ?? "before_ship";
}

function canManageItem(
  userId: Id<"users">,
  item: { user_id: Id<"users"> },
  role: "user" | "admin" | undefined,
) {
  if (item.user_id === userId) return true;
  if (role === "admin") return true;
  return false;
}

export const listActiveForDefaultEvent = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    const event = await getDefaultEvent(ctx);
    if (event === null) {
      return {
        event: null,
        items: [],
        currentUserId: userId,
        isAdmin: user.role === "admin",
      };
    }

    const raw = await ctx.db
      .query("bring_items")
      .withIndex("by_event", (q) => q.eq("event_id", event._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    raw.sort((a, b) => b.updated_at - a.updated_at);

    return {
      event: { _id: event._id, name: event.name },
      items: raw.map((it) => ({
        ...it,
        canEdit: canManageItem(userId, it, user.role),
      })),
      currentUserId: userId,
      isAdmin: user.role === "admin",
    };
  },
});

export const getForEdit = query({
  args: { id: v.id("bring_items") },
  handler: async (ctx, { id }) => {
    const { userId, user } = await requireUser(ctx);
    const item = await ctx.db.get(id);
    if (item === null) return null;
    if (!canManageItem(userId, item, user.role)) return null;
    return item;
  },
});

export const create = mutation({
  args: {
    display_name: v.string(),
    convex_account_name: v.string(),
    item_category: itemCategoryValidator,
    item_name: v.string(),
    quantity: v.string(),
    carry_method: carryMethodValidator,
    shipping_status: v.optional(shippingStatusValidator),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    assertBringItemFields({
      display_name: args.display_name,
      convex_account_name: args.convex_account_name,
      item_category: args.item_category,
      item_name: args.item_name,
      quantity: args.quantity,
      carry_method: args.carry_method,
      shipping_status: args.shipping_status,
      memo: args.memo,
    });

    const event = await getDefaultEvent(ctx);
    if (event === null) {
      throw new Error(
        "イベントが未設定です。`npx convex run seed:seedDefaultEvent` を実行してください。",
      );
    }

    const member = await ctx.db
      .query("event_members")
      .withIndex("by_event_and_user", (q) =>
        q.eq("event_id", event._id).eq("user_id", userId),
      )
      .unique();

    const now = Date.now();
    return await ctx.db.insert("bring_items", {
      event_id: event._id,
      user_id: userId,
      event_member_id: member?._id,
      display_name: args.display_name.trim(),
      convex_account_name: args.convex_account_name.trim(),
      item_category: args.item_category,
      item_name: args.item_name.trim(),
      quantity: args.quantity.trim(),
      carry_method: args.carry_method,
      shipping_status: resolvedShippingStatus(
        args.carry_method,
        args.shipping_status,
      ),
      memo: args.memo?.trim() ? args.memo.trim() : undefined,
      status: "active",
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("bring_items"),
    display_name: v.string(),
    convex_account_name: v.string(),
    item_category: itemCategoryValidator,
    item_name: v.string(),
    quantity: v.string(),
    carry_method: carryMethodValidator,
    shipping_status: v.optional(shippingStatusValidator),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const item = await ctx.db.get(args.id);
    if (item === null) {
      throw new Error("データが見つかりません");
    }
    if (!canManageItem(userId, item, user.role)) {
      throw new Error("編集する権限がありません");
    }

    assertBringItemFields({
      display_name: args.display_name,
      convex_account_name: args.convex_account_name,
      item_category: args.item_category,
      item_name: args.item_name,
      quantity: args.quantity,
      carry_method: args.carry_method,
      shipping_status: args.shipping_status,
      memo: args.memo,
    });

    const now = Date.now();
    await ctx.db.patch(args.id, {
      display_name: args.display_name.trim(),
      convex_account_name: args.convex_account_name.trim(),
      item_category: args.item_category,
      item_name: args.item_name.trim(),
      quantity: args.quantity.trim(),
      carry_method: args.carry_method,
      shipping_status: resolvedShippingStatus(
        args.carry_method,
        args.shipping_status,
      ),
      memo: args.memo?.trim() ? args.memo.trim() : undefined,
      updated_at: now,
    });
    return args.id;
  },
});

export const cancel = mutation({
  args: { id: v.id("bring_items") },
  handler: async (ctx, { id }) => {
    const { userId, user } = await requireUser(ctx);
    const item = await ctx.db.get(id);
    if (item === null) {
      throw new Error("データが見つかりません");
    }
    if (!canManageItem(userId, item, user.role)) {
      throw new Error("削除する権限がありません");
    }
    await ctx.db.patch(id, {
      status: "cancelled",
      updated_at: Date.now(),
    });
    return id;
  },
});
