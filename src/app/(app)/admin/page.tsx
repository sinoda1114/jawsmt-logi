"use client";

import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  CARRY_METHOD_LABELS,
  formatDateTime,
  ITEM_CATEGORY_LABELS,
  SHIPPING_STATUS_LABELS,
  type CarryMethod,
  type ItemCategory,
  type ShippingStatus,
} from "@/lib/labels";
import { api } from "@/lib/convex";

const EVENT_STATUS_LABELS: Record<Doc<"events">["status"], string> = {
  draft: "下書き",
  open: "公開",
  closed: "終了",
};

const MEMBER_ROLE_LABELS: Record<Doc<"event_members">["member_role"], string> = {
  member: "メンバー",
  admin: "管理者",
};

const ITEM_CATEGORIES: ItemCategory[] = [
  "food",
  "drink",
  "seasoning",
  "equipment",
  "other",
];
const CARRY_METHODS: CarryMethod[] = ["bring_on_day", "ship_in_advance"];
const SHIPPING: ShippingStatus[] = ["before_ship", "shipped"];

export default function AdminPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");

  const canQueryAdmin =
    isAuthenticated && viewer !== undefined && viewer !== null && viewer.isAdmin;

  const events = useQuery(api.admin.listEvents, canQueryAdmin ? {} : "skip");
  const users = useQuery(api.admin.listUsers, canQueryAdmin ? {} : "skip");

  const [eventPick, setEventPick] = useState<Id<"events"> | null>(null);

  const resolvedEventId = useMemo(() => {
    if (!events || events.length === 0) return null;
    if (eventPick !== null && events.some((e) => e._id === eventPick)) {
      return eventPick;
    }
    return events[0]._id;
  }, [events, eventPick]);

  const members = useQuery(
    api.admin.listEventMembers,
    canQueryAdmin && resolvedEventId ? { event_id: resolvedEventId } : "skip",
  );
  const items = useQuery(
    api.admin.listBringItemsForEvent,
    canQueryAdmin && resolvedEventId ? { event_id: resolvedEventId } : "skip",
  );

  const selectedEvent = useMemo(
    () => events?.find((e) => e._id === resolvedEventId) ?? null,
    [events, resolvedEventId],
  );

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex justify-center py-20 text-sm font-medium text-zinc-800">
        読み込み中…
      </div>
    );
  }

  if (viewer === undefined) {
    return (
      <div className="flex justify-center py-20 text-sm font-medium text-zinc-800">
        読み込み中…
      </div>
    );
  }

  if (viewer === null) {
    return null;
  }

  if (!viewer.isAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <p className="font-semibold">管理者権限がありません</p>
        <p className="mt-2 leading-relaxed">
          このページは管理者のみが利用できます。トップへ戻ってください。
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          トップへ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aws-ink">管理画面</h1>
          <p className="mt-1 text-sm text-zinc-600">
            イベント・参加者・持ち込み品・ユーザーを編集できます。
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          ログイン URL:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">/login</code>
          （本番はサイトのドメイン +{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">/login</code>）
        </p>
      </div>

      {events === undefined || users === undefined ? (
        <p className="text-sm text-zinc-600">読み込み中…</p>
      ) : (
        <>
          <EventSection
            events={events}
            selectedId={resolvedEventId}
            onSelectEvent={setEventPick}
            selected={selectedEvent}
          />
          {resolvedEventId ? (
            <>
              <MembersSection members={members ?? []} />
              <BringItemsSection items={items ?? []} />
            </>
          ) : (
            <p className="text-sm text-zinc-600">イベントがありません。シードを実行してください。</p>
          )}
          <UsersSection users={users} />
        </>
      )}
    </div>
  );
}

function EventEditor(props: { event: Doc<"events"> }) {
  const updateEvent = useMutation(api.admin.updateEvent);
  const [slug, setSlug] = useState(props.event.slug);
  const [name, setName] = useState(props.event.name);
  const [description, setDescription] = useState(props.event.description ?? "");
  const [eventDate, setEventDate] = useState(props.event.event_date ?? "");
  const [location, setLocation] = useState(props.event.location ?? "");
  const [status, setStatus] = useState<Doc<"events">["status"]>(props.event.status);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      await updateEvent({
        id: props.event._id,
        slug: slug.trim(),
        name: name.trim(),
        description,
        event_date: eventDate,
        location,
        status,
      });
      setMsg("保存しました");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(ev) => void onSave(ev)} className="mt-6 max-w-xl space-y-4">
      {msg ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg === "保存しました"
              ? "bg-emerald-50 text-emerald-900"
              : "bg-red-50 text-red-800"
          }`}
        >
          {msg}
        </p>
      ) : null}
      <label className="block text-sm font-semibold text-zinc-900">
        slug
        <input
          required
          className="mt-1 w-full rounded-lg border border-zinc-400 px-3 py-2 text-sm"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold text-zinc-900">
        名称
        <input
          required
          className="mt-1 w-full rounded-lg border border-zinc-400 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold text-zinc-900">
        説明
        <textarea
          rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-400 px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold text-zinc-900">
        日付（任意）
        <input
          className="mt-1 w-full rounded-lg border border-zinc-400 px-3 py-2 text-sm"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold text-zinc-900">
        場所（任意）
        <input
          className="mt-1 w-full rounded-lg border border-zinc-400 px-3 py-2 text-sm"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold text-zinc-900">
        ステータス
        <select
          className="mt-1 w-full rounded-lg border border-zinc-400 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as Doc<"events">["status"])}
        >
          {(Object.keys(EVENT_STATUS_LABELS) as Doc<"events">["status"][]).map((k) => (
            <option key={k} value={k}>
              {EVENT_STATUS_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {saving ? "保存中…" : "イベントを保存"}
      </button>
    </form>
  );
}

function EventSection(props: {
  events: Doc<"events">[];
  selectedId: Id<"events"> | null;
  onSelectEvent: (id: Id<"events">) => void;
  selected: Doc<"events"> | null;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-aws-ink">イベント</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-800">
          対象イベント
          <select
            className="ml-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            value={props.selectedId ?? ""}
            onChange={(e) => props.onSelectEvent(e.target.value as Id<"events">)}
          >
            {props.events.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.name} ({ev.slug})
              </option>
            ))}
          </select>
        </label>
      </div>

      {props.selected ? (
        <EventEditor key={props.selected._id} event={props.selected} />
      ) : null}
    </section>
  );
}

function MembersSection(props: { members: Doc<"event_members">[] }) {
  const updateMember = useMutation(api.admin.updateEventMember);
  const deleteMember = useMutation(api.admin.deleteEventMember);
  const [editingId, setEditingId] = useState<Id<"event_members"> | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [memberRole, setMemberRole] = useState<Doc<"event_members">["member_role"]>("member");
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const editing = props.members.find((m) => m._id === editingId) ?? null;

  function beginEditMember(m: Doc<"event_members">) {
    setEditingId(m._id);
    setDisplayName(m.display_name);
    setParticipantCount(m.participant_count);
    setMemberRole(m.member_role);
    setMemo(m.memo ?? "");
  }

  async function saveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setErr(null);
    try {
      await updateMember({
        id: editingId,
        display_name: displayName,
        participant_count: participantCount,
        member_role: memberRole,
        memo,
      });
      setEditingId(null);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "保存に失敗しました");
    }
  }

  async function removeMember(id: Id<"event_members">) {
    if (!confirm("このメンバー行を削除しますか？（持ち込み品に紐づいている場合は削除できません）")) {
      return;
    }
    setErr(null);
    try {
      await deleteMember({ id });
      if (editingId === id) setEditingId(null);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "削除に失敗しました");
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-aws-ink">イベント参加者</h2>
      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="py-2 pr-4 font-medium">表示名</th>
              <th className="py-2 pr-4 font-medium">人数</th>
              <th className="py-2 pr-4 font-medium">役割</th>
              <th className="py-2 pr-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {props.members.map((m) => (
              <tr key={m._id} className="border-b border-zinc-100">
                <td className="py-2 pr-4">{m.display_name}</td>
                <td className="py-2 pr-4">{m.participant_count}</td>
                <td className="py-2 pr-4">{MEMBER_ROLE_LABELS[m.member_role]}</td>
                <td className="py-2 pr-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                    onClick={() => beginEditMember(m)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-800 hover:bg-red-50"
                    onClick={() => void removeMember(m._id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && editing ? (
        <form
          onSubmit={(e) => void saveMember(e)}
          className="mt-6 max-w-md space-y-3 rounded-xl border border-zinc-200 p-4"
        >
          <p className="text-sm font-semibold text-zinc-800">メンバー編集</p>
          <label className="block text-sm">
            表示名
            <input
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            参加人数
            <input
              type="number"
              min={1}
              max={999}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={participantCount}
              onChange={(e) => setParticipantCount(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            役割
            <select
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={memberRole}
              onChange={(e) =>
                setMemberRole(e.target.value as Doc<"event_members">["member_role"])
              }
            >
              <option value="member">メンバー</option>
              <option value="admin">管理者</option>
            </select>
          </label>
          <label className="block text-sm">
            メモ
            <input
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white"
            >
              保存
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => setEditingId(null)}
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function BringItemsSection(props: { items: Doc<"bring_items">[] }) {
  const updateBringItem = useMutation(api.admin.updateBringItem);
  const setBringItemStatus = useMutation(api.admin.setBringItemStatus);
  const [editId, setEditId] = useState<Id<"bring_items"> | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [convexAccountName, setConvexAccountName] = useState("");
  const [itemCategory, setItemCategory] = useState<ItemCategory>("food");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [carryMethod, setCarryMethod] = useState<CarryMethod>("bring_on_day");
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>("before_ship");
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const editing = props.items.find((it) => it._id === editId) ?? null;

  function beginEditItem(it: Doc<"bring_items">) {
    setEditId(it._id);
    setDisplayName(it.display_name);
    setConvexAccountName(it.convex_account_name ?? "");
    setItemCategory(it.item_category);
    setItemName(it.item_name);
    setQuantity(it.quantity);
    setCarryMethod(it.carry_method);
    setShippingStatus(
      it.carry_method === "ship_in_advance"
        ? (it.shipping_status ?? "before_ship")
        : "before_ship",
    );
    setMemo(it.memo ?? "");
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setErr(null);
    try {
      await updateBringItem({
        id: editId,
        display_name: displayName,
        convex_account_name: convexAccountName,
        item_category: itemCategory,
        item_name: itemName,
        quantity,
        carry_method: carryMethod,
        shipping_status: carryMethod === "ship_in_advance" ? shippingStatus : undefined,
        memo,
      });
      setEditId(null);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "保存に失敗しました");
    }
  }

  async function toggleStatus(it: Doc<"bring_items">) {
    setErr(null);
    try {
      await setBringItemStatus({
        id: it._id,
        status: it.status === "active" ? "cancelled" : "active",
      });
    } catch (er) {
      setErr(er instanceof Error ? er.message : "更新に失敗しました");
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-aws-ink">持ち込み品（全ステータス）</h2>
      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="py-2 pr-3 font-medium">状態</th>
              <th className="py-2 pr-3 font-medium">表示名</th>
              <th className="py-2 pr-3 font-medium">コンパスアカウント名</th>
              <th className="py-2 pr-3 font-medium">品名</th>
              <th className="py-2 pr-3 font-medium">区分</th>
              <th className="py-2 pr-3 font-medium">更新</th>
              <th className="py-2 pr-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {props.items.map((it) => (
              <tr key={it._id} className="border-b border-zinc-100">
                <td className="py-2 pr-3">
                  <span
                    className={
                      it.status === "active"
                        ? "rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-900"
                        : "rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-700"
                    }
                  >
                    {it.status === "active" ? "有効" : "取消"}
                  </span>
                </td>
                <td className="py-2 pr-3">{it.display_name}</td>
                <td className="max-w-[10rem] truncate py-2 pr-3 text-zinc-800">
                  {it.convex_account_name?.trim() ? it.convex_account_name : "—"}
                </td>
                <td className="py-2 pr-3">{it.item_name}</td>
                <td className="py-2 pr-3">{ITEM_CATEGORY_LABELS[it.item_category]}</td>
                <td className="py-2 pr-3 whitespace-nowrap text-xs text-zinc-500">
                  {formatDateTime(it.updated_at)}
                </td>
                <td className="py-2 pr-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                    onClick={() => beginEditItem(it)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                    onClick={() => void toggleStatus(it)}
                  >
                    {it.status === "active" ? "取消" : "復帰"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editId && editing ? (
        <form
          onSubmit={(e) => void saveItem(e)}
          className="mt-6 max-w-lg space-y-3 rounded-xl border border-zinc-200 p-4"
        >
          <p className="text-sm font-semibold text-zinc-800">持ち込み品の編集</p>
          <label className="block text-sm">
            名前
            <input
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            コンパスアカウント名 <span className="text-red-600">*</span>
            <input
              required
              maxLength={80}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={convexAccountName}
              onChange={(e) => setConvexAccountName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            区分
            <select
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value as ItemCategory)}
            >
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {ITEM_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            品名
            <input
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            量
            <input
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            持参方法
            <select
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={carryMethod}
              onChange={(e) => setCarryMethod(e.target.value as CarryMethod)}
            >
              {CARRY_METHODS.map((c) => (
                <option key={c} value={c}>
                  {CARRY_METHOD_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          {carryMethod === "ship_in_advance" ? (
            <label className="block text-sm">
              発送状態
              <select
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                value={shippingStatus}
                onChange={(e) => setShippingStatus(e.target.value as ShippingStatus)}
              >
                {SHIPPING.map((s) => (
                  <option key={s} value={s}>
                    {SHIPPING_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-sm">
            備考
            <input
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white"
            >
              保存
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => setEditId(null)}
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

type UserRow = {
  _id: Id<"users">;
  name: string;
  email: string;
  role: "user" | "admin";
  is_active: boolean;
};

type UserDraft = { name?: string; role?: "user" | "admin"; active?: boolean };

function UsersSection(props: { users: UserRow[] }) {
  const updateUser = useMutation(api.admin.updateUserAppProfile);
  const [draftById, setDraftById] = useState<Record<string, UserDraft>>({});
  const [msg, setMsg] = useState<string | null>(null);

  function rowState(u: UserRow) {
    const d = draftById[u._id] ?? {};
    return {
      name: d.name ?? u.name,
      role: d.role ?? u.role,
      active: d.active ?? u.is_active,
    };
  }

  async function saveUser(id: Id<"users">) {
    const u = props.users.find((x) => x._id === id);
    if (!u) return;
    const row = rowState(u);
    setMsg(null);
    try {
      await updateUser({
        user_id: id,
        name: row.name,
        role: row.role,
        is_active: row.active,
      });
      setDraftById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setMsg("ユーザーを更新しました");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "更新に失敗しました");
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-aws-ink">ユーザー</h2>
      <p className="mt-1 text-xs text-zinc-500">
        名前・ロール・アクティブのみ変更できます（認証トークン等は扱いません）。
      </p>
      {msg ? (
        <p className="mt-2 text-sm text-zinc-800">{msg}</p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="py-2 pr-3 font-medium">メール</th>
              <th className="py-2 pr-3 font-medium">名前</th>
              <th className="py-2 pr-3 font-medium">ロール</th>
              <th className="py-2 pr-3 font-medium">有効</th>
              <th className="py-2 pr-3 font-medium">保存</th>
            </tr>
          </thead>
          <tbody>
            {props.users.map((u) => {
              const st = rowState(u);
              return (
                <tr key={u._id} className="border-b border-zinc-100">
                  <td className="py-2 pr-3 max-w-[14rem] truncate text-xs">{u.email || "—"}</td>
                  <td className="py-2 pr-3">
                    <input
                      className="w-full min-w-[8rem] rounded border px-2 py-1 text-xs"
                      value={st.name}
                      onChange={(e) =>
                        setDraftById((prev) => ({
                          ...prev,
                          [u._id]: { ...prev[u._id], name: e.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      className="rounded border px-2 py-1 text-xs"
                      value={st.role}
                      onChange={(e) =>
                        setDraftById((prev) => ({
                          ...prev,
                          [u._id]: {
                            ...prev[u._id],
                            role: e.target.value as "user" | "admin",
                          },
                        }))
                      }
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={st.active}
                      onChange={(e) =>
                        setDraftById((prev) => ({
                          ...prev,
                          [u._id]: {
                            ...prev[u._id],
                            active: e.target.checked,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      onClick={() => void saveUser(u._id)}
                    >
                      保存
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
