import { v } from "convex/values";

export const itemCategoryValidator = v.union(
  v.literal("food"),
  v.literal("drink"),
  v.literal("seasoning"),
  v.literal("equipment"),
  v.literal("other"),
);

export const carryMethodValidator = v.union(
  v.literal("bring_on_day"),
  v.literal("ship_in_advance"),
);

/** 事前送付のときのみ使用（当日持参では未設定） */
export const shippingStatusValidator = v.union(
  v.literal("before_ship"),
  v.literal("shipped"),
);

export type ItemCategory =
  | "food"
  | "drink"
  | "seasoning"
  | "equipment"
  | "other";

export type CarryMethod = "bring_on_day" | "ship_in_advance";

export type ShippingStatus = "before_ship" | "shipped";

export const eventStatusValidator = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("closed"),
);

export const memberRoleValidator = v.union(v.literal("member"), v.literal("admin"));

export const itemStatusValidator = v.union(v.literal("active"), v.literal("cancelled"));

export const appUserRoleValidator = v.union(v.literal("user"), v.literal("admin"));
