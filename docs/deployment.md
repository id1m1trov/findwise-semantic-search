# Deployment

The live demo, <https://marlow-semantic-search.onrender.com>, runs on
[Render](https://render.com) as a single web service on the free plan. The settings are in
[`render.yaml`](../render.yaml).

| Setting | Value |
|---|---|
| Build | `npm ci && npm run build && npm run ingest` |
| Start | `npm start` |
| Health check | `GET /api/health` |
| Region | Frankfurt |

**Why ingest runs during the build:** it downloads the model and creates the database and
vector index once, at build time. The free plan has no persistent disk, so without this step
the server would recreate them every time it starts or wakes up. With it, the server starts in
a few seconds.

**One service for everything:** Express serves the API and the built React app from the same
origin, so no CORS setup is needed. The JavaScript and CSS files have a fingerprint in their
names, so browsers can cache them for a year. `index.html` is checked again on every visit, so
a new deploy shows up immediately.

## Free plan limits

- **Sleeps when idle.** After 15 minutes without traffic the service stops; the next visit
  takes about a minute while it wakes up.
- **Memory:** 512 MB. The app used about 200 MB in local measurements (Render's free plan
  doesn't show memory usage). Embedding in small batches keeps it near that even when the
  index has to be rebuilt.
- **CPU:** a small share of one CPU, so a search takes a few hundred milliseconds instead of a
  few milliseconds locally.

## Redeploying

Push to `main`, then use **Manual Deploy** on the Render dashboard if the new commit isn't
deployed automatically.
