# API Docker VPS Deploy

Target VPS:

- Host: `167.233.106.79`
- API domain: `api.mezonly.com`
- Mezon gateway CORS proxy: `gw.mezonly.com`
- Remote directory: `/root/mezon-tutors`

## DNS

Create these records before issuing TLS certificates:

```txt
api.mezonly.com  A  167.233.106.79
gw.mezonly.com   A  167.233.106.79
```

The frontend domain (`mezonly.com` / `www.mezonly.com`) can stay on Vercel or any other frontend host. It only needs to call `https://api.mezonly.com/api` and, if the Mezon gateway proxy is used, `https://gw.mezonly.com`.

Important: this Docker Compose stack only serves `api.mezonly.com` and `gw.mezonly.com`. If the frontend remains on Vercel, do not point `mezonly.com` / `www.mezonly.com` at this VPS.

## First-Time VPS Bootstrap

Prerequisites on the local machine:

- SSH access to `root@167.233.106.79`
- Docker running locally, because the API image is built locally and streamed to the VPS
- `.env.production` present at the repo root

Run:

```sh
CERTBOT_EMAIL=admin@mezonly.com ./scripts/bootstrap-api-vps-docker-ssh.sh
```

The script:

1. Installs/checks Docker and Docker Compose on the VPS.
2. Copies `docker-compose.api.prod.yml`, `.env.production`, and nginx configs to `/root/mezon-tutors`.
3. Builds `mezon-tutors-api:latest` locally for `linux/amd64`.
4. Streams the image to the VPS with `docker load`.
5. Starts Dockerized `postgres` and `api`.
6. Starts temporary HTTP nginx for ACME challenges.
7. Issues Let's Encrypt certs for `api.mezonly.com` and `gw.mezonly.com`.
8. Starts the HTTPS nginx container.

## Normal API Redeploy

After first bootstrap, redeploy code changes with:

```sh
./scripts/deploy-api-docker-ssh.sh
```

This syncs deploy files/env, builds the API image locally, streams it to the VPS, recreates `postgres`/`api`, then recreates `nginx`.

## Verify

```sh
curl -i https://api.mezonly.com/api/health
```

Expected: `HTTP/2 200` with JSON status.

Production `.env.production` should set `CORS_DELEGATE_TO_PROXY=true` so NestJS does not emit its own
`Access-Control-Allow-Origin` headers (nginx owns CORS). Duplicate or wildcard ACAO headers break
browser requests that use `withCredentials`.

Check API CORS:

```sh
curl -i -X OPTIONS "https://api.mezonly.com/api/health" \
  -H "Origin: https://www.mezonly.com" \
  -H "Access-Control-Request-Method: GET"
```

Expected: `204` and `access-control-allow-origin: https://www.mezonly.com`.

Check Mezon gateway proxy CORS:

```sh
curl -i -X OPTIONS "https://gw.mezonly.com/v2/account/authenticate/idtoken" \
  -H "Origin: https://www.mezonly.com" \
  -H "Access-Control-Request-Method: POST"
```

Expected: `204` and `access-control-allow-origin: https://www.mezonly.com`.

## TLS Renewal

Run manually or schedule with cron on the VPS:

```sh
cd /root/mezon-tutors
docker compose -f docker-compose.api.prod.yml run --rm certbot renew --webroot -w /var/www/certbot
docker compose -f docker-compose.api.prod.yml exec nginx nginx -s reload
```

## Notes

- Postgres is not published to the public internet. It is bound only to `127.0.0.1:${POSTGRES_PORT:-6543}` on the VPS and is also reachable inside the Docker network as `postgres:5432`.
- Persistent database data lives in the Docker volume `pgdata`.
- TLS certs live in Docker volume `certbot-etc`.
- ACME challenge files live in Docker volume `certbot-www`.
- API startup runs `prisma migrate deploy` from `scripts/docker-api-entrypoint.sh`.
