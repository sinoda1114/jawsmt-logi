import type { CarryMethod, ItemCategory, ShippingStatus } from "./validators";

const LIMITS = {
  display_name: 50,
  convex_account_name: 80,
  item_name: 100,
  quantity: 50,
  memo: 500,
} as const;

export function assertBringItemFields(input: {
  display_name: string;
  convex_account_name: string;
  item_category: ItemCategory;
  item_name: string;
  quantity: string;
  carry_method: CarryMethod;
  shipping_status?: ShippingStatus;
  memo?: string;
}) {
  const dn = input.display_name.trim();
  const convexAccount = input.convex_account_name.trim();
  const itemName = input.item_name.trim();
  const qty = input.quantity.trim();
  if (!dn) throw new Error("名前は必須です");
  if (!convexAccount) throw new Error("コンパスアカウント名は必須です");
  if (!itemName) throw new Error("品名は必須です");
  if (!qty) throw new Error("量は必須です");
  if (dn.length > LIMITS.display_name) {
    throw new Error(`名前は${LIMITS.display_name}文字以内にしてください`);
  }
  if (convexAccount.length > LIMITS.convex_account_name) {
    throw new Error(
      `コンパスアカウント名は${LIMITS.convex_account_name}文字以内にしてください`,
    );
  }
  if (itemName.length > LIMITS.item_name) {
    throw new Error(`品名は${LIMITS.item_name}文字以内にしてください`);
  }
  if (qty.length > LIMITS.quantity) {
    throw new Error(`量は${LIMITS.quantity}文字以内にしてください`);
  }
  const memo = input.memo?.trim() ?? "";
  if (memo.length > LIMITS.memo) {
    throw new Error(`備考は${LIMITS.memo}文字以内にしてください`);
  }
  if (input.carry_method === "bring_on_day" && input.shipping_status !== undefined) {
    throw new Error("当日持参では発送状態は指定できません");
  }
}
