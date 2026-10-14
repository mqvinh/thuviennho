import { spawn } from "node:child_process";
import path from "node:path";

// Also select the Vercel build settings when system environment exposure is off.
const child = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "build", ...process.argv.slice(2)], {
  stdio: "inherit", env: { ...process.env, VERCEL: "1" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", error => { console.error(error.message); process.exit(1); });
child.on("exit", code => process.exit(code ?? 1));
