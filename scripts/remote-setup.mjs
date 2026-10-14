import { access } from "node:fs/promises";
import { createRemoteBindings } from "./lib/remote-client.mjs";
import { applyMigrations, importTransfer, verifyTransfer } from "./lib/data-transfer.mjs";

const args = process.argv.slice(2);
const from = args.indexOf("--from");
if (from !== -1 && !args[from + 1]) throw new Error("--from requires a transfer directory.");
const env = createRemoteBindings({ url: process.env.LITTLE_READERS_BACKEND_URL, token: process.env.LITTLE_READERS_BACKEND_TOKEN });
if (args.includes("--migrate-only")) {
  await applyMigrations(env.DB);
  console.log("Remote schema is current. Existing content and media were retained.");
} else {
  const directory = from !== -1 ? args[from + 1] : ".data/current-sites-transfer";
  if (!await access(directory + "/snapshot.json").then(() => true, () => false)) throw new Error("Missing transfer snapshot. Run npm run data:export or provide --from. No demo data will be substituted.");
  if (args.includes("--verify")) await verifyTransfer(env, directory);
  else {
    await applyMigrations(env.DB);
    await importTransfer(env, directory);
  }
}
