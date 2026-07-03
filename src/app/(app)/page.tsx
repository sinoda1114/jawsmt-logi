"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useState } from "react";
import {
  Button,
  buttonVariants,
  ListBox,
  SearchField,
  Select,
  Tooltip,
} from "@heroui/react";
import { api } from "@/lib/convex";
import {
  CARRY_METHOD_LABELS,
  ITEM_CATEGORY_LABELS,
  SHIPPING_STATUS_LABELS,
  type CarryMethod,
  type ItemCategory,
  type ShippingStatus,
} from "@/lib/labels";

type TableColumnKey =
  | "displayName"
  | "accountName"
  | "category"
  | "itemName"
  | "quantity"
  | "carryMethod"
  | "shippingStatus"
  | "memo"
  | "updatedAt"
  | "actions";

type TableColumn = {
  key: TableColumnKey;
  label: string;
  width: number;
  min: number;
  max: number;
  resizable?: boolean;
};

const TABLE_COLUMNS: TableColumn[] = [
  { key: "displayName", label: "名前", width: 124, min: 96, max: 220, resizable: true },
  { key: "accountName", label: "コンパスアカウント名", width: 164, min: 128, max: 260, resizable: true },
  { key: "category", label: "区分", width: 86, min: 72, max: 132 },
  { key: "itemName", label: "品名", width: 240, min: 160, max: 420, resizable: true },
  { key: "quantity", label: "量", width: 170, min: 100, max: 280, resizable: true },
  { key: "carryMethod", label: "持込み方法", width: 116, min: 104, max: 168 },
  { key: "shippingStatus", label: "発送", width: 104, min: 88, max: 140 },
  { key: "memo", label: "備考", width: 230, min: 140, max: 420, resizable: true },
  { key: "updatedAt", label: "更新", width: 106, min: 92, max: 140 },
  { key: "actions", label: "操作", width: 148, min: 132, max: 180 },
];

const TABLE_COLUMN_DEFAULT_WIDTHS = Object.fromEntries(
  TABLE_COLUMNS.map((column) => [column.key, column.width]),
) as Record<TableColumnKey, number>;

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
  const [columnWidths, setColumnWidths] = useState(TABLE_COLUMN_DEFAULT_WIDTHS);

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

  function onColumnResizeStart(
    column: TableColumn,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (!column.resizable) return;

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = columnWidths[column.key];

    function onPointerMove(moveEvent: PointerEvent) {
      const nextWidth = Math.min(
        column.max,
        Math.max(column.min, startWidth + moveEvent.clientX - startX),
      );
      setColumnWidths((current) => ({
        ...current,
        [column.key]: nextWidth,
      }));
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  const tableWidth = TABLE_COLUMNS.reduce(
    (total, column) => total + columnWidths[column.key],
    0,
  );

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
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            持込品を追加
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm shadow-sm ring-1 ring-zinc-950/5">
        <span className="mb-1 self-center shrink-0 text-xs font-medium tracking-wide text-zinc-500">
          絞り込み
        </span>
        <Select
          aria-label="区分で絞り込み"
          selectedKey={catFilter}
          onSelectionChange={(key) =>
            setCatFilter(key as ItemCategory | "all")
          }
          className="min-w-[12rem]"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all">区分（すべて）</ListBox.Item>
              {(Object.keys(ITEM_CATEGORY_LABELS) as ItemCategory[]).map(
                (k) => (
                  <ListBox.Item key={k} id={k}>
                    {ITEM_CATEGORY_LABELS[k]}
                  </ListBox.Item>
                ),
              )}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select
          aria-label="持込み方法で絞り込み"
          selectedKey={carryFilter}
          onSelectionChange={(key) =>
            setCarryFilter(key as CarryMethod | "all")
          }
          className="min-w-[12rem]"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all">持込み方法（すべて）</ListBox.Item>
              {(Object.keys(CARRY_METHOD_LABELS) as CarryMethod[]).map((k) => (
                <ListBox.Item key={k} id={k}>
                  {CARRY_METHOD_LABELS[k]}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select
          aria-label="発送状態で絞り込み（「発送前」は当日持参の品も含みます）"
          selectedKey={shipFilter}
          onSelectionChange={(key) =>
            setShipFilter(key as "all" | ShippingStatus)
          }
          className="min-w-[10rem]"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all">発送（すべて）</ListBox.Item>
              <ListBox.Item id="before_ship">発送前</ListBox.Item>
              <ListBox.Item id="shipped">発送済み</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <SearchField
          aria-label="キーワード検索"
          value={keyword}
          onChange={setKeyword}
          className="min-w-[12rem] flex-1"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="キーワード検索" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
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
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  編集
                </Link>
                <Button
                  variant="danger-soft"
                  size="sm"
                  onPress={() => void onCancel(row._id)}
                >
                  削除
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="hidden w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm sm:block">
        <table
          className="w-full table-fixed text-left text-sm"
          style={{ minWidth: tableWidth } satisfies CSSProperties}
        >
          <colgroup>
            {TABLE_COLUMNS.map((column) => (
              <col key={column.key} style={{ width: columnWidths[column.key] }} />
            ))}
          </colgroup>
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-700">
            <tr>
              {TABLE_COLUMNS.map((column) => (
                <ResizableHeader
                  key={column.key}
                  column={column}
                  onResizeStart={onColumnResizeStart}
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((row) => (
              <tr key={row._id} className="hover:bg-zinc-50/80">
                <td className="overflow-hidden px-4 py-3 font-medium text-zinc-900">
                  <OverflowTooltip text={row.display_name} className="line-clamp-2 whitespace-normal" />
                </td>
                <td className="overflow-hidden px-4 py-3 text-zinc-800">
                  <OverflowTooltip text={row.convex_account_name?.trim() ? row.convex_account_name : "—"} />
                </td>
                <td className="overflow-hidden px-4 py-3">
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {ITEM_CATEGORY_LABELS[row.item_category]}
                  </span>
                </td>
                <td className="overflow-hidden px-4 py-3 text-zinc-900">
                  <OverflowTooltip text={row.item_name} className="line-clamp-2 whitespace-normal break-words" />
                </td>
                <td className="overflow-hidden px-4 py-3 text-zinc-800">
                  <OverflowTooltip text={row.quantity} />
                </td>
                <td className="overflow-hidden px-4 py-3">
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-aws-tint px-2 py-0.5 text-xs font-medium text-aws-ink">
                    {CARRY_METHOD_LABELS[row.carry_method]}
                  </span>
                </td>
                <td className="overflow-hidden px-4 py-3 text-zinc-700">
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
                <td className="overflow-hidden px-4 py-3 text-zinc-700">
                  <OverflowTooltip text={row.memo ?? "—"} />
                </td>
                <td className="overflow-hidden px-4 py-3 text-zinc-700">
                  <OverflowTooltip text={formatCompactDateTime(row.updated_at)} />
                </td>
                <td className="overflow-hidden px-3 py-3">
                  {row.canEdit ? (
                    <div className="flex flex-nowrap items-center justify-end gap-1">
                      <Link
                        href={`/items/${row._id}/edit`}
                        className={`${buttonVariants({ variant: "ghost", size: "sm" })} shrink-0`}
                      >
                        編集
                      </Link>
                      <Button
                        variant="danger-soft"
                        size="sm"
                        className="shrink-0"
                        onPress={() => void onCancel(row._id)}
                      >
                        削除
                      </Button>
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

function ResizableHeader(props: {
  column: TableColumn;
  onResizeStart: (column: TableColumn, event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const { column, onResizeStart } = props;

  return (
    <th className="relative overflow-hidden whitespace-nowrap px-4 py-3">
      <span className="block truncate pr-2">{column.label}</span>
      {column.resizable ? (
        <button
          type="button"
          aria-label={`${column.label}列の幅を変更`}
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none border-r border-transparent transition hover:border-aws-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-aws-orange"
          onPointerDown={(event) => onResizeStart(column, event)}
        />
      ) : null}
    </th>
  );
}

function OverflowTooltip(props: { text: string; className?: string }) {
  const { text, className = "truncate whitespace-nowrap" } = props;
  const isEmpty = text === "—";

  if (isEmpty) {
    return <span className="block truncate whitespace-nowrap text-zinc-400">—</span>;
  }

  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger className="block min-w-0">
        <span tabIndex={0} className={`block min-w-0 ${className}`}>
          {text}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content
        showArrow
        className="max-w-[min(28rem,calc(100vw-2rem))] whitespace-pre-wrap break-words text-sm leading-relaxed"
      >
        {text}
      </Tooltip.Content>
    </Tooltip>
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
