import { access } from "node:fs/promises";
import { openLocalPlatform } from "./lib/local-platform.mjs";
import { applyMigrations,importTransfer,verifyTransfer } from "./lib/data-transfer.mjs";

const args = process.argv.slice(2);
const directory = args.includes("--from") ? args[args.indexOf("--from")+1] :
  await access(".site-transfer/snapshot.json").then(()=>".site-transfer",()=>".data/sites-transfer");
const platform = await openLocalPlatform();
try {
  if (args.includes("--verify")) await verifyTransfer(platform.env,directory);
  else {
    await applyMigrations(platform.env.DB);
    if (await access(directory+"/snapshot.json").then(()=>true,()=>false)) await importTransfer(platform.env,directory);
    else {
      await platform.env.DB.prepare("INSERT INTO site_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING").run();
      console.log("Initialized an empty local database. No existing data was replaced.");
    }
  }
} finally { await platform.dispose(); }
