# QuantWarden Scan Worker

This worker is the background scheduler and scan executor for organization scans.

The Next.js app remains the control plane:
- users create scan batches and schedules there
- the app exposes live activity and history
- SSE stays available for real-time UI updates

The worker is the execution plane:
- materializes due schedules into queued scan batches
- claims pending scan items
- runs OpenSSL and port-discovery jobs
- writes progress and results back into the same Neon database

## What It Runs

The worker handles:
- one-time scheduled scans
- recurring scheduled scans
- queued OpenSSL scan batches
- queued Nmap-backed port-discovery batches

It does not replace the app. It complements it.

## Required Environment Variables

Point the worker at the same backing services as the app:

- `DATABASE_URL`
- `OPENSSL_API_URL`
- `NMAP_API_URL`
- `SCAN_WORKER_PORT`
- `SCAN_WORKER_HEALTH_PORT`
- `SCAN_WORKER_WAKE_SECRET`

Optional tuning:

- `OPENSSL_API_TIMEOUT_SECONDS`
- `OPENSSL_API_REQUEST_TIMEOUT_MS`
- `OPENSSL_API_PROBE_BATCH_SIZE`
- `SCAN_WORKER_ACTIVE_EXECUTOR_TICK_MS`
- `SCAN_WORKER_ACTIVE_SCHEDULER_TICK_MS`
- `SCAN_WORKER_IDLE_EXECUTOR_TICK_MS`
- `SCAN_WORKER_IDLE_SCHEDULER_TICK_MS`
- `SCAN_WORKER_ACTIVE_GRACE_MS`
- `SCAN_WORKER_ACTIVE_ORG_LIMIT`

Example worker env template:
- [.env.worker.example](/Users/maasir/Projects/quantwarden-ui/.env.worker.example)

Recommended production values for your current strategy:

```env
SCAN_WORKER_PORT=8088
SCAN_WORKER_HEALTH_PORT=8089
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

That gives you:
- manual scan wake-up within seconds
- scheduled scan pickup within about 30 minutes
- frequent progress updates only while active work exists

Worker control endpoints:
- `POST /internal/wake`

`POST /internal/wake` requires:
- `Authorization: Bearer <SCAN_WORKER_WAKE_SECRET>`

Dedicated health endpoint:
- `GET http://<worker-host>:<SCAN_WORKER_HEALTH_PORT>/healthz`
- `GET http://<worker-host>:<SCAN_WORKER_HEALTH_PORT>/`

## Local Development

From the repo root:

```bash
npm install
npm run worker:check
npm run worker:start
```

The worker boot command:
- builds the worker with `tsc`
- starts `worker/bootstrap.cjs`
- loads the shared app modules from the same repo

Use the same `.env` values you already use for local scanning.

The worker bootstrap automatically reads:
- `.env`
- `.env.local`

Existing exported shell variables still take precedence.

## Azure VM Deployment

Recommended target:
- Ubuntu VM
- Node `22.22.2` or another Node 22 release

Basic setup:

```bash
git clone <your-repo>
cd quantwarden-ui
npm install
npm run worker:build
```

Then run:

```bash
node worker/bootstrap.cjs
```

## Docker Deployment

If your Azure VM already runs the backend scan services through Docker, this is the cleaner deployment path.

### Preferred Env File Setup

On the VM, in the repo root:

```bash
cp .env.worker.example .env.worker
```

Then fill in the real values in:

- `/path/to/quantwarden-ui/.env.worker`

This keeps the worker secrets outside the image and makes startup commands short.

For near-instant manual scans, configure these app-side environment variables in Vercel:

- `SCAN_WORKER_WAKE_URL`
- `SCAN_WORKER_WAKE_SECRET`
- `SCAN_WORKER_WAKE_TIMEOUT_MS`

Example:

- `SCAN_WORKER_WAKE_URL=https://your-vm-or-proxy.example.com/internal/wake`
- `SCAN_WORKER_WAKE_TIMEOUT_MS=1500`

Build the worker image from this repo root:

```bash
docker build -f worker/Dockerfile -t quantwarden-scan-worker:latest .
```

Then run it:

```bash
docker run -d \
  --name quantwarden-scan-worker \
  --restart unless-stopped \
  -p 8088:8088 \
  -p 8089:8089 \
  --env-file .env.worker \
  -e NODE_ENV=production \
  quantwarden-scan-worker:latest
```

### Simplest Start Command

If you want the simplest VM startup command from this repo:

```bash
docker compose -f worker/docker-compose.worker.yml up -d --build
```

That compose file already reads:

- `../.env.worker`

So if you run it from the repo root, the expected env file is:

- `/path/to/quantwarden-ui/.env.worker`

### Update / Restart on the VM

From the repo root:

Stop and recreate the worker:

```bash
docker compose -f worker/docker-compose.worker.yml down
docker compose -f worker/docker-compose.worker.yml up -d --build
```

Restart without rebuilding:

```bash
docker compose -f worker/docker-compose.worker.yml restart
```

Force a clean rebuild:

```bash
docker compose -f worker/docker-compose.worker.yml down
docker compose -f worker/docker-compose.worker.yml build --no-cache
docker compose -f worker/docker-compose.worker.yml up -d
```

Check status and logs:

```bash
docker compose -f worker/docker-compose.worker.yml ps
docker compose -f worker/docker-compose.worker.yml logs -f
```

Health checks:

```bash
curl http://127.0.0.1:8089/healthz
curl http://127.0.0.1:8089/
```

### Using It Beside Your Backend Monorepo

The cleanest VM setup is:
- keep this worker source in the app repo
- build the worker image from this repo
- run that container beside the existing backend stack on the same Docker host

You do not need to copy the worker code into the backend monorepo.

You can either:
- build and run this image independently on the VM, or
- copy the example compose service from [docker-compose.worker.yml](/Users/maasir/Projects/quantwarden-ui/worker/docker-compose.worker.yml) into the backend monorepo's Docker stack

If the backend services and worker run on the same Docker network, prefer container service URLs such as:
- `OPENSSL_API_URL=http://openssl-api:8020`
- `NMAP_API_URL=http://nmap-api:8010`

If they are not on the same Docker network, use the reachable VM URLs instead.

If the public app must wake the worker directly, expose the worker port through your reverse proxy or a restricted VM port and point `SCAN_WORKER_WAKE_URL` at that route.

The health port can be exposed separately for liveness checks if you want a simpler probe path than the control port.

### Example Compose Service

There is a ready example in:
- [worker/docker-compose.worker.yml](/Users/maasir/Projects/quantwarden-ui/worker/docker-compose.worker.yml)

That file is intended to be copied or merged into the backend deployment stack, not run as a second full project by itself.

If you copy it into the backend monorepo, update `env_file` to point to that stack's env file location.

## systemd Service

Example unit:

```ini
[Unit]
Description=QuantWarden Scan Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/azureuser/quantwarden-ui
Environment=NODE_ENV=production
Environment=DATABASE_URL=your_neon_connection_string
Environment=OPENSSL_API_URL=http://127.0.0.1:8020
Environment=NMAP_API_URL=http://127.0.0.1:8010
ExecStart=/usr/bin/node /home/azureuser/quantwarden-ui/worker/bootstrap.cjs
Restart=always
RestartSec=5
User=azureuser

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable quantwarden-scan-worker
sudo systemctl start quantwarden-scan-worker
sudo systemctl status quantwarden-scan-worker
journalctl -u quantwarden-scan-worker -f
```

## Deployment Model

- Vercel deploys only the Next.js app
- the VM runs the background worker
- both must point to the same Neon database
- both must point to the same scan backend services
- the preferred VM deployment is now the worker Docker container

## How SSE Fits In

SSE is still available.

The difference is:
- before: the browser stream also drove execution
- now: the worker executes scans, and SSE only streams DB-backed activity updates to the UI

That means scans keep running even when no browser tab is open.
