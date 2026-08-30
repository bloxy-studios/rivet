import { requireDatabaseUrl } from "../client";
import { runMigrations } from "../migrate";

const url = requireDatabaseUrl(process.env);
console.log("Applying migrations…");
await runMigrations(url);
console.log("Migrations up to date.");
