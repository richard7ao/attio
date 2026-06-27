# n8n

Self-hosted [n8n](https://n8n.io) for automation workflows (Stripe events, usage
metrics, support-ticket sentiment) that POST **signals** into the Attio API.

## Run locally

```bash
cp ../../.env.example ../../.env   # set N8N_ENCRYPTION_KEY
docker compose up -d
```

Open http://localhost:5678. Export workflows as JSON into `./workflows/` and
commit them so the whole team shares the same automations.

Workflows should call the API webhooks:

- `POST /api/webhooks/n8n` — usage drop / near-limit, support sentiment
- `POST /api/webhooks/stripe` — cancellations
- `POST /api/webhooks/twilio` — voice/SMS status
