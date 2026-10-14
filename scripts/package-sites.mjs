import {execFileSync} from "node:child_process";
import {readFile,writeFile,mkdir,mkdtemp,readdir} from "node:fs/promises";
import path from "node:path";
import {zipSync,unzipSync} from "fflate";
import {digest,loadTransfer,verifyTransfer} from "./lib/data-transfer.mjs";
import {openLocalPlatform} from "./lib/local-platform.mjs";
import {createHostedImportPlan} from "./lib/hosted-import-plan.mjs";

// Capture current local data, rather than replaying the original migration snapshot.
await mkdir(".data/packages",{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const staging=await mkdtemp(path.resolve(".data/packages/transfer-"));
execFileSync(process.execPath,["scripts/export-data.mjs","--out",staging],{stdio:"inherit"});
const platform=await openLocalPlatform();
try {await verifyTransfer(platform.env,staging);} finally {await platform.dispose();}
const {snapshot,manifest}=await loadTransfer(staging);
const files={};
const sourceNames=execFileSync("git",["ls-files","--cached","--others","--exclude-standard","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);
const forbidden=/(^|\/)(?:\.git|node_modules|\.next(?:-test)?|\.open-next|\.wrangler|\.data|\.site-transfer|test-results|playwright-report)(?:\/|$)|(^|\/)(?:\.env[^/]*|\.dev\.vars(?!\.example)[^/]*|teacher-login\.txt)|\.(?:pem|tsbuildinfo|zip)$/;
for(const name of sourceNames) {
  if(forbidden.test(name)) continue;
  // git lists deleted files until the next commit; skip only genuinely missing paths.
  try {files[name]=new Uint8Array(await readFile(name));}
  catch(error) {if(error.code!=="ENOENT") throw error;}
}
for(const name of ["snapshot.json","manifest.json"]) files[".site-transfer/"+name]=new Uint8Array(await readFile(path.join(staging,name)));
for(const file of manifest.media) files[".site-transfer/media/"+file.key]=new Uint8Array(await readFile(path.join(staging,"media",file.key)));
files[".site-transfer/import-plan.json"]=new TextEncoder().encode(JSON.stringify(await createHostedImportPlan(snapshot,manifest),null,2)+"\n");
for(const required of ["package.json","package-lock.json","wrangler.jsonc","open-next.config.ts",".openai/hosting.json","database/d1/migrations/0001_schema.sql"]) {
  if(!files[required]) throw new Error("Missing package file: "+required);
}
// Ensure every public asset is included, including files not yet staged in Git.
async function checkPublic(directory="public") {
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const name=directory+"/"+entry.name;
    if(entry.isDirectory()) await checkPublic(name);
    else if(entry.isFile()&&!files[name]) throw new Error("Public asset missing from package: "+name);
  }
}
await checkPublic();
const archive=zipSync(files,{level:6});
const unpacked=unzipSync(archive);
if(Object.keys(unpacked).length!==Object.keys(files).length) throw new Error("ZIP file count mismatch.");
for(const [name,bytes] of Object.entries(files)) {
  if(digest(unpacked[name])!==digest(bytes)) throw new Error("ZIP checksum mismatch: "+name);
}
const target=path.resolve(".data/packages/little-readers-sites-"+stamp+".zip");
await writeFile(target,archive,{flag:"wx"});
await writeFile(target+".sha256",digest(archive)+"  "+path.basename(target)+"\n");
await writeFile(target+".report.json",JSON.stringify({createdAt:new Date().toISOString(),gitCommit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),gitDirty:!!execFileSync("git",["status","--porcelain"],{encoding:"utf8"}).trim(),files:Object.keys(files).length,bytes:archive.length,sha256:digest(archive),tableCounts:manifest.tableCounts,mediaFiles:manifest.media.length,databaseSha256:manifest.databaseSha256},null,2)+"\n");
console.log("Verified source, public assets and complete private data package: "+target);
console.log("ZIP SHA-256: "+digest(archive));
console.log("Contains user records and password hashes. Keep this archive private; never place .site-transfer in public/.");
