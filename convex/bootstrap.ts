import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { DEFAULT_EVENT_SLUG } from "./constants";
import { resolveRoleForEmail } from "./lib/adminEmails";

/** ログイン後にクライアントから1回呼び出し、イベント参加レコードを確保する */
export const ensureEventMembership = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("認証が必要です");
    }
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error("認証が必要です");
    }

    const email = user.email ?? undefined;
    const role = resolveRoleForEmail(email);
    // 無効化済み(is_active: false)のユーザーはここで true に戻さない。
    const shouldStayActive = user.is_active !== false;
    await ctx.db.patch(userId, {
      role,
      ...(shouldStayActive ? { is_active: true } : {}),
      last_login_at: Date.now(),
    });

    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", DEFAULT_EVENT_SLUG))
      .unique();
    if (event === null) {
      return { ok: true as const, eventMissing: true as const };
    }

    const displayName = user.name ?? "参加者";
    const now = Date.now();
    const memberRole = role === "admin" ? ("admin" as const) : ("member" as const);

    const existing = await ctx.db
      .query("event_members")
      .withIndex("by_event_and_user", (q) =>
        q.eq("event_id", event._id).eq("user_id", userId),
      )
      .unique();

    if (existing === null) {
      await ctx.db.insert("event_members", {
        event_id: event._id,
        user_id: userId,
        display_name: displayName,
        participant_count: 1,
        member_role: memberRole,
        joined_at: now,
        created_at: now,
        updated_at: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        display_name: displayName,
        member_role: memberRole,
        updated_at: now,
      });
    }

    return { ok: true as const, eventMissing: false as const };
  },
});
