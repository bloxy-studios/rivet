import { createDatabase, requireDatabaseUrl } from "../client";
import { seed } from "../seed";

const url = requireDatabaseUrl(process.env);
const { db, close } = createDatabase(url, { max: 1 });
try {
  console.log("Seeding demo organization (idempotent)…");
  await seed(db);
  console.log("Seed complete: org 'demo' with demo-app project, environments, services, DSN.");
} finally {
  await close();
}
