# Chuyển prod API từ VPS LANIT sang `mac-remote` — thiết kế

Ngày: 2026-10-13. Trạng thái: đã duyệt trong chat, đang thực thi.

## Bối cảnh và mục tiêu

- Gói VPS LANIT (`103.146.22.207`) sẽ bị huỷ. Prod API, Postgres và proxy Mezon gateway phải chuyển sang máy `mac-remote`.
- `mac-remote` = MacBook Pro 2017 Intel i7, 16 GB RAM, ~820 GB trống, macOS 13.7.8 (bản macOS cuối cùng máy này chạy được). Nằm trong mạng nhà sau NAT, IP động, đã có Cloudflare Tunnel cho các app khác. Không có Docker, Homebrew, Node. `sudo` không cần mật khẩu (đã cấp 2026-10-13).
- Docker Desktop hiện yêu cầu macOS 14+, Homebrew đã hạ Intel xuống Tier 3, nên **không dùng Docker**. Chạy native.
- Domain `mezonly.com` chuyển nameserver từ tenten.vn sang Cloudflare (Free) để dùng Cloudflare Tunnel. TLS do Cloudflare lo.
- Dữ liệu: dump mới nhất trên Cloudinary (`mezon-tutor/backup/mezon-YYYYMMDD.dump`, mỗi đêm 01:00 VN). Lúc cắt chuyển sẽ dump tươi từ LANIT qua mạng khác (4G) để không mất giao dịch.
- Không đổi domain, OAuth `REDIRECT_URI`, env Vercel.

Thành công = `https://api.mezonly.com/api/health` 200 và login Mezon qua `gw.mezonly.com` chạy từ `mac-remote`, dữ liệu khớp LANIT tại thời điểm cắt, máy reboot tự lên không cần đăng nhập, backup đêm vẫn lên Cloudinary.

## Kiến trúc

```
Vercel (www)  →  Cloudflare edge  →  Cloudflare Tunnel  →  mac-remote
                 api.mezonly.com                           Caddy 127.0.0.1:8090
                 gw.mezonly.com                             ├─ Host api.* → NestJS 127.0.0.1:4000 → PostgreSQL 17 127.0.0.1:5432
                                                            └─ Host gw.*  → https://gw.mezon.ai (CORS + rewrite JSON)
```

Caddy thay nginx với đúng ngữ nghĩa đang có:

- Origin được phép: regex `^https://([a-z0-9-]+\.)*mezonly\.com$`, `^https://mezon-tutors(-[a-z0-9-]+)?\.vercel\.app$`, và `http://localhost:3000`. Preflight `OPTIONS` trả 204 kèm header CORS, `Cache-Control: no-store`, `Vary: Origin`.
- Xoá mọi `Access-Control-*` từ upstream, thêm lại `Allow-Origin` phản chiếu + `Allow-Credentials: true` + `Vary: Origin`. API giữ `CORS_DELEGATE_TO_PROXY=true`, không đổi code.
- `gw.*`: proxy sang `https://gw.mezon.ai`, `Host: gw.mezon.ai`, WebSocket đi qua, không timeout stream, `Accept-Encoding: identity` lên upstream, và thay `gw.mezon.ai` → `gw.mezonly.com` trong body JSON (plugin `replace-response`). Thêm `Access-Control-Expose-Headers: Content-Length, Content-Range`.
- Body tối đa 25 MB, gzip bật.
- IP thật: cloudflared gửi `CF-Connecting-IP`; Caddy đặt `X-Forwarded-For` và `X-Real-IP` bằng giá trị đó rồi mới proxy. API đã có `app.set('trust proxy', 1)` nên throttle theo IP và IP gửi VNPay vẫn đúng.
- Không có micro-cache. Cache edge Cloudflare để ngoài phạm vi (nó cache luôn header `Access-Control-Allow-Origin` phản chiếu theo origin, phải cân nhắc riêng).

## Thành phần trên `mac-remote`

Thư mục:

| Đường dẫn | Nội dung |
|---|---|
| `/Users/macbook/mezon-tutors/releases/<time>-<sha>/` | mỗi release: source đã prune, `node_modules`, `dist` |
| `/Users/macbook/mezon-tutors/current` | symlink tới release đang chạy |
| `/Users/macbook/mezon-tutors/shared/.env.production` | env runtime, copy từ máy local |
| `/Users/macbook/mezon-tutors/bin/` | `run-api.sh`, `backup-db.sh` |
| `/Users/macbook/mezon-tutors/tools/node`, `tools/caddy` | Node 22 (tarball nodejs.org darwin-x64), Caddy (build darwin/amd64 có `replace-response`) |
| `/Users/macbook/mezon-tutors/deploy/Caddyfile` | cấu hình Caddy, copy từ repo |
| `/Users/macbook/mezon-tutors-data/pg17` | PGDATA, `listen_addresses='localhost'`, port 5432 |
| `/Users/macbook/mezon-tutors-data/backups` | dump hằng ngày, giữ 7 ngày |
| `/Users/macbook/mezon-tutors-data/logs` | stdout/stderr các daemon |
| `/Applications/Postgres.app` | PostgreSQL 17 (Postgres.app 2.9.6, hỗ trợ macOS 10.15+) |
| `/usr/local/bin/cloudflared` | cloudflared darwin-amd64 |

LaunchDaemon (`/Library/LaunchDaemons`, chạy từ lúc boot, không cần đăng nhập, `KeepAlive` tự restart):

| Label | Lệnh | Ghi chú |
|---|---|---|
| `com.mezonly.postgres` | `postgres -D …/pg17` | `UserName macbook` |
| `com.mezonly.api` | `bin/run-api.sh` | nạp `shared/.env.production`, chờ `pg_isready`, `prisma migrate deploy` trong `packages/db`, `exec node apps/api/dist/main.js` trong `current` |
| `com.mezonly.caddy` | `tools/caddy run --config deploy/Caddyfile` | bind `127.0.0.1:8090` |
| `com.cloudflare.cloudflared` | do `sudo cloudflared service install <TOKEN>` tạo | tunnel quản lý trên dashboard |
| `com.mezonly.backup` | `bin/backup-db.sh` | `StartCalendarInterval` 01:00 giờ máy (+07) |

Power: `pmset -c sleep 0`, `pmset -a disablesleep 1 autorestart 1 womp 1`. Không phụ thuộc `caffeinate` của app khác.

## Quy trình deploy

Script chạy từ máy local, build trên `mac-remote` (Intel, không giả lập amd64):

1. `git archive <ref>` (mặc định `HEAD`) đẩy qua SSH vào `releases/<time>-<sha>/src`. Không cần cấp GitHub credential cho máy đó; luôn deploy đúng commit.
2. `scp .env.production` → `shared/.env.production`, `scp deploy/Caddyfile` → `deploy/Caddyfile` (reload Caddy nếu đổi).
3. Trên máy, mô phỏng đúng Dockerfile: `turbo prune @mezon-tutors/api --docker` → copy `full/` + `tsconfig.base.json` vào release → stub `scripts/postinstall.js` → `packages/db/.env` dummy → `yarn install` (`YARN_ENABLE_IMMUTABLE_INSTALLS=false`) → `turbo run build --filter=@mezon-tutors/api` với `NODE_OPTIONS=--max-old-space-size=2048`.
4. Trỏ `current` → release mới, `launchctl kickstart -k system/com.mezonly.api`. `run-api.sh` chạy migrate rồi start. Chờ `http://127.0.0.1:4000/api/health` 200 (tối đa ~3 phút), nếu không thì in log và thoát lỗi.
5. Giữ 3 release gần nhất. Rollback: trỏ lại symlink + kickstart.

## Script và file mới

| File | Mục đích |
|---|---|
| `deploy/Caddyfile` | cấu hình Caddy |
| `deploy/mac/run-api.sh` | wrapper chạy API (cài vào `bin/`) |
| `deploy/mac/com.mezonly.*.plist` | 4 LaunchDaemon, placeholder `__HOME__` thay lúc bootstrap |
| `scripts/bootstrap-mac-remote.sh` | cài Node/Postgres.app/Caddy/cloudflared, initdb, tạo DB, cài daemon, pmset; idempotent; nếu có `CLOUDFLARE_TUNNEL_TOKEN` thì cài service cloudflared; cuối cùng gọi deploy |
| `scripts/deploy-api-mac-ssh.sh` | redeploy như trên |
| `scripts/restore-db-mac.sh` | stop api → `pg_restore --clean --if-exists --no-owner --no-acl` → đếm `users`/`tutor_profiles`/`transactions`/migrations → start api → chờ healthy |
| `scripts/fetch-db-backup.sh` | tải dump từ Cloudinary bằng signed URL (`sha1(public_id + api_secret)` → base64 url-safe 8 ký tự), mặc định dump mới nhất |
| `scripts/backup-db-mac.sh` | chạy trên Mac: `pg_dump -Fc` → upload Cloudinary `mezon-tutor/backup` (`type=authenticated`) → xoá local >7 ngày → xoá bản Cloudinary ngày thứ 8 |

Các biến chung: `REMOTE=mac-remote`, `REMOTE_HOME=/Users/macbook`, `APP_DIR=$REMOTE_HOME/mezon-tutors`, `DATA_DIR=$REMOTE_HOME/mezon-tutors-data`.

`.env.production` (local, không commit): `DATABASE_URL` → `postgresql://postgres:<pw>@127.0.0.1:5432/mezon-tutors?schema=public`. Các biến còn lại giữ nguyên.

Script và doc VPS cũ (`bootstrap-api-vps-docker-ssh.sh`, `deploy-api-docker-ssh.sh`, `restore-db-vps.sh`, `setup-db-backup-ssh.sh`, `backup-db-vps.sh`, `docker-compose.api.prod.yml`, `deploy/nginx-*.conf`, `docs/api-docker-vps-deploy.md`) **giữ nguyên** tới khi LANIT tắt hẳn, xoá ở commit sau.

Docs: `docs/DEPLOY.md` viết lại cho mô hình mới; `docs/mezon-gateway-cors.md` cập nhật phần proxy.

## Cloudflare (người dùng làm trên dashboard)

1. Add site `mezonly.com` (Free). Kiểm tra record import: `www` → Vercel giữ **DNS only**, MX/TXT nếu có. `api`/`gw` tạm giữ A → `103.146.22.207` DNS only.
2. Đổi NS ở tenten.vn sang 2 NS Cloudflare cấp. Chờ "Active".
3. SSL/TLS mode: Full (strict). WebSockets: bật (mặc định).
4. Zero Trust → Networks → Tunnels → Create tunnel (Cloudflared) tên `mezonly-mac`. Lấy token, đưa cho bootstrap qua `CLOUDFLARE_TUNNEL_TOKEN`.
5. Public hostnames của tunnel: trước cắt dùng `api-mac.mezonly.com` và `gw-mac.mezonly.com` → `HTTP` `localhost:8090`. Lúc cắt: xoá A record `api`/`gw`, thêm `api.mezonly.com` và `gw.mezonly.com` → `localhost:8090`.

## Trong lúc chờ cắt (hai instance cùng tồn tại)

- API trên `mac-remote` chạy với `APP_ROLE=web` trong `.env.production`: HTTP vẫn phục vụ để test, nhưng cron settlement/email và bot Mezon **tắt**, tránh chạy trùng với LANIT trên cùng `BOT_TOKEN` và gửi thông báo từ dữ liệu cũ. Lúc cắt đổi về `APP_ROLE=all` (hoặc xoá dòng) rồi deploy lại.
- Daemon backup trên Mac vẫn chạy 01:00, upload bản sao cũ với tên theo ngày của Mac. Vô hại: LANIT ghi đè cùng tên vào đêm sau.
- SSH tới `mac-remote` đi qua cloudflared của MacDemoServer, chạy bằng LaunchDaemon hệ thống `local.mac-demo.access-tunnel` (UserName `macbook`, RunAtLoad, KeepAlive) tới Remote Login cổng 22 của macOS. Sau reboot SSH tự lên cùng stack, không cần Automatic login; FileVault đang tắt nên máy boot không chờ mật khẩu.

## Runbook cắt chuyển

1. NS đã về Cloudflare, dịch vụ vẫn chạy ở LANIT.
2. `CLOUDFLARE_TUNNEL_TOKEN=… ./scripts/bootstrap-mac-remote.sh` rồi `DUMP=… ./scripts/restore-db-mac.sh` với dump đêm gần nhất. Kiểm tra qua hostname thử: health 200, OPTIONS CORS 204 đúng origin, gw OPTIONS 204, body gw đã rewrite. `sudo reboot` máy, xác nhận tự lên.
3. Giờ cắt, người dùng trên 4G: `docker compose -f /root/mezon-tutors/docker-compose.api.prod.yml stop api` rồi `/root/backup-db.sh` trên LANIT.
4. Từ máy local: `./scripts/fetch-db-backup.sh` → `DUMP=<file> ./scripts/restore-db-mac.sh`. Đối chiếu số dòng với LANIT, xem log migrate.
5. Đổi `APP_ROLE=all` trong `.env.production`, `./scripts/deploy-api-mac-ssh.sh` (hoặc chỉ scp env + restart daemon api). Log phải có `[MezonBot] Connected to Mezon gateway`.
6. Dashboard: xoá A `api`/`gw`, thêm public hostname `api.mezonly.com`, `gw.mezonly.com` vào tunnel.
7. Kiểm tra lại health, CORS, login Mezon thật, một webhook thử. Chạy `bin/backup-db.sh` một lần, thấy file trên Cloudinary.
8. LANIT để tắt api, huỷ gói sau. Commit xoá script/doc VPS cũ.

## Kiểm thử

- `bash -n` và `shellcheck` cho mọi script mới; `caddy validate` cho Caddyfile.
- Trên `mac-remote` trước khi gắn tunnel: `curl -H 'Host: api.mezonly.com' http://127.0.0.1:8090/api/health`, preflight với `Origin: https://www.mezonly.com`, `Origin: https://mezon-tutors-abc.vercel.app`, và origin lạ (không có ACAO).
- `curl -H 'Host: gw.mezonly.com' -X OPTIONS …/v2/account/authenticate/idtoken` → 204.
- Restore dump 2026-10-12: số migration applied = 64, `_prisma_migrations` không có dòng treo, API start không lỗi migrate.
- Reboot test và backup test như runbook.

## Rủi ro còn lại

- Máy ở nhà: mất điện lâu hơn pin, rớt mạng, bị tắt tay → downtime. LaunchDaemon chỉ xử lý reboot.
- Mezon gateway trả host khác `gw.mezon.ai` → thêm rule rewrite trong Caddyfile.
- API bind mọi interface cổng 4000, lộ trong LAN nhà. Chấp nhận, hoặc bật firewall macOS sau.
- File migration `20260716070725_simplify_event_content` trong repo có checksum khác bản prod đã apply; deploy `add_hidden_type` ngày 2026-10-09 vẫn thành công nên `migrate deploy` bỏ qua, nhưng phải xem log lần start đầu sau restore.
