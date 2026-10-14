import assert from "node:assert/strict";
import {mkdir,mkdtemp,readFile} from "node:fs/promises";
import path from "node:path";
import {openLocalPlatform} from "../scripts/lib/local-platform.mjs";
import {applyMigrations,loadTransfer,verifyTransfer} from "../scripts/lib/data-transfer.mjs";
import {createHostedImportPlan} from "../scripts/lib/hosted-import-plan.mjs";

await mkdir(".data",{recursive:true});
const isolated=await mkdtemp(path.resolve(".data/hosted-import-test-"));
const source=path.resolve(".data/sites-transfer");
const {snapshot,manifest}=await loadTransfer(source);
const plan=await createHostedImportPlan(snapshot,manifest);
const platform=await openLocalPlatform(path.join(isolated,"state"));
try {
  await applyMigrations(platform.env.DB);
  for(const file of manifest.media) await platform.env.MEDIA.put(file.key,await readFile(path.join(source,"media",file.key)));
  const run=batch=>platform.env.DB.batch(batch.statements.map(statement=>platform.env.DB.prepare(statement.sql).bind(...statement.values)));
  for(const batch of plan.batches) await run(batch);
  await verifyTransfer(platform.env,source);
  await assert.rejects(()=>run(plan.batches[0]),/CHECK constraint/);
  await assert.rejects(()=>run(plan.batches[1]),/CHECK constraint/);
  assert.equal((await platform.env.DB.prepare("SELECT count(*) AS n FROM data_imports").first()).n,1);
  assert.equal((await platform.env.DB.prepare("SELECT count(*) AS n FROM transaction_guards").first()).n,0);
  assert.equal((await platform.env.DB.prepare("SELECT count(*) AS n FROM data_import_progress").first()).n,0);
  console.log("Hosted import plan preserves all original rows/media and rejects accidental replay.");
} finally {await platform.dispose();}
