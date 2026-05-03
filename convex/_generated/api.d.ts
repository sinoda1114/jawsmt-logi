/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as bootstrap from "../bootstrap.js";
import type * as bringItems from "../bringItems.js";
import type * as constants from "../constants.js";
import type * as http from "../http.js";
import type * as lib_adminEmails from "../lib/adminEmails.js";
import type * as lib_bringItemValidation from "../lib/bringItemValidation.js";
import type * as lib_validators from "../lib/validators.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  bootstrap: typeof bootstrap;
  bringItems: typeof bringItems;
  constants: typeof constants;
  http: typeof http;
  "lib/adminEmails": typeof lib_adminEmails;
  "lib/bringItemValidation": typeof lib_bringItemValidation;
  "lib/validators": typeof lib_validators;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
