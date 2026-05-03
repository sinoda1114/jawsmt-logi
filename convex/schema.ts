import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const userRole = v.union(v.literal("user"), v.literal("admin"));
const eventStatus = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("closed"),
);
const memberRole = v.union(v.literal("member"), v.literal("admin"));
const itemCategory = v.union(
  v.literal("food"),
  v.literal("drink"),
  v.literal("seasoning"),
  v.literal("equipment"),
  v.literal("other"),
);
const carryMethod = v.union(
  v.literal("bring_on_day"),
  v.literal("ship_in_advance"),
);
const shippingStatus = v.union(
  v.literal("before_ship"),
  v.literal("shipped"),
);
const itemStatus = v.union(v.literal("active"), v.literal("cancelled"));

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    google_sub: v.optional(v.string()),
    role: v.optional(userRole),
    is_active: v.optional(v.boolean()),
    last_login_at: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  events: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    event_date: v.optional(v.string()),
    location: v.optional(v.string()),
    status: eventStatus,
    created_by_user_id: v.optional(v.id("users")),
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_slug", ["slug"]),
  event_members: defineTable({
    event_id: v.id("events"),
    user_id: v.id("users"),
    display_name: v.string(),
    participant_count: v.number(),
    member_role: memberRole,
    memo: v.optional(v.string()),
    joined_at: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_event", ["event_id"])
    .index("by_event_and_user", ["event_id", "user_id"])
    .index("by_user", ["user_id"]),
  bring_items: defineTable({
    event_id: v.id("events"),
    user_id: v.id("users"),
    event_member_id: v.optional(v.id("event_members")),
    display_name: v.string(),
    /** 画面表記は「コンパスアカウント名」（Convex ダッシュボードのアカウント名など） */
    convex_account_name: v.optional(v.string()),
    item_category: itemCategory,
    item_name: v.string(),
    quantity: v.string(),
    carry_method: carryMethod,
    shipping_status: v.optional(shippingStatus),
    memo: v.optional(v.string()),
    status: itemStatus,
    sort_order: v.optional(v.number()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_event", ["event_id"])
    .index("by_event_and_user", ["event_id", "user_id"])
    .index("by_user", ["user_id"]),
});
