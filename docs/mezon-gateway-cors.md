# Mezon gateway CORS — self-hosted reverse proxy

## Problem

Browser login to **mezonly.site** fails at the Mezon Light step. The `mezon-light-sdk`
calls `https://gw.mezon.ai/v2/account/authenticate/idtoken` **directly from the browser**,
and the gateway's CORS preflight does not return `Access-Control-Allow-Origin` for our
origins:

```
Access to fetch at 'https://gw.mezon.ai/v2/account/authenticate/idtoken' from origin
'https://www.mezonly.site' has been blocked by CORS policy: No 'Access-Control-Allow-Origin'
header is present on the requested resource.
```

Verified — the gateway emits `allow-methods`/`allow-headers` but omits `allow-origin` for
`mezonly.site`, `www.mezonly.site`, and `mezon-tutors.vercel.app` (blanket exclusion, not a
www-vs-apex issue):

```bash
curl -s -D - -o /dev/null -X OPTIONS \
  "https://gw.mezon.ai/v2/account/authenticate/idtoken" \
  -H "Origin: https://www.mezonly.site" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
# -> 204, no access-control-allow-origin header
```

The cleanest fix would be Mezon adding our origins to the gateway allowlist, but we do not
control `gw.mezon.ai`. So we proxy it through a host we **do** control and inject the CORS
headers ourselves.

## Solution overview

```
browser (www.mezonly.site)
  └─ mezon-light-sdk, gateway_url = https://gw.mezonly.site   (NEXT_PUBLIC_MEZON_GATEWAY_URL)
       └─ nginx on the VPS (gw.mezonly.site)  ── adds CORS headers, proxies ──▶ https://gw.mezon.ai
```

The proxy also rewrites the `api_url` / `ws_url` returned by `authenticate` from
`gw.mezon.ai` to `gw.mezonly.site`, so the SDK's **post-login** calls (e.g. `createDM`) and
the WebSocket also route back through the proxy instead of hitting `gw.mezon.ai` (which would
fail CORS again).

## Repo changes (already committed in this change)

- `apps/web/src/services/mezon-light/mezon-light.client.ts` — reads
  `NEXT_PUBLIC_MEZON_GATEWAY_URL` and passes it as the SDK `gateway_url` (falls back to the
  SDK default when unset).
- `apps/web/.env.production` and `apps/web/vercel.json` — set
  `NEXT_PUBLIC_MEZON_GATEWAY_URL=https://gw.mezonly.site`.
- `deploy/nginx-gw.mezonly.site.conf` — the reverse proxy + CORS injection + WS + rewrite.
- `deploy/nginx-gw.mezonly.site.phase1-http.conf` — HTTP-only bootstrap for the TLS cert.

## VPS runbook (run on 165.22.251.164, host nginx + certbot webroot)

1. **DNS** — add an `A` record `gw.mezonly.site` → `165.22.251.164`. Confirm:
   ```bash
   dig +short gw.mezonly.site        # should print 165.22.251.164
   ```

2. **Issue the TLS cert** (HTTP-only first so certbot can solve the challenge):
   ```bash
   cp deploy/nginx-gw.mezonly.site.phase1-http.conf /etc/nginx/sites-available/gw.mezonly.site.conf
   ln -sf /etc/nginx/sites-available/gw.mezonly.site.conf /etc/nginx/sites-enabled/gw.mezonly.site.conf
   nginx -t && systemctl reload nginx
   certbot certonly --webroot -w /var/www/certbot -d gw.mezonly.site
   ```

3. **Switch to the full HTTPS proxy:**
   ```bash
   cp deploy/nginx-gw.mezonly.site.conf /etc/nginx/sites-available/gw.mezonly.site.conf
   nginx -t && systemctl reload nginx
   ```

4. **Verify CORS** (now the preflight must echo the origin):
   ```bash
   curl -s -D - -o /dev/null -X OPTIONS \
     "https://gw.mezonly.site/v2/account/authenticate/idtoken" \
     -H "Origin: https://www.mezonly.site" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: authorization,content-type"
   # expect: 204 + access-control-allow-origin: https://www.mezonly.site
   ```

5. **Verify pass-through** (should mirror gw.mezon.ai's error shape, proving the proxy works):
   ```bash
   curl -s -X POST "https://gw.mezonly.site/v2/account/authenticate/idtoken" \
     -H "Content-Type: application/json" -d '{}'
   # expect: {"code":16,"message":"Server key required"}
   ```

6. **Deploy the frontend** (Vercel) so it picks up `NEXT_PUBLIC_MEZON_GATEWAY_URL`, then log
   in from https://www.mezonly.site. Login should succeed with no CORS error.

## IMPORTANT: verify api_url / ws_url after the first real login

The proxy rewrites `gw.mezon.ai` → `gw.mezonly.site` in JSON, which assumes the gateway
returns `api_url`/`ws_url` on the `gw.mezon.ai` host. After a successful login, confirm:

- DevTools → Application → Session Storage → key `mezon-light-session` → inspect `api_url`
  and `ws_url`.
- Send a DM (exercises `createDM` over `api_url` and the socket over `ws_url`).

If `api_url`/`ws_url` use a **different** host (e.g. `api.mezon.ai`), then:
1. add a `sub_filter "<that-host>" "gw.mezonly.site";` line, **and**
2. make sure that host is reachable by the proxy — since the proxy only forwards to
   `gw.mezon.ai`, a different upstream host needs its own `proxy_pass` target (a second
   subdomain/proxy). Update `deploy/nginx-gw.mezonly.site.conf` accordingly.

## Allowed origins

Configured in the `map $http_origin $gw_cors_origin` block of the nginx config:
`https://mezonly.site`, `https://www.mezonly.site`, `https://mezon-tutors.vercel.app`,
`http://localhost:3000`. Add/remove origins there as needed.
