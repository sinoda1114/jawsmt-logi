"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/lib/convex";

/** ログイン後に event_members を確保する（冪等）。認証が付く前に mutation を投げない。 */
export function AppBootstrap() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensure = useMutation(api.bootstrap.ensureEventMembership);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || isLoading || !isAuthenticated) return;
    ran.current = true;
    void ensure({}).catch((e) => {
      console.error("[AppBootstrap] ensureEventMembership:", e);
      ran.current = false;
    });
  }, [ensure, isAuthenticated, isLoading]);
  return null;
}
