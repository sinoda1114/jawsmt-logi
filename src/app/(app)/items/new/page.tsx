"use client";

import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { BringItemForm } from "@/components/BringItemForm";
import { api } from "@/lib/convex";

export default function NewItemPage() {
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const create = useMutation(api.bringItems.create);

  if (!viewer) {
    return (
      <div className="py-16 text-center text-sm font-medium text-zinc-800">読み込み中…</div>
    );
  }

  return (
    <BringItemForm
      mode="create"
      defaultDisplayName={viewer.name}
      onSubmit={async (values) => {
        await create(values);
      }}
    />
  );
}
