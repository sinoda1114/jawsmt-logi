import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isLoginPage = createRouteMatcher(["/login"]);
const isAdminRoute = createRouteMatcher(["/admin"]);

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/";
  }
  return raw;
}

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (request.nextUrl.pathname.startsWith("/api/auth")) {
      return;
    }
    const authed = await convexAuth.isAuthenticated();
    if (isLoginPage(request) && authed) {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"));
      return nextjsMiddlewareRedirect(request, next);
    }
    if (!isLoginPage(request) && !authed) {
      if (isAdminRoute(request)) {
        return nextjsMiddlewareRedirect(
          request,
          `/login?next=${encodeURIComponent("/admin")}`,
        );
      }
      return nextjsMiddlewareRedirect(request, "/login");
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
