"use client";

import {
  Button,
  Card,
  CardBody,
  Chip,
  CopyButton,
  Dialog,
  EmptyState,
  Field,
  Input,
  Spinner,
} from "@rivet/ui";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  type ApiKey,
  createApiKey,
  getApiKeys,
  revokeApiKey,
} from "../../../../../lib/api";

export default function ApiKeysPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    getApiKeys(orgId).then(
      (rows) => {
        setKeys(rows);
        setForbidden(null);
      },
      (err: unknown) => {
        setKeys([]);
        if (err instanceof ApiError && err.status === 403) setForbidden(err.message);
        else setError(err instanceof ApiError ? err.message : "Could not load API keys.");
      },
    );
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    try {
      const { key } = await createApiKey(orgId, name);
      setIssuedKey(key);
      setCreating(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the key.");
    } finally {
      setPending(false);
    }
  }

  if (forbidden) {
    return (
      <EmptyState title="API keys are managed by organization admins" description={forbidden} />
    );
  }
  if (keys === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">API keys</h1>
          <p className="text-xs text-text-muted">
            Management-API credentials. Only the SHA-256 hash is stored — a key is shown once.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Create key</Button>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}

      {keys.length === 0 ? (
        <EmptyState
          title="No API keys yet"
          description="Keys authenticate CLI and server-to-server access in upcoming rungs."
        />
      ) : (
        <Card>
          <CardBody className="flex flex-col divide-y divide-border p-0">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm text-text">{key.name}</p>
                  <p className="font-mono text-xs text-text-muted">{key.keyPrefix}…</p>
                </div>
                <div className="flex items-center gap-2">
                  {key.revokedAt ? (
                    <Chip tone="danger">revoked</Chip>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        setError(null);
                        try {
                          await revokeApiKey(orgId, key.id);
                          load();
                        } catch (err) {
                          setError(
                            err instanceof ApiError
                              ? `Could not revoke "${key.name}": ${err.message}`
                              : "Could not revoke the key.",
                          );
                        }
                      }}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Dialog open={creating} onClose={() => setCreating(false)} title="Create API key">
        <form onSubmit={onCreate} className="flex flex-col gap-4 p-4">
          <Field label="Key name" htmlFor="key-name" hint="For identification, e.g. “ci”.">
            <Input id="key-name" name="name" required maxLength={200} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={issuedKey !== null} onClose={() => setIssuedKey(null)} title="Key created">
        <div className="flex flex-col gap-3 p-4">
          <p className="text-xs text-text-muted">
            Copy this key now — it is shown exactly once and cannot be retrieved again.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
            <code className="break-all font-mono text-xs text-text">{issuedKey}</code>
            {issuedKey ? <CopyButton value={issuedKey} /> : null}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIssuedKey(null)}>Done</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
