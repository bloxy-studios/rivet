"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Chip,
  CopyButton,
  criticalityTone,
  EmptyState,
  Spinner,
} from "@rivet/ui";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createDsn,
  type Dsn,
  type Environment,
  getDsns,
  getEnvironments,
  getProject,
  getServices,
  type Project,
  type Service,
} from "../../../../../lib/api";

export default function ProjectPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dsns, setDsns] = useState<Dsn[] | null>(null);
  const [dsnError, setDsnError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const loadDsns = useCallback(() => {
    // DSN listing needs DEVELOPER+; VIEWERs see an honest not-permitted note.
    getDsns(orgId, projectId).then(setDsns, (err: unknown) => {
      setDsns([]);
      setDsnError(err instanceof ApiError ? err.message : "Could not load DSNs.");
    });
  }, [orgId, projectId]);

  useEffect(() => {
    getProject(orgId, projectId).then(setProject, (err: unknown) => {
      setLoadError(err instanceof ApiError ? err.message : "Could not load the project.");
    });
    getEnvironments(orgId, projectId).then(setEnvironments, () => setEnvironments([]));
    getServices(orgId, projectId).then(setServices, () => setServices([]));
    loadDsns();
  }, [orgId, projectId, loadDsns]);

  if (loadError) {
    return <EmptyState title="Project unavailable" description={loadError} />;
  }
  if (!project) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  async function onIssueDsn() {
    setDsnError(null);
    setIssuing(true);
    try {
      await createDsn(orgId, projectId);
      loadDsns();
    } catch (err) {
      setDsnError(err instanceof ApiError ? err.message : "Could not issue a DSN.");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>
        <Chip mono>{project.slug}</Chip>
      </div>

      <EmptyState
        title="No issues — nothing is reporting yet"
        phase="Phase 2"
        description="Error ingestion, grouping, and the issues surface arrive with the next phase. Issue a DSN below so this project is ready to receive events."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Environments</CardTitle>
          </CardHeader>
          <CardBody>
            {environments.length === 0 ? (
              <p className="text-xs text-text-muted">
                None yet — environments are created via the API (DEVELOPER+) and automatically by
                SDKs in Phase 2.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {environments.map((environment) => (
                  <Chip key={environment.id} mono>
                    {environment.name}
                  </Chip>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardBody>
            {services.length === 0 ? (
              <p className="text-xs text-text-muted">
                None yet — services carry the business criticality that feeds the impact model.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {services.map((service) => (
                  <li key={service.id} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-text">{service.name}</span>
                    <Chip tone={criticalityTone(service.criticality)}>{service.criticality}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DSNs</CardTitle>
          <Button size="sm" onClick={onIssueDsn} disabled={issuing}>
            {issuing ? "Issuing…" : "Issue DSN"}
          </Button>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">
            A DSN is the public ingest credential an SDK is configured with. Issuing requires ADMIN;
            listing requires DEVELOPER.
          </p>
          {dsnError ? (
            <p role="alert" className="text-xs text-danger">
              {dsnError}
            </p>
          ) : null}
          {dsns === null ? (
            <Spinner />
          ) : dsns.length === 0 ? (
            <p className="text-xs text-text-muted">No DSNs issued yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dsns.map((dsn) => (
                <li
                  key={dsn.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-text">{dsn.dsn}</p>
                    <p className="text-[11px] text-text-muted">
                      {dsn.label ?? "Unlabeled"}
                      {dsn.revokedAt ? " · revoked" : ""}
                    </p>
                  </div>
                  {dsn.revokedAt ? (
                    <Chip tone="danger">revoked</Chip>
                  ) : (
                    <CopyButton value={dsn.dsn} label="Copy DSN" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
