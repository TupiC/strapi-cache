import { loggy } from "./log";

export type PurgeEvent = {
  /** What was purged: the whole cache, a key, a REST API path or the GraphQL cache */
  scope: "all" | "key" | "rest" | "graphql";
  /** Where the purge came from: the admin buttons or automatic invalidation on content changes */
  source: "admin" | "auto";
  /** Key (admin), REST API path (rest) or content type UID (graphql); unset for scope "all" */
  key?: string;
};

export type OnPurge = (event: PurgeEvent) => void | Promise<void>;

/** Runs the user-defined `onPurge` hook; a failing hook never breaks the purge itself. */
export async function runOnPurge(strapi: any, event: PurgeEvent) {
  const onPurge = strapi.plugin("strapi-cache").config("onPurge") as OnPurge | undefined;

  if (typeof onPurge !== "function") {
    return;
  }

  try {
    await onPurge(event);
  } catch (error) {
    loggy.error("onPurge hook error:");
    loggy.error(error as any);
  }
}
