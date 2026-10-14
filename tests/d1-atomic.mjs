import assert from "node:assert/strict";
import {openLocalPlatform} from "../scripts/lib/local-platform.mjs";
import {applyMigrations} from "../scripts/lib/data-transfer.mjs";
import {randomUUID} from "node:crypto";

const platform=await openLocalPlatform(".data/d1-atomic-tests/state");
try {
  await applyMigrations(platform.env.DB);
  const id=randomUUID();
  await platform.env.DB.prepare("INSERT INTO reading_themes(id,slug,name_vi,name_en) VALUES(?1,?2,'Original','Original')").bind(id,"atomic-"+id).run();
  await assert.rejects(()=>platform.env.DB.batch([
    platform.env.DB.prepare("UPDATE reading_themes SET name_vi='Changed' WHERE id=?1").bind(id),
    platform.env.DB.prepare("INSERT INTO transaction_guards(id,valid) VALUES(?1,0)").bind(id),
  ]));
  assert.equal((await platform.env.DB.prepare("SELECT name_vi FROM reading_themes WHERE id=?1").bind(id).first()).name_vi,"Original");
  assert.equal(await platform.env.DB.prepare("SELECT id FROM transaction_guards WHERE id=?1").bind(id).first(),null);
  await platform.env.DB.prepare("DELETE FROM reading_themes WHERE id=?1").bind(id).run();
  console.log("Real D1 batch rolled back preceding writes when a precondition failed.");
} finally {await platform.dispose();}
