"use client";

import type { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useState } from "react";
import { api } from "@/lib/convex";
import {
  CARRY_METHOD_LABELS,
  ITEM_CATEGORY_LABELS,
  SHIPPING_STATUS_LABELS,
  type CarryMethod,
  type ItemCategory,
  type ShippingStatus,
} from "@/lib/labels";

export default function HomePage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const data = useQuery(
    api.bringItems.listActiveForDefaultEvent,
    isAuthenticated ? {} : "skip",
  );
  const cancelItem = useMutation(api.bringItems.cancel);
  const [catFilter, setCatFilter] = useState<ItemCategory | "all">("all");
  const [carryFilter, setCarryFilter] = useState<CarryMethod | "all">("all");
  /** 発送前＝当日持参を含む／発送済み＝事前送付かつ発送済みのみ */
  const [shipFilter, setShipFilter] = useState<"all" | ShippingStatus>("all");
  const [keyword, setKeyword] = useState("");

  const items = data?.items ?? [];
  const filtered = items.filter((row) => {
    if (catFilter !== "all" && row.item_category !== catFilter) return false;
    if (carryFilter !== "all" && row.carry_method !== carryFilter) return false;
    if (shipFilter !== "all") {
      if (shipFilter === "shipped") {
        if (row.carry_method !== "ship_in_advance" || row.shipping_status !== "shipped") {
          return false;
        }
      } else {
        const pendingAdvance =
          row.carry_method === "ship_in_advance" &&
          (row.shipping_status ?? "before_ship") === "before_ship";
        const bringDay = row.carry_method === "bring_on_day";
        if (!pendingAdvance && !bringDay) return false;
      }
    }
    if (keyword.trim().length > 0) {
      const query = keyword.trim().toLowerCase();
      const shipLabel =
        row.carry_method === "ship_in_advance"
          ? SHIPPING_STATUS_LABELS[row.shipping_status ?? "before_ship"]
          : "";
      const searchable = [
        row.display_name,
        row.convex_account_name ?? "",
        row.item_name,
        row.memo ?? "",
        shipLabel,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  });

  const summaryByCategory = (Object.keys(ITEM_CATEGORY_LABELS) as ItemCategory[]).map((key) => ({
    key,
    label: ITEM_CATEGORY_LABELS[key],
    count: filtered.filter((item) => item.item_category === key).length,
  }));

  async function onCancel(id: Id<"bring_items">) {
    if (!confirm("この持ち込み品を取り消しますか？（一覧からは消えます）")) return;
    try {
      await cancelItem({ id });
    } catch (e) {
      alert(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex justify-center py-20 text-sm font-medium text-zinc-800">
        読み込み中…
      </div>
    );
  }

  if (data?.event === null) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <p className="font-semibold">デフォルトのイベントがまだありません（初回のみ）</p>
        <p className="mt-2 leading-relaxed">
          データベースにイベントが無いときの案内です。ターミナルで次を 1 回実行してから、このページを再読み込みしてください。
        </p>
        <code className="mt-3 block rounded bg-white/80 px-3 py-2 font-mono text-xs">
          npm run convex:seed
        </code>
        <p className="mt-2 text-xs text-amber-900/80">
          または <code className="rounded bg-white/60 px-1">npx convex run seed:seedDefaultEvent</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="sr-only">持ち込み一覧</h1>
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-950/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
              参加者みんなで持込み品を共有するアプリです
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 sm:text-base">
              持込品がある方は「持込品を追加」から記載をお願いします
            </p>
          </div>
          <Link
            href="/items/new"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d45a00] bg-aws-orange px-4 text-sm font-semibold text-aws-ink shadow-sm hover:bg-aws-orange-hover"
          >
            持込品を追加
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm shadow-sm ring-1 ring-zinc-950/5">
        <span className="mb-1 self-center shrink-0 text-xs font-medium tracking-wide text-zinc-500">
          絞り込み
        </span>
        <select
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 shadow-sm ring-1 ring-zinc-900/10 focus:border-aws-orange focus:outline-none focus:ring-2 focus:ring-aws-orange/30"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as ItemCategory | "all")}
        >
          <option value="all">区分（すべて）</option>
          {(Object.keys(ITEM_CATEGORY_LABELS) as ItemCategory[]).map((k) => (
            <option key={k} value={k}>
              {ITEM_CATEGORY_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 shadow-sm ring-1 ring-zinc-900/10 focus:border-aws-orange focus:outline-none focus:ring-2 focus:ring-aws-orange/30"
          value={carryFilter}
          onChange={(e) => setCarryFilter(e.target.value as CarryMethod | "all")}
        >
          <option value="all">持込み方法（すべて）</option>
          {(Object.keys(CARRY_METHOD_LABELS) as CarryMethod[]).map((k) => (
            <option key={k} value={k}>
              {CARRY_METHOD_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 shadow-sm ring-1 ring-zinc-900/10 focus:border-aws-orange focus:outline-none focus:ring-2 focus:ring-aws-orange/30"
          value={shipFilter}
          onChange={(e) => setShipFilter(e.target.value as "all" | ShippingStatus)}
          title="「発送前」は当日持参の品も含みます"
          aria-label="発送状態で絞り込み"
        >
          <option value="all">発送（すべて）</option>
          <option value="before_ship">発送前</option>
          <option value="shipped">発送済み</option>
        </select>
        <input
          className="h-10 min-w-[12rem] flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 shadow-sm ring-1 ring-zinc-900/10 placeholder:text-zinc-400 focus:border-aws-orange focus:outline-none focus:ring-2 focus:ring-aws-orange/30"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="キーワード検索"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-semibold text-zinc-900">
          登録件数 {filtered.length}件
        </span>
        {summaryByCategory
          .filter((item) => item.count > 0)
          .map((item) => (
            <span
              key={item.key}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700"
            >
              {item.label} {item.count}件
            </span>
          ))}
      </div>

      <ul className="space-y-3 sm:hidden">
        {filtered.map((row) => (
          <li
            key={row._id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-900">{row.display_name}</span>
              <span className="text-zinc-600">
                コンパス: {row.convex_account_name?.trim() ? row.convex_account_name : "—"}
              </span>
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                {ITEM_CATEGORY_LABELS[row.item_category]}
              </span>
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-aws-tint px-2 py-0.5 font-medium text-aws-ink">
                {CARRY_METHOD_LABELS[row.carry_method]}
              </span>
              {row.carry_method === "ship_in_advance" ? (
                <span
                  className={`inline-flex shrink-0 items-center whitespace-nowrap px-2 py-0.5 text-xs font-semibold ${shippingStatusPillClass(row.shipping_status)}`}
                >
                  {SHIPPING_STATUS_LABELS[row.shipping_status ?? "before_ship"]}
                </span>
              ) : null}
            </div>
            <p className="mt-2 font-medium text-zinc-900">{row.item_name}</p>
            <p className="text-sm text-zinc-800">量: {row.quantity}</p>
            {row.memo ? <p className="mt-1 text-sm text-zinc-700">備考: {row.memo}</p> : null}
            <p className="mt-2 text-xs font-medium text-zinc-600">
              更新: {formatCompactDateTime(row.updated_at)}
            </p>
            {row.canEdit ? (
              <div className="mt-3 flex gap-3">
                <Link
                  href={`/items/${row._id}/edit`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800"
                >
                  編集
                </Link>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700"
                  onClick={() => void onCancel(row._id)}
                >
                  削除
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="hidden w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm sm:block">
        <table className="w-full min-w-[1080px] table-auto text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-700">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">名前</th>
              <th className="whitespace-nowrap px-4 py-3">コンパスアカウント名</th>
              <th className="whitespace-nowrap px-4 py-3">区分</th>
              <th className="whitespace-nowrap px-4 py-3">品名</th>
              <th className="whitespace-nowrap px-4 py-3">量</th>
              <th className="whitespace-nowrap px-4 py-3">持込み方法</th>
              <th className="whitespace-nowrap px-4 py-3">発送</th>
              <th className="whitespace-nowrap px-4 py-3">備考</th>
              <th className="whitespace-nowrap px-4 py-3">更新</th>
              <th className="whitespace-nowrap px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((row) => (
              <tr key={row._id} className="hover:bg-zinc-50/80">
                <td className="min-w-[6rem] whitespace-normal px-4 py-3 font-medium text-zinc-900">
                  {row.display_name}
                </td>
                <td className="min-w-[11rem] max-w-[16rem] truncate px-4 py-3 text-zinc-800">
                  {row.convex_account_name?.trim() ? row.convex_account_name : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {ITEM_CATEGORY_LABELS[row.item_category]}
                  </span>
                </td>
                <td className="max-w-xs whitespace-normal break-words px-4 py-3 text-zinc-900">
                  {row.item_name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-800">{row.quantity}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-aws-tint px-2 py-0.5 text-xs font-medium text-aws-ink">
                    {CARRY_METHOD_LABELS[row.carry_method]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                  {row.carry_method === "ship_in_advance" ? (
                    <span
                      className={`inline-flex shrink-0 items-center whitespace-nowrap px-2 py-0.5 text-xs font-semibold ${shippingStatusPillClass(row.shipping_status)}`}
                    >
                      {SHIPPING_STATUS_LABELS[row.shipping_status ?? "before_ship"]}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="max-w-[10rem] truncate px-4 py-3 text-zinc-700">
                  {row.memo ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                  {formatCompactDateTime(row.updated_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {row.canEdit ? (
                    <div className="flex gap-3">
                      <Link
                        href={`/items/${row._id}/edit`}
                        className="text-aws-link hover:text-aws-link-hover hover:underline"
                      >
                        編集
                      </Link>
                      <button
                        type="button"
                        className="text-red-700 hover:underline"
                        onClick={() => void onCancel(row._id)}
                      >
                        削除
                      </button>
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm font-medium text-zinc-700">
          表示する持ち込みがありません。「持込品を追加」から登録してください。
        </p>
      ) : null}
    </div>
  );
}

function formatCompactDateTime(ms: number) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

/** 発送前はオレンジ（目立たせる）、発送済みは緑 */
function shippingStatusPillClass(status: ShippingStatus | undefined): string {
  const s = status ?? "before_ship";
  if (s === "shipped") {
    return "rounded-full border border-emerald-600/40 bg-emerald-100 text-emerald-950";
  }
  return "rounded-full border border-[#d45a00]/55 bg-aws-orange text-aws-ink shadow-sm ring-1 ring-black/[0.06]";
}
