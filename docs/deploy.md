# Deploy

The root [`Dockerfile`](../Dockerfile) is **self-contained**: it builds the
Next.js standalone server *and* the Python ETL into one image, and the
container entrypoint runs `csat-etl migrate && csat-etl load` before
booting the server. **One service. One deploy. The DB is seeded
automatically.**

Three options, ordered easiest first.

| Option | Time to live URL | Free tier? | Random `*.something` URL |
| --- | --- | --- | --- |
| **Railway** | ~5 min | Yes (limited) | `*.up.railway.app` |
| **Fly.io** | ~10 min | Yes (limited) | `*.fly.dev` |
| **Self-host with `docker compose`** | ~3 min | Free (your hardware) | None — bring your own DNS |

---

## Option 1 — Railway (easiest, random URL)

1. Push the repo to GitHub.
2. Go to [railway.com/new](https://railway.com/new), **Deploy from GitHub
   repo**, pick this one. Railway auto-detects
   [`railway.json`](../railway.json) and builds with the root `Dockerfile`.
3. While that's building: **+ New → Database → Add PostgreSQL**.
4. Open the **web service → Variables → + New → Add Reference** →
   `DATABASE_URL = ${{Postgres.DATABASE_URL}}`. Save (it auto-redeploys).
5. **Settings → Networking → Generate Domain** → you get
   `bottanalytics-production-xxxx.up.railway.app`.

That's it. On boot the container runs the ETL bootstrap (migrate + load
~30 s) and then serves the dashboard. The bootstrap is idempotent — it
truncates and reloads the fact tables every restart, so dashboard data
always matches the workbook baked into the image.

To refresh data, commit a new `Copy of Survey_Data_Model.xlsm` and push;
Railway rebuilds and reseeds automatically.

---

## Option 2 — Fly.io (random `*.fly.dev` URL, similar effort)

```bash
# one-time install
brew install flyctl   # macOS

# from the repo root
fly auth login
fly launch --copy-config --no-deploy            # uses fly.toml at root
fly postgres create --name bott-analytics-db    # provisions managed Postgres
fly postgres attach --app bott-analytics bott-analytics-db
fly deploy                                       # builds Dockerfile, deploys
```

Open the resulting `https://bott-analytics.fly.dev` URL printed by
`fly deploy`. The container's entrypoint seeds the DB on first boot, no
extra step needed.

---

## Option 3 — Self-host with docker-compose (single command)

Best for an internal VM, a NUC, or just trying it on a colleague's machine.

```bash
cp .env.example .env
# (the defaults work; change POSTGRES_PASSWORD before exposing publicly)
docker compose -f docker/docker-compose.prod.yml --env-file .env up --build
```

This brings up two services:

1. `postgres` — Postgres 17, persistent volume
2. `web` — combined image that runs the ETL bootstrap on startup, then
   serves the dashboard on `:3000`

Behind nginx / Cloudflare Tunnel / Caddy, point a domain at port 3000.

---

## Notes

- **Workbook updates**: commit a new `Copy of Survey_Data_Model.xlsm`
  and push (or rebuild + redeploy). The entrypoint reloads on every
  start; the load is idempotent.
- **Skip the bootstrap**: set `SKIP_ETL_BOOTSTRAP=1` on the service to
  start the web server without re-seeding (useful if Postgres is on a
  slow link or already current).
- **Secrets**: never bake `DATABASE_URL` into the image. Both Railway
  and Fly inject it at runtime. For self-host, keep it in `.env`, which
  is gitignored.
- **HTTPS**: Railway and Fly terminate TLS for you. Self-host with Caddy
  for the easiest "real domain + HTTPS" experience.
