# Deploy

Three working options, ordered from "least clicks, random URL" to "full
control on your own box". All of them use the [`Dockerfile`](../Dockerfile)
at the repo root for the web app and [`etl/Dockerfile`](../etl/Dockerfile)
for the one-shot data load.

| Option | Time to live URL | Free tier? | Random `*.something` URL |
| --- | --- | --- | --- |
| **Railway** | ~5 min | Yes (limited) | `*.up.railway.app` |
| **Fly.io** | ~10 min | Yes (limited) | `*.fly.dev` |
| **Self-host with `docker compose`** | ~3 min | Free (your hardware) | None — bring your own DNS |

---

## Option 1 — Railway (easiest, random URL)

1. Push the repo to GitHub (or a private GitLab).
2. Go to [railway.com](https://railway.com/new), "Deploy from GitHub repo",
   pick this one.
3. Railway auto-detects [`railway.json`](../railway.json) and builds with
   the root `Dockerfile`. While that's building, add a Postgres database:
   **New → Database → Add Postgres**.
4. Open the web service → **Variables** → add a reference variable
   `DATABASE_URL = ${{Postgres.DATABASE_URL}}`. This wires the web service
   to the Postgres service.
5. Generate a public URL: **Settings → Networking → Generate Domain**.
   You now get something like `bott-analytics-production-xxxx.up.railway.app`.
6. Seed the database: **New → Service → GitHub Repo (same one)** → set
   **Settings → Root Directory** to `etl` (Railway will use
   `etl/Dockerfile`). Add the same `DATABASE_URL` variable. The container
   will boot once with `--help`; override the **Start Command** to:

   ```bash
   uv run csat-etl migrate && uv run csat-etl load --xlsm ../Copy\ of\ Survey_Data_Model.xlsm
   ```

   Deploy once; after the run completes you can pause or delete this
   service. The data is now in Postgres.

That's it. The web service auto-restarts on push.

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

# seed the database (one-shot machine from the ETL image)
fly machine run \
  --app bott-analytics \
  --build-target etl-bootstrap \
  --rm \
  -- /bin/sh -c "uv run csat-etl migrate && uv run csat-etl load --xlsm ../Copy\ of\ Survey_Data_Model.xlsm"
```

Open the resulting `https://bott-analytics.fly.dev` URL printed by
`fly deploy`.

---

## Option 3 — Self-host with docker-compose (single command)

Best for an internal VM, a NUC, or just trying it on a colleague's machine.

```bash
cp .env.example .env
# (the defaults work; change POSTGRES_PASSWORD before exposing publicly)
docker compose -f docker/docker-compose.prod.yml --env-file .env up --build
```

This brings up three services in sequence:

1. `postgres` — Postgres 17, persistent volume
2. `etl-bootstrap` — runs migrations + loads the workbook, then exits
3. `web` — Next.js standalone server, exposes `:3000`

The web dashboard is live at `http://localhost:3000`. Behind nginx /
Cloudflare Tunnel / Caddy, point a domain at port 3000 and you're done.

---

## Notes

- **Workbook updates**: re-run the ETL container (`docker compose ... run
  --rm etl-bootstrap`, or trigger the ETL service on Railway/Fly). The
  ETL truncates and reloads, so you never end up with mixed-vintage data.
- **Secrets**: never bake `DATABASE_URL` into the image. Both Railway and
  Fly inject it at runtime. For self-host, keep it in `.env`, which is
  gitignored.
- **HTTPS**: Railway and Fly terminate TLS for you. Self-host with Caddy
  for the easiest "real domain + HTTPS" experience.
