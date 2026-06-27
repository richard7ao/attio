/**
 * End-to-end LOCAL demo with no SLNG: create a call, then play a scripted
 * conversation through the real DB + SSE pipeline.
 *
 *   npm run demo                 # uses mock "northwind"
 *   npm run demo -- acme         # different mock account
 *
 * Open the printed /demo URL first, then this animates it live.
 */
export {}; // make this a module so top-level names don't collide with other scripts

const [, , mock = "northwind"] = process.argv;
const base = process.env.VOICE_BASE_URL ?? `http://localhost:${process.env.PORT ?? 8787}`;

async function main() {
  const created = await fetch(`${base}/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mock }),
  });
  const body = (await created.json()) as any;
  const callId = body?.call?.id;
  if (!callId) {
    console.error("Failed to create call:", JSON.stringify(body, null, 2));
    process.exit(1);
  }

  const url = `${base}/demo/call.html?id=${callId}`;
  console.log(`\n▶  Open this FIRST, then watch it fill in:\n   ${url}\n`);
  console.log("Talking points:", JSON.stringify(body.talkingPoints ?? [], null, 2));

  // Small head start so you can open the page before the conversation begins.
  await new Promise((r) => setTimeout(r, 1500));

  const sim = await fetch(`${base}/dev/simulate/${callId}`, { method: "POST" });
  console.log("simulation:", JSON.stringify(await sim.json()));
  console.log("\nWatch the page — agent/customer turns, a mid-call tool, then the summary.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
