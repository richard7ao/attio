/**
 * Fire a test outreach call through our own API (exercises planning + dispatch).
 *
 *   npm run dispatch-test -- northwind +447700900123
 *
 * Args: <mockKey> <toNumber?>. Requires the voice server running and DEMO_USER_ID
 * (or pass a real userId by editing below).
 */
export {}; // make this a module so top-level names don't collide with other scripts

const [, , mock = "northwind", toNumber] = process.argv;
const base = process.env.VOICE_BASE_URL ?? `http://localhost:${process.env.PORT ?? 8787}`;

async function main() {
  const res = await fetch(`${base}/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mock,
      ...(toNumber ? { toNumber } : {}),
      ...(process.env.DEMO_USER_ID ? {} : {}),
    }),
  });
  const json = (await res.json()) as any;
  console.log(JSON.stringify(json, null, 2));
  if (json.call?.id) {
    console.log(`\nLive transcript → ${base}/demo/call.html?id=${json.call.id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
