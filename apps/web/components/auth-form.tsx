"use client";

import { Button, Card, CardBody, Field, Input } from "@rivet/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { signIn, signUp } from "../lib/auth-client";

/** Shared login/signup form against the real identity engine (ADR-0007). */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const result =
      mode === "signup"
        ? await signUp.email({ email, password, name: String(form.get("name") ?? "") })
        : await signIn.email({ email, password });

    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Something went wrong.");
      return;
    }
    router.push("/orgs");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold tracking-tight">Rivet</h1>
        <p className="text-xs text-text-muted">Open-source autonomous reliability engineer</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardBody>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {mode === "signup" ? (
              <Field label="Name" htmlFor="name">
                <Input id="name" name="name" required autoComplete="name" />
              </Field>
            ) : null}
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              {...(mode === "signup" && { hint: "At least 8 characters." })}
            >
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </Field>
            {error ? (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        </CardBody>
      </Card>
      <p className="text-xs text-text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Rivet?{" "}
            <Link href="/signup" className="text-accent hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
