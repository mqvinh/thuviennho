import {openLocalPlatform} from "./lib/local-platform.mjs";
import {importOrder,digest} from "./lib/data-transfer.mjs";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {createRemoteBindings} from "./lib/remote-client.mjs";

const args=process.argv.slice(2);
const remote=args.includes("--remote");
const directory=path.resolve(args.includes("--out") ? args[args.indexOf("--out")+1] : remote ? ".data/remote-sites-transfer" : ".data/current-sites-transfer");
await mkdir(path.join(directory,"media"),{recursive:true});
const platform=remote ? {env:createRemoteBindings({url:process.env.LITTLE_READERS_BACKEND_URL,token:process.env.LITTLE_READERS_BACKEND_TOKEN}),dispose:async()=>{}} : await openLocalPlatform();
try {
  const snapshot={version:1,exportedAt:new Date().toISOString(),tables:{}};
  for(const name of importOrder) {
    const info=(await platform.env.DB.prepare(`PRAGMA table_info(${name})`).all()).results;
    const primaryKeys=info.filter(column=>column.pk).sort((a,b)=>a.pk-b.pk).map(column=>column.name);
    const rows=(await platform.env.DB.prepare(`SELECT * FROM ${name}${primaryKeys.length ? " ORDER BY "+primaryKeys.join(",") : ""}`).all()).results;
    snapshot.tables[name]={columns:info.map(column=>({column_name:column.name,data_type:column.type,is_nullable:column.notnull ? "NO" : "YES",column_default:column.dflt_value})),primaryKeys,rows};
  }
  const media=[];
  let cursor;
  do {
    const listing=await platform.env.MEDIA.list({cursor});
    for(const object of listing.objects) {
      if(!/^[a-f0-9-]+\.(png|jpg|webp|mp3|wav|ogg)$/.test(object.key)) throw new Error("Unexpected media key.");
      const file=await platform.env.MEDIA.get(object.key);
      const bytes=new Uint8Array(await file.arrayBuffer());
      await writeFile(path.join(directory,"media",object.key),bytes);
      media.push({key:object.key,path:"/media/"+object.key,size:bytes.length,sha256:digest(bytes)});
    }
    cursor=listing.truncated ? listing.cursor : undefined;
  } while(cursor);
  media.sort((a,b)=>a.key.localeCompare(b.key));
  const text=JSON.stringify(snapshot,null,2)+"\n";
  await writeFile(path.join(directory,"snapshot.json"),text);
  await writeFile(path.join(directory,"manifest.json"),JSON.stringify({version:1,exportedAt:snapshot.exportedAt,databaseSha256:digest(text),tableCounts:Object.fromEntries(Object.entries(snapshot.tables).map(([name,table])=>[name,table.rows.length])),media},null,2)+"\n");
  console.log(`Exported current ${remote ? "remote" : "local"} data: ${Object.keys(snapshot.tables).length} tables, ${media.length} media files → ${directory}`);
} finally {await platform.dispose();}
