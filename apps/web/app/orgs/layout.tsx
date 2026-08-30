"use client";

import { Spinner } from "@rivet/ui";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { AppShell } from "../../components/app-shell";
import { useSession } from "../../lib/auth-client";

/**
 * Session guard for the authenticated shell (client-side for the skeleton;
 * server-side enforcement always lives in the API — every call re-checks).
 */
export default function OrgsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
