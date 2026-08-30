"use client";

import {
  Button,
  Card,
  CardBody,
  Chip,
  EmptyState,
  Field,
  Input,
  roleTone,
  Spinner,
} from "@rivet/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, createOrg, getOrgs, type Org } from "../../lib/api";

export default function OrgsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getOrgs().then(setOrgs, (err: unknown) => {
      setOrgs([]);
      setError(err instanceof ApiError ? err.message : "Could not load organizations.");
    });
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    try {
      const org = await createOrg(name);
      router.push(`/orgs/${org.id}/projects`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the organization.");
      setPending(false);
    }
  }

  if (orgs === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Organizations</h1>
        <p className="text-xs text-text-muted">Everything in Rivet is scoped to an organization.</p>
      </div>

      {orgs.length === 0 ? (
        <EmptyState
          title="No organizations yet"
          description="Create your first organization to start setting up projects."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {orgs.map((org) => (
            <Link key={org.id} href={`/orgs/${org.id}/projects`}>
              <Card className="transition-colors hover:border-accent/50">
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">{org.name}</p>
                    <p className="font-mono text-xs text-text-muted">{org.slug}</p>
                  </div>
                  <Chip tone={roleTone(org.role)}>{org.role}</Chip>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          <form onSubmit={onCreate} className="flex items-end gap-3">
            <Field label="New organization" htmlFor="org-name" className="flex-1">
              <Input id="org-name" name="name" placeholder="Acme Inc." required maxLength={200} />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </form>
          {error ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {error}
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
