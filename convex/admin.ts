import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { assertBringItemFields } from "./lib/bringItemValidation";
import {
  appUserRoleValidator,
  carryMethodValidator,
  eventStatusValidator,
  itemCategoryValidator,
  itemStatusValidator,
  memberRoleValidator,
  shippingStatusValidator,
} from "./lib/validators";

type DbCtx = QueryCtx | MutationCtx;

async function requireAdmin(ctx: DbCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("認証が必要です");
  }
  const user = await ctx.db.get(userId);
  if (user === null || user.role !== "admin") {
    throw new Error("管理者権限が必要です");
  }
  if (user.is_active === false) {
    throw new Error("アカウントが無効化されています");
  }
  return { userId, user };
}

function resolvedShippingStatus(
  carryMethod: "bring_on_day" | "ship_in_advance",
  input: "before_ship" | "shipped" | undefined,
): "before_ship" | "shipped" | undefined {
  if (carryMethod === "bring_on_day") return undefined;
  return input ?? "before_ship";
}

export const listEvents = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("events").collect();
    rows.sort((a, b) => b.updated_at - a.updated_at);
    return rows;
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("users").collect();
    rows.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return rows.map((u) => ({
      _id: u._id,
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role ?? "user",
      is_active: u.is_active ?? true,
    }));
  },
});

export const listEventMembers = query({
  args: { event_id: v.id("events") },
  handler: async (ctx, { event_id }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("event_members")
      .withIndex("by_event", (q) => q.eq("event_id", event_id))
      .collect();
    rows.sort((a, b) => b.updated_at - a.updated_at);
    return rows;
  },
});

export const listBringItemsForEvent = query({
  args: { event_id: v.id("events") },
  handler: async (ctx, { event_id }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("bring_items")
      .withIndex("by_event", (q) => q.eq("event_id", event_id))
      .collect();
    rows.sort((a, b) => b.updated_at - a.updated_at);
    return rows;
  },
});

export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    slug: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    event_date: v.optional(v.string()),
    location: v.optional(v.string()),
    status: v.optional(eventStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const event = await ctx.db.get(args.id);
    if (event === null) {
      throw new Error("イベントが見つかりません");
    }
    const now = Date.now();
    const patch: {
      slug?: string;
      name?: string;
      description?: string;
      event_date?: string;
      location?: string;
      status?: "draft" | "open" | "closed";
      updated_at: number;
    } = { updated_at: now };

    if (args.slug !== undefined) {
      const s = args.slug.trim();
      if (!s) throw new Error("slug は空にできません");
      if (s !== event.slug) {
        const dup = await ctx.db
          .query("events")
          .withIndex("by_slug", (q) => q.eq("slug", s))
          .unique();
        if (dup !== null && dup._id !== args.id) {
          throw new Error("この slug は既に使われています");
        }
        patch.slug = s;
      }
    }
    if (args.name !== undefined) {
      const n = args.name.trim();
      if (!n) throw new Error("名称は必須です");
      patch.name = n;
    }
    if (args.description !== undefined) {
      const d = args.description.trim();
      patch.description = d.length > 0 ? d : undefined;
    }
    if (args.event_date !== undefined) {
      const ed = args.event_date.trim();
      patch.event_date = ed.length > 0 ? ed : undefined;
    }
    if (args.location !== undefined) {
      const loc = args.location.trim();
      patch.location = loc.length > 0 ? loc : undefined;
    }
    if (args.status !== undefined) {
      patch.status = args.status;
    }

    const changedKeys = Object.keys(patch).filter((k) => k !== "updated_at");
    if (changedKeys.length === 0) {
      return args.id;
    }
    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

export const updateEventMember = mutation({
  args: {
    id: v.id("event_members"),
    display_name: v.optional(v.string()),
    participant_count: v.optional(v.number()),
    member_role: v.optional(memberRoleValidator),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (row === null) {
      throw new Error("メンバーが見つかりません");
    }
    const now = Date.now();
    const patch: {
      display_name?: string;
      participant_count?: number;
      member_role?: "member" | "admin";
      memo?: string;
      updated_at: number;
    } = { updated_at: now };

    if (args.display_name !== undefined) {
      const dn = args.display_name.trim();
      if (!dn) throw new Error("表示名は必須です");
      patch.display_name = dn;
    }
    if (args.participant_count !== undefined) {
      const n = args.participant_count;
      if (!Number.isInteger(n) || n < 1 || n > 999) {
        throw new Error("参加人数は 1〜999 の整数にしてください");
      }
      patch.participant_count = n;
    }
    if (args.member_role !== undefined) {
      patch.member_role = args.member_role;
    }
    if (args.memo !== undefined) {
      const m = args.memo.trim();
      patch.memo = m.length > 0 ? m : undefined;
    }

    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

export const deleteEventMember = mutation({
  args: { id: v.id("event_members") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    if (row === null) {
      throw new Error("メンバーが見つかりません");
    }
    const items = await ctx.db
      .query("bring_items")
      .withIndex("by_event", (q) => q.eq("event_id", row.event_id))
      .collect();
    const linked = items.some((it) => it.event_member_id === id);
    if (linked) {
      throw new Error("このメンバーに紐づく持ち込み品があるため削除できません");
    }
    await ctx.db.delete(id);
    return id;
  },
});

export const updateBringItem = mutation({
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
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.id);
    if (item === null) {
      throw new Error("データが見つかりません");
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
      shipping_status: resolvedShippingStatus(args.carry_method, args.shipping_status),
      memo: args.memo?.trim() ? args.memo.trim() : undefined,
      updated_at: now,
    });
    return args.id;
  },
});

export const setBringItemStatus = mutation({
  args: {
    id: v.id("bring_items"),
    status: itemStatusValidator,
  },
  handler: async (ctx, { id, status }) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(id);
    if (item === null) {
      throw new Error("データが見つかりません");
    }
    await ctx.db.patch(id, {
      status,
      updated_at: Date.now(),
    });
    return id;
  },
});

export const updateUserAppProfile = mutation({
  args: {
    user_id: v.id("users"),
    role: v.optional(appUserRoleValidator),
    is_active: v.optional(v.boolean()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.user_id);
    if (row === null) {
      throw new Error("ユーザーが見つかりません");
    }
    const patch: {
      role?: "user" | "admin";
      is_active?: boolean;
      name?: string;
    } = {};
    if (args.role !== undefined) {
      patch.role = args.role;
    }
    if (args.is_active !== undefined) {
      patch.is_active = args.is_active;
    }
    if (args.name !== undefined) {
      const n = args.name.trim();
      patch.name = n.length > 0 ? n : undefined;
    }
    if (Object.keys(patch).length === 0) {
      return args.user_id;
    }
    await ctx.db.patch(args.user_id, patch);
    return args.user_id;
  },
});
