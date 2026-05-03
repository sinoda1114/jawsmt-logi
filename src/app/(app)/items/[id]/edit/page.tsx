"use client";

import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BringItemForm } from "@/components/BringItemForm";
import { api } from "@/lib/convex";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export default function EditItemPage() {
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated } = useConvexAuth();
  const item = useQuery(
    api.bringItems.getForEdit,
    isAuthenticated && id ? { id: id as Id<"bring_items"> } : "skip",
  );
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const update = useMutation(api.bringItems.update);

  if (!viewer) {
    return (
      <div className="py-16 text-center text-sm font-medium text-zinc-800">読み込み中…</div>
    );
  }

  if (item === undefined) {
    return (
      <div className="py-16 text-center text-sm font-medium text-zinc-800">読み込み中…</div>
    );
  }

  if (item === null) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="font-medium text-zinc-900">この持ち込み品は編集できないか、存在しません。</p>
        <Link href="/" className="mt-4 inline-block text-aws-link hover:text-aws-link-hover hover:underline">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  return (
    <BringItemForm
      mode="edit"
      defaultDisplayName={viewer.name}
      initial={item}
      onSubmit={async (values) => {
        await update({ id: item._id, ...values });
      }}
    />
  );
}
