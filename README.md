# QuantWarden UI

Next.js control plane for QuantWarden.

This app is responsible for:
- organization UI
- asset explorer and overview
- scan creation and scheduling
- live scan activity streaming over SSE

Long-running scan execution is handled by the dedicated worker in:
- [worker/README.md](/Users/maasir/Projects/quantwarden-ui/worker/README.md)

## Architecture

- `Vercel`
  - hosts this Next.js app
  - users trigger manual scans and create schedules here
  - app writes scan batches and schedules into Neon
  - app subscribes to DB-backed SSE activity updates
- `Neon Postgres`
  - stores assets, batches, scans, schedules, and progress state
- `Azure VM`
  - runs backend scan services (`openssl-api`, `nmap-api`, etc.)
  - runs the QuantWarden scan worker container

The frontend and worker are not directly coupled in-process.
They coordinate through:
- shared Neon database state
- a small signed worker wake endpoint for instant manual scans

## Deployment Contract

### App-side envs on Vercel

Set these in the app deployment:

```env
SCAN_WORKER_WAKE_URL=https://your-vm-or-proxy.example.com/internal/wake
SCAN_WORKER_WAKE_SECRET=replace-with-the-same-long-random-secret-used-by-the-worker
SCAN_WORKER_WAKE_TIMEOUT_MS=1500
```

Purpose:
- `SCAN_WORKER_WAKE_URL`
  - endpoint the app calls after creating a manual scan batch
- `SCAN_WORKER_WAKE_SECRET`
  - bearer token shared with the worker
- `SCAN_WORKER_WAKE_TIMEOUT_MS`
  - short timeout for the wake request; batch creation still succeeds if wake fails

### Worker-side envs on the VM

Create this file on the VM in the repo root:

- `/path/to/quantwarden-ui/.env.worker`

Recommended values:

```env
DATABASE_URL=postgres://username:password@host/database?sslmode=require
OPENSSL_API_URL=http://openssl-api:8020
NMAP_API_URL=http://nmap-api:8010
SCAN_WORKER_PORT=8085
SCAN_WORKER_WAKE_SECRET=replace-with-the-same-long-random-secret-used-by-the-app
OPENSSL_API_TIMEOUT_SECONDS=3
OPENSSL_API_REQUEST_TIMEOUT_MS=15000
OPENSSL_API_PROBE_BATCH_SIZE=10
SCAN_WORKER_ACTIVE_EXECUTOR_TICK_MS=1500
SCAN_WORKER_ACTIVE_SCHEDULER_TICK_MS=10000
SCAN_WORKER_IDLE_EXECUTOR_TICK_MS=1800000
SCAN_WORKER_IDLE_SCHEDULER_TICK_MS=1800000
SCAN_WORKER_ACTIVE_GRACE_MS=60000
SCAN_WORKER_ACTIVE_ORG_LIMIT=100
```

Behavior:
- manual scans wake the worker immediately and start quickly if the org is idle
- scheduled scans are allowed to wait up to `30 minutes`
- active scans still get frequent progress updates

## Worker Startup

From the repo root on the VM:

```bash
cp .env.worker.example .env.worker
# edit .env.worker
docker compose -f worker/docker-compose.worker.yml up -d --build
```

The worker guide lives here:
- [worker/README.md](/Users/maasir/Projects/quantwarden-ui/worker/README.md)
