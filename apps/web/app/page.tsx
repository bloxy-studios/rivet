"use client";

import { Spinner } from "@rivet/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "../lib/auth-client";

/** Entry: authenticated users land on their organizations; others sign in. */
export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    router.replace(session ? "/orgs" : "/login");
  }, [session, isPending, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner />
    </div>
  );
}
