"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Image from "next/image";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { HEADER_TITLE } from "@/lib/branding";

export function AppHeader() {
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();

  return (
    <header className="border-b border-zinc-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label={HEADER_TITLE}
          className="group flex min-w-0 shrink items-center gap-2.5 rounded-md px-2 py-1 -mx-2 -my-1 outline-none transition-colors hover:bg-aws-tint/80 focus-visible:bg-aws-tint/80 focus-visible:ring-2 focus-visible:ring-aws-orange/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <Image
            src="/favicon.ico"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded object-contain"
            unoptimized
            aria-hidden={true}
          />
          <span className="min-w-0 truncate whitespace-nowrap border-b-2 border-transparent pb-px text-base font-semibold tracking-tight text-aws-ink transition-[border-color] group-hover:border-aws-orange group-focus-visible:border-aws-orange">
            {HEADER_TITLE}
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium text-zinc-800">
          {viewer?.isAdmin ? (
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-800 hover:bg-zinc-50"
            >
              管理
            </Link>
          ) : null}
          {viewer ? (
            <span className="hidden max-w-[12rem] truncate text-xs font-normal text-zinc-600 sm:inline">
              {viewer.name}
              {viewer.isAdmin ? (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                  管理者
                </span>
              ) : null}
            </span>
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-800 hover:bg-zinc-50"
            onClick={() => void signOut()}
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
