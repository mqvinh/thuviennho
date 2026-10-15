import { createSupabaseBindings } from "./lib/supabase-client.mjs";
import { checkSupabaseSchema, importSupabase, verifySupabase, exportSupabase } from "./lib/supabase-transfer.mjs";

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index !== -1 && (!args[index + 1] || args[index + 1].startsWith("--"))) throw new Error(name + " requires a directory.");
  return index === -1 ? fallback : args[index + 1];
}
const env = createSupabaseBindings({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, bucket: process.env.SUPABASE_MEDIA_BUCKET });
await checkSupabaseSchema(env);
if (args.includes("--export")) await exportSupabase(env, option("--out", ".data/supabase-backup"));
else if (args.includes("--check")) console.log("Supabase schema and privileged server connection are ready.");
else {
  const directory = option("--from", ".data/vercel-initial-transfer");
  if (args.includes("--verify")) await verifySupabase(env, directory);
  else await importSupabase(env, directory);
}
