import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { resolveRoleForEmail } from "./lib/adminEmails";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      profile(googleProfile) {
        return {
          id: googleProfile.sub ?? googleProfile.email ?? "",
          name: googleProfile.name,
          email: googleProfile.email,
          image: googleProfile.picture,
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, profile }) {
      const email = typeof profile.email === "string" ? profile.email : undefined;
      const role = resolveRoleForEmail(email);
      const google_sub =
        typeof (profile as { id?: string }).id === "string"
          ? (profile as { id: string }).id
          : undefined;

      // 既に管理者が is_active: false（無効化）にしたユーザーは、再ログインしても
      // 無効化状態を維持する。新規ユーザーは is_active 未設定なので true になる。
      const existing = await ctx.db.get(userId);
      const shouldStayActive = existing?.is_active !== false;

      await ctx.db.patch(userId, {
        role,
        ...(shouldStayActive ? { is_active: true } : {}),
        last_login_at: Date.now(),
        ...(google_sub !== undefined ? { google_sub } : {}),
      });
    },
  },
});
