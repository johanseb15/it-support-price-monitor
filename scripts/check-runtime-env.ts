import { loadEnvConfig } from "@next/env";

import { validateRuntimeEnv } from "../lib/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const result = validateRuntimeEnv();

if (!result.ok) {
  console.error("[env] Runtime environment validation failed:");

  for (const error of result.errors) {
    console.error(`[env] - ${error}`);
  }

  console.error("[env] Configure the required GitHub Secrets and deployment variables.");
  process.exit(1);
}

console.log("[env] Runtime environment validation passed.");
