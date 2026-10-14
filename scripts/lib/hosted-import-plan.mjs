import {readFile,readdir} from "node:fs/promises";
import {importOrder,normalizeValue} from "./data-transfer.mjs";

// Native D1 statements for the hosting agent. No public HTTP import endpoint.
// Execute each batch atomically; upload and checksum R2 objects before batch 0.
export async function createHostedImportPlan(snapshot,manifest) {
  const id=manifest.databaseSha256;
  const batches=[];
  const guard="sites-import-"+id;
  const assertion=(condition,values=[])=>({sql:"INSERT INTO transaction_guards(id,valid) SELECT ?1,CASE WHEN ("+condition+") THEN 1 ELSE 0 END",values:[guard,...values]});
  const cleanup={sql:"DELETE FROM transaction_guards WHERE id=?1",values:[guard]};
  const initialization=[
    {sql:"CREATE TABLE IF NOT EXISTS data_imports(id TEXT PRIMARY KEY,imported_at TEXT NOT NULL)",values:[]},
    {sql:"CREATE TABLE IF NOT EXISTS data_import_progress(id TEXT PRIMARY KEY,next_index INTEGER NOT NULL)",values:[]},
    assertion(importOrder.map(name=>"NOT EXISTS(SELECT 1 FROM "+name+")").join(" AND ")+" AND NOT EXISTS(SELECT 1 FROM data_import_progress) AND NOT EXISTS(SELECT 1 FROM data_imports)"),
    {sql:"INSERT INTO data_import_progress(id,next_index) VALUES(?1,0)",values:[id]},cleanup,
  ];
  batches.push({name:"initialize-empty-target",statements:initialization});
  const statements=[];
  for(const name of importOrder) {
    const {columns,rows}=snapshot.tables[name];
    const sql="INSERT INTO "+name+"("+columns.map(column=>column.column_name).join(",")+") VALUES("+columns.map((_,i)=>"?"+(i+1)).join(",")+")";
    for(const row of rows) statements.push({sql,values:columns.map(column=>normalizeValue(row[column.column_name],column))});
  }
  for(let index=0;index<statements.length;index+=40) {
    const next=Math.min(index+40,statements.length);
    batches.push({name:"records-"+index,nextIndex:next,statements:[
      assertion("EXISTS(SELECT 1 FROM data_import_progress WHERE id=?2 AND next_index=?3)",[id,index]),
      ...statements.slice(index,next),
      {sql:"UPDATE data_import_progress SET next_index=?1 WHERE id=?2",values:[next,id]},cleanup,
    ]});
  }
  batches.push({name:"complete",statements:[
    assertion("EXISTS(SELECT 1 FROM data_import_progress WHERE id=?2 AND next_index=?3)",[id,statements.length]),
    {sql:"INSERT INTO data_imports(id,imported_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%fZ','now'))",values:[id]},
    {sql:"DELETE FROM data_import_progress WHERE id=?1",values:[id]},cleanup,
  ]});
  return {
    version:1,bindings:{d1:"DB",r2:"MEDIA"},databaseSha256:id,
    instructions:"Apply numbered schema migrations first. Upload all manifest media with original keys, MIME and SHA-256. Execute each statements array using D1.batch atomically. On resume read data_import_progress and skip completed batches; on an existing data_imports marker skip all initial-data batches. Verify every table value and every media checksum after import. Never execute initial-data batches during code updates.",
    migrations:await Promise.all((await readdir("database/d1/migrations")).filter(name=>name.endsWith(".sql")).sort().map(async name=>({name,sql:await readFile("database/d1/migrations/"+name,"utf8")}))),
    batches,
  };
}
