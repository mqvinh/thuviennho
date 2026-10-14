import {readFile,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";

// OpenNext 1.20.x omits the preview-props manifest introduced in Next 16.4.
// Extend its manifest enumeration so it embeds the real build-specific values.
// This does not fabricate preview keys or suppress unknown-manifest errors.
const plugin=fileURLToPath(new URL("../cli/build/patches/plugins/load-manifest.js",import.meta.resolve("@opennextjs/cloudflare")));
const original=await readFile(plugin,"utf8");
const before="**/{*-manifest,required-server-files,prefetch-hints}.json";
const after="**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json";
if(original.includes(after)) console.log("OpenNext preview-props support is configured.");
else if(original.includes(before)) {
  await writeFile(plugin,original.replace(before,after));
  console.log("Enabled Next 16.4 preview-props in OpenNext manifest enumeration.");
} else throw new Error("OpenNext manifest implementation changed. Review the compatibility patch before building.");
