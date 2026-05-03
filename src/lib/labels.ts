import type { Doc } from "../../convex/_generated/dataModel";

export type ItemCategory = Doc<"bring_items">["item_category"];
export type CarryMethod = Doc<"bring_items">["carry_method"];
export type ShippingStatus = NonNullable<Doc<"bring_items">["shipping_status"]>;

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: "食べ物",
  drink: "飲み物",
  seasoning: "調味料",
  equipment: "備品",
  other: "その他",
};

export const CARRY_METHOD_LABELS: Record<CarryMethod, string> = {
  bring_on_day: "当日持参",
  ship_in_advance: "事前送付",
};

export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  before_ship: "発送前",
  shipped: "発送済み",
};

export function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
