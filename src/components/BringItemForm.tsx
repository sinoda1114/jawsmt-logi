"use client";

import type { Doc } from "../../convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShippingDestinationNotice } from "@/components/ShippingDestinationNotice";
import {
  CARRY_METHOD_LABELS,
  ITEM_CATEGORY_LABELS,
  SHIPPING_STATUS_LABELS,
  type CarryMethod,
  type ItemCategory,
  type ShippingStatus,
} from "@/lib/labels";

const CATEGORIES: ItemCategory[] = [
  "food",
  "drink",
  "seasoning",
  "equipment",
  "other",
];
const CARRY: CarryMethod[] = ["bring_on_day", "ship_in_advance"];
const SHIPPING: ShippingStatus[] = ["before_ship", "shipped"];

type Mode = "create" | "edit";

export function BringItemForm(props: {
  mode: Mode;
  defaultDisplayName: string;
  initial?: Doc<"bring_items"> | null;
  onSubmit: (values: {
    display_name: string;
    convex_account_name: string;
    item_category: ItemCategory;
    item_name: string;
    quantity: string;
    carry_method: CarryMethod;
    shipping_status?: ShippingStatus;
    memo: string;
  }) => Promise<void>;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    props.initial?.display_name ?? props.defaultDisplayName,
  );
  const [convexAccountName, setConvexAccountName] = useState(
    props.initial?.convex_account_name ?? "",
  );
  const [itemCategory, setItemCategory] = useState<ItemCategory>(
    props.initial?.item_category ?? "food",
  );
  const [itemName, setItemName] = useState(props.initial?.item_name ?? "");
  const [quantity, setQuantity] = useState(props.initial?.quantity ?? "");
  const [carryMethod, setCarryMethod] = useState<CarryMethod>(
    props.initial?.carry_method ?? "bring_on_day",
  );
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>(
    props.initial?.carry_method === "ship_in_advance"
      ? (props.initial.shipping_status ?? "before_ship")
      : "before_ship",
  );
  const [memo, setMemo] = useState(props.initial?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const title = useMemo(
    () => (props.mode === "create" ? "持ち込み品を登録" : "持ち込み品を編集"),
    [props.mode],
  );

  useEffect(() => {
    void router.prefetch("/");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await props.onSubmit({
        display_name: displayName,
        convex_account_name: convexAccountName,
        item_category: itemCategory,
        item_name: itemName,
        quantity,
        carry_method: carryMethod,
        shipping_status:
          carryMethod === "ship_in_advance" ? shippingStatus : undefined,
        memo,
      });
      /* 一覧は Convex useQuery が購読するため router.refresh は不要（遅延の主因になりやすい） */
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-950/5">
        <h1 className="text-2xl font-bold tracking-tight text-aws-ink">{title}</h1>
      </div>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-5 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        <label className="block text-sm font-semibold text-zinc-900">
          名前 <span className="text-red-600">*</span>
          <input
            required
            maxLength={50}
            className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-aws-orange focus:ring-2 focus:ring-aws-orange/35"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

        <label className="block text-sm font-semibold text-zinc-900">
          コンパスアカウント名 <span className="text-red-600">*</span>
          <input
            required
            maxLength={80}
            placeholder="例: ダッシュボードに表示されるアカウント名"
            className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-aws-orange focus:ring-2 focus:ring-aws-orange/35"
            value={convexAccountName}
            onChange={(e) => setConvexAccountName(e.target.value)}
          />
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            必須です。一覧の「コンパスアカウント名」列に表示されます。
          </span>
        </label>

        <label className="block text-sm font-semibold text-zinc-900">
          飲食区分 <span className="text-red-600">*</span>
          <select
            required
            className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-aws-orange focus:ring-2 focus:ring-aws-orange/35"
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value as ItemCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ITEM_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-zinc-900">
          品名 <span className="text-red-600">*</span>
          <input
            required
            maxLength={100}
            placeholder="例：ビール、紙皿"
            className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-aws-orange focus:ring-2 focus:ring-aws-orange/35"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
        </label>

        <label className="block text-sm font-semibold text-zinc-900">
          量 <span className="text-red-600">*</span>
          <input
            required
            maxLength={50}
            placeholder="例：24本、人数分"
            className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-aws-orange focus:ring-2 focus:ring-aws-orange/35"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>

        <label className="block text-sm font-semibold text-zinc-900">
          持込み方法 <span className="text-red-600">*</span>
          <select
            required
            className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-aws-orange focus:ring-2 focus:ring-aws-orange/35"
            value={carryMethod}
            onChange={(e) => {
              const next = e.target.value as CarryMethod;
              if (carryMethod === "bring_on_day" && next === "ship_in_advance") {
                setShippingStatus("before_ship");
              }
              setCarryMethod(next);
            }}
          >
            {CARRY.map((c) => (
              <option key={c} value={c}>
                {CARRY_METHOD_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        {carryMethod === "ship_in_advance" ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-600">
              事前送付の品は、次の宛先へお送りください。
            </p>
            <ShippingDestinationNotice />
          </div>
        ) : null}

        {carryMethod === "ship_in_advance" ? (
          <label className="block text-sm font-semibold text-zinc-900">
            発送状態 <span className="text-red-600">*</span>
            <select
              required
              className="mt-1 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-aws-orange focus:ring-2 focus:ring-aws-orange/35"
              value={shippingStatus}
              onChange={(e) => setShippingStatus(e.target.value as ShippingStatus)}
            >
              {SHIPPING.map((s) => (
                <option key={s} value={s}>
                  {SHIPPING_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-zinc-500">
              事前送付のときのみ（初期値は発送前）
            </span>
          </label>
        ) : null}

        <label className="block text-sm font-semibold text-zinc-900">
          備考
          <textarea
            maxLength={500}
            rows={4}
            placeholder="任意"
            className="mt-1 w-full resize-y rounded-lg border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-aws-orange focus:ring-2 focus:ring-aws-orange/35"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </label>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Link
            href="/"
            className="inline-flex justify-center rounded-lg border border-zinc-400 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center rounded-lg border border-[#d45a00] bg-aws-orange px-4 py-2.5 text-sm font-semibold text-aws-ink shadow-sm hover:bg-aws-orange-hover disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
