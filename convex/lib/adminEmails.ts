/**
 * Convex の環境変数 `ADMIN_EMAILS`（カンマ区切り）を小文字化して照合する。
 * メールアドレスをコードに埋め込まない（リーク・フォーク時の事故防止）。
 */
export function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function resolveRoleForEmail(
  email: string | undefined,
): "admin" | "user" {
  if (!email) return "user";
  return adminEmailSet().has(email.toLowerCase()) ? "admin" : "user";
}
