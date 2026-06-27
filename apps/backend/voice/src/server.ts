import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config } from "./config.js";
import { log } from "./logger.js";
import { callsRouter } from "./routes/calls.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { toolsRouter } from "./routes/tools.js";
import { devRouter } from "./routes/dev.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Capture the raw body so webhook HMAC verification can hash the exact bytes.
app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "voice",
    brain: config.brain.kind,
    slngConfigured: Boolean(config.slng.apiKey && config.slng.agentId),
    time: new Date().toISOString(),
  });
});

app.use(callsRouter);
app.use(webhooksRouter);
app.use(toolsRouter);
if (process.env.NODE_ENV !== "production") app.use(devRouter);

// Static demo page: open /demo/call.html?id=<callId>
app.use("/demo", express.static(path.join(__dirname, "..", "public")));

// Centralised error handler.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error({ err }, "unhandled route error");
  res.status(500).json({ error: "internal_error", message: String(err?.message ?? err) });
});

app.listen(config.port, () => {
  log.info(`voice service listening on :${config.port} (brain=${config.brain.kind})`);
  if (!config.publicBaseUrl) log.warn("PUBLIC_BASE_URL not set — SLNG webhooks won't reach you");
});
