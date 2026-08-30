"use client";

import { Button, Card, CardBody, EmptyState, Field, Input, Spinner } from "@rivet/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, createProject, getProjects, type Project } from "../../../../lib/api";

export default function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getProjects(orgId).then(setProjects, (err: unknown) => {
      setProjects([]);
      setError(err instanceof ApiError ? err.message : "Could not load projects.");
    });
  }, [orgId]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    try {
      const project = await createProject(orgId, name);
      router.push(`/orgs/${orgId}/projects/${project.id}`);
    } catch (err) {
      // 403 here is honest UX: creation needs ADMIN — the API decides.
      setError(err instanceof ApiError ? err.message : "Could not create the project.");
      setPending(false);
    }
  }

  if (projects === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Projects</h1>
        <p className="text-xs text-text-muted">
          A project is one monitored application: its environments, services, and credentials.
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project, then issue a DSN to connect an application."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/orgs/${orgId}/projects/${project.id}`}>
              <Card className="transition-colors hover:border-accent/50">
                <CardBody className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text">{project.name}</p>
                  <p className="font-mono text-xs text-text-muted">{project.slug}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          <form onSubmit={onCreate} className="flex items-end gap-3">
            <Field
              label="New project (requires the ADMIN role)"
              htmlFor="project-name"
              className="flex-1"
            >
              <Input
                id="project-name"
                name="name"
                placeholder="Checkout"
                required
                maxLength={200}
              />
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
