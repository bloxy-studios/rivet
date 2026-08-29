/**
 * Version of the Rivet telemetry event schema. Every ingested payload carries
 * the schema version it was produced against, so the platform can accept old
 * SDKs and migrate forward without breaking users. Bump only with a
 * documented migration path (see docs/adr/0004-telemetry-protocol.md).
 */
export const RIVET_SCHEMA_VERSION = 1 as const;
