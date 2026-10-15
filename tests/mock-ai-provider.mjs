// Loaded only by the isolated production test process. No paid API calls.
import assert from "node:assert/strict";
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (!url.startsWith("https://ai-provider.example/")) return originalFetch(input, init);
  assert.equal(url, "https://ai-provider.example/v1/responses");
  assert.equal(init.redirect, "error");
  assert.equal(init.cache, "no-store");
  assert.equal(init.headers.Authorization, "Bearer test-private-ai-key");
  const body = JSON.parse(init.body);
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.store, false);
  if (body.model === "test-provider-error")
    return Response.json({ error: "test-private-ai-key" }, { status: 401 });
  assert.equal(body.model, "test-configured-model");
  const topic = JSON.parse(body.input[1].content);
  const draft = {
    ...topic, title_vi: "Configured AI draft", title_en: "Configured AI draft",
    summary_vi: "", summary_en: "", reading_level: 1, estimated_minutes: 5,
    source_note: "", license_note: "", cover_image_path: "",
    sentences: [{ text_vi: "Hello", text_en: "Hello", audio_vi_path: "", audio_en_path: "" }],
    vocabulary: [], questions: [],
  };
  return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(draft) }] }] });
};
