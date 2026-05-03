import { internalMutation } from "./_generated/server";
import { DEFAULT_EVENT_SLUG } from "./constants";

/** Run once: `npx convex run seed:seedDefaultEvent` */
export const seedDefaultEvent = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", DEFAULT_EVENT_SLUG))
      .unique();
    if (existing !== null) {
      return { eventId: existing._id, created: false as const };
    }
    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      slug: DEFAULT_EVENT_SLUG,
      name: "持ち込み管理イベント",
      description: "単一イベント（MVP）。名称はダッシュボードから変更可能です。",
      status: "open",
      created_at: now,
      updated_at: now,
    });
    return { eventId, created: true as const };
  },
});
