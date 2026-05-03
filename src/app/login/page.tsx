"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { HEADER_TITLE } from "@/lib/branding";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/";
  }
  return raw;
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden={true}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginInner() {
  const { signIn } = useAuthActions();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // フルリロードで Cookie を確実に反映（クライアント遷移だけだとセッションとミドルウェアがずれることがある）
      window.location.replace(nextPath);
    }
  }, [isAuthenticated, isLoading, nextPath]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-aws-ink">{HEADER_TITLE}</h1>
        <div className="mt-4 space-y-2 text-center text-sm font-medium leading-relaxed text-zinc-800">
          <p>JAWS ミートの持込み品を、参加者みんなで共有するアプリです。</p>
          <p>持込品の登録・閲覧には、Google アカウントでのログインが必要です。</p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-black/[0.04] transition hover:bg-zinc-50 hover:shadow disabled:opacity-50"
          onClick={() => void signIn("google", { redirectTo: nextPath })}
        >
          {isLoading ? (
            "読み込み中…"
          ) : (
            <>
              <GoogleMark className="shrink-0" />
              <span>Google でログイン</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-sm font-medium text-zinc-800">
          読み込み中…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
