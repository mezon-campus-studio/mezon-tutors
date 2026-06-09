# Mezon Gateway CORS Proxy

## Problem

Browser login from `https://www.mezonly.com` can fail when `mezon-light-sdk` calls
`https://gw.mezon.ai/v2/account/authenticate/idtoken` directly from the browser. The
upstream gateway does not return `Access-Control-Allow-Origin` for our frontend origin.

The fix is to proxy Mezon gateway traffic through a domain we control:

```txt
browser (www.mezonly.com)
  -> https://gw.mezonly.com
  -> https://gw.mezon.ai
```

The nginx proxy injects CORS headers and rewrites `gw.mezon.ai` to `gw.mezonly.com` in JSON
responses so post-login API and WebSocket URLs keep routing through the proxy.

## Current Docker Deploy

The current VPS deployment uses the combined Docker nginx config:

- `deploy/nginx-mezonly.com.conf`
- `deploy/nginx-mezonly.com.phase1-http.conf`
- `docker-compose.api.prod.yml`

The full VPS runbook is in `docs/api-docker-vps-deploy.md`.

Required DNS:

```txt
api.mezonly.com  A  167.233.106.79
gw.mezonly.com   A  167.233.106.79
```

Frontend production env should include:

```env
NEXT_PUBLIC_API_ENDPOINT=https://api.mezonly.com/api
NEXT_PUBLIC_MEZON_GATEWAY_URL=https://gw.mezonly.com
NEXT_PUBLIC_SITE_URL=https://www.mezonly.com
```

## Verify

```sh
curl -i -X OPTIONS "https://gw.mezonly.com/v2/account/authenticate/idtoken" \
  -H "Origin: https://www.mezonly.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

Expected: `204` and `access-control-allow-origin: https://www.mezonly.com`.

After a real login, inspect session storage key `mezon-light-session` and confirm `api_url`
and `ws_url` use `gw.mezonly.com`. If Mezon returns a different upstream host, add another
`sub_filter` and matching proxy route in `deploy/nginx-mezonly.com.conf`.
