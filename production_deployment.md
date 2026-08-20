# Google OAuth Deployment Guide

React + Node + Docker + EC2

## Problem Summary

Google login failed in production with:

```text
redirect_uri_mismatch
```

Even though:
- `.env` looked correct
- Google Cloud Console was configured correctly

## Root Cause

Multiple environment sources were conflicting:

1. `docker-compose.yml` passed:

```yaml
GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}
```

2. The backend also loaded:

- `server/.env`

3. That file contained:

```text
GOOGLE_REDIRECT_URI=http://localhost:3000
```

`dotenv` inside Node.js loaded `server/.env`, overriding Docker environment variables.

## Final Fix

### 1. Update `server/.env`

Use production values:

```text
APP_BASE_URL=https://augmis.com
CLIENT_ORIGIN=https://augmis.com
GOOGLE_REDIRECT_URI=https://augmis.com
```

### 2. Keep Docker env aligned

In `docker-compose.yml`:

```yaml
environment:
  GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
  GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
  GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}
```

### 3. Rebuild and restart API

```bash
docker compose build api
docker compose up -d --force-recreate api
```

### 4. Verify runtime values

```bash
docker compose exec api printenv GOOGLE_REDIRECT_URI
```

Expected:

```text
https://augmis.com
```

### 5. Verify logs

```bash
docker compose logs api --since=1m
```

Expected:

```text
[GOOGLE] redirect_uri used: https://augmis.com
```

## Google Cloud Configuration

### Authorized JavaScript origins

- `https://augmis.com`
- `https://www.augmis.com`
- `http://localhost:3000`

### Authorized redirect URIs

- `https://augmis.com`
- `https://www.augmis.com`
- `http://localhost:3000`

Do not use:

- `/login`
- `/api/auth/google/callback`

## Important Concept

This app uses:

```js
useGoogleLogin({ flow: "auth-code" })
```

In popup mode:

- the redirect URI must be the origin
- it is not a callback URL

## Common Pitfalls

### 1. Multiple .env files

`server/.env` can override Docker env values.

Fix:

- keep the files identical, or
- use only Docker-managed env for production

### 2. Old Docker builds

Code or env can be cached.

Fix:

```bash
docker compose build --no-cache api
```

### 3. Hardcoded localhost in code

Check for stale localhost references:

```bash
grep -R "localhost:3000" server/
```

Replace them with:

```js
process.env.APP_BASE_URL
```

### 4. Logs vs reality

Trust runtime logs:

```bash
docker compose logs api
```

Not `.env` files alone.

## Recommended Best Practice

### Option A, preferred

Use only Docker env:

- remove `server/.env`
- keep all env in `deploy/.env`

### Option B

Keep both, but ensure they are identical.

## Deployment Rule

When syncing to EC2:

- do not overwrite `.env` files
- do not overwrite `docker-compose.yml` without approval
- only deploy source code and build artifacts unless env changes are explicitly needed

## Experience Builder Production Notes

For the `/experiencebuilder` issue specifically, Nginx is not transforming the UI. In this repo it only proxies:

- `/` to the `client` container on port `3000`
- `/api/` to the `api` container on port `5000`

The React app is bundled inside the `client` image and served by `serve -s build`. If AWS shows old UI while localhost shows the new UI, the usual causes are:

- the `client` image was not rebuilt after the code change
- the `client` container was not recreated
- the browser is still caching old assets
- the backend DB data on EC2 differs from local data

Recommended verification steps:

```bash
docker compose build --no-cache client
docker compose up -d --force-recreate client nginx
docker compose logs client --since=5m
```

Then confirm the browser is loading the new build:

- open DevTools and disable cache for a hard refresh
- inspect the JS bundle hash under `build/static/`
- compare the page source served by EC2 with localhost

Do not remove Nginx unless the deployment architecture is changing. In the current setup it is the normal entrypoint for the single-domain app and API proxy, not the source of the React build itself.
