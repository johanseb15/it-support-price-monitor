import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

run("npx prisma generate");

if (process.env.RUN_DB_SETUP === "true") {
  run("npx prisma migrate deploy");
  run("npx prisma db seed");
}
