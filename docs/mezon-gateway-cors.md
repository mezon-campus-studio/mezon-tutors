# Mezon Gateway CORS Proxy

## Problem

Browser login from `https://www.mezonly.com` can fail when `mezon-light-sdk` calls
`https://gw.mezon.ai/v2/account/authenticate/idtoken` directly from the browser. The
upstream gateway does not return `Access-Control-Allow-Origin` for our frontend origin.

The fix is to proxy Mezon gateway traffic through a domain we control:

```txt
browser (www.mezonly.com)
  -> https://gw.mezonly.com   (Cloudflare -> tunnel -> Caddy on mac-remote)
  -> https://gw.mezon.ai
```

Caddy injects CORS headers and rewrites `gw.mezon.ai` to `gw.mezonly.com` in JSON
responses so post-login API and WebSocket URLs keep routing through the proxy.

## Current Deploy

`deploy/Caddyfile`, site `http://gw.mezonly.com` (served on `127.0.0.1:8090` behind the
Cloudflare Tunnel):

- Preflight `OPTIONS` from an allowed origin (`*.mezonly.com`, `mezon-tutors-*.vercel.app`,
  `http://localhost:3000`) returns `204` with the CORS headers.
- WebSocket upgrades are proxied on a separate route without body rewriting.
- Other requests are proxied with `Host: gw.mezon.ai`, `Accept-Encoding: identity`, and the
  `replace` handler (plugin `replace-response`) swaps `gw.mezon.ai` for `gw.mezonly.com` in
  `application/json` bodies. Upstream `Access-Control-*` headers are dropped and replaced by
  ours.

DNS: `gw.mezonly.com` is a public hostname of the Cloudflare Tunnel pointing at
`http://localhost:8090`. No A record.

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

On the machine itself, without the tunnel:

```sh
curl -i -X OPTIONS -H "Host: gw.mezonly.com" -H "Origin: https://www.mezonly.com" \
  -H "Access-Control-Request-Method: POST" \
  http://127.0.0.1:8090/v2/account/authenticate/idtoken
```

After a real login, inspect session storage key `mezon-light-session` and confirm `api_url`
and `ws_url` use `gw.mezonly.com`. If Mezon returns a different upstream host, add another
`<search> <replace>` line inside the `replace` block and a matching proxy route in
`deploy/Caddyfile`.
