# Deploy Mezon Tutors (tóm tắt)

## Kiến trúc

```text
Vercel (frontend www)
Cloudflare edge ──► Cloudflare Tunnel ──► mac-remote
  api.mezonly.com                        Caddy 127.0.0.1:8090
  gw.mezonly.com                           ├─ api.* → NestJS :4000 → PostgreSQL 17 :5432
                                           └─ gw.*  → https://gw.mezon.ai (CORS + rewrite JSON)
```

- **mac-remote:** MacBook Pro Intel, macOS 13, không Docker. API + Postgres + Caddy + cloudflared chạy native bằng LaunchDaemon (tự lên khi boot, không cần đăng nhập).
- **Cloudflare:** DNS của `mezonly.com`, TLS, và tunnel tới máy. Không có certbot.
- **Vercel:** Next.js frontend (auto deploy khi push `main`).

Thiết kế chi tiết: `docs/superpowers/specs/2026-10-13-mac-remote-migration-design.md`.

---

## Thư mục trên mac-remote

| Đường dẫn | Nội dung |
|---|---|
| `~/mezon-tutors/releases/<time>-<sha>/app` | mỗi release: source đã prune + `node_modules` + `dist` |
| `~/mezon-tutors/current` | symlink tới release đang chạy |
| `~/mezon-tutors/shared/.env.production` | env runtime (copy từ máy local mỗi lần deploy) |
| `~/mezon-tutors/bin/` | `run-api.sh`, `db-env.sh`, `backup-db.sh` |
| `~/mezon-tutors/tools/` | `node/` (Node 22), `caddy` |
| `~/mezon-tutors/deploy/Caddyfile` | cấu hình Caddy |
| `~/mezon-tutors-data/pg17` | PGDATA |
| `~/mezon-tutors-data/backups` | dump hằng ngày (7 ngày) + `backup.log` |
| `~/mezon-tutors-data/logs` | `api.log`, `postgres.log`, `caddy.log` |

LaunchDaemon: `com.mezonly.postgres`, `com.mezonly.api`, `com.mezonly.caddy`, `com.mezonly.backup` (01:00 giờ máy), `com.cloudflare.cloudflared`.

```sh
sudo launchctl print system/com.mezonly.api | head -20     # trạng thái
sudo launchctl kickstart -k system/com.mezonly.api          # restart
tail -f ~/mezon-tutors-data/logs/api.log
```

---

## Trước khi deploy

### File cần chuẩn bị (máy local)

| File | Ghi chú |
|------|---------|
| `.env.production` | Root repo, **không commit git** |
| `deploy/Caddyfile` | Sửa nếu đổi domain hoặc origin CORS |

Biến bắt buộc trong `.env.production`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<password>
POSTGRES_DB=mezon-tutors
DATABASE_URL=postgresql://postgres:<password>@127.0.0.1:5432/mezon-tutors?schema=public

NODE_ENV=production
PORT=4000
CORS_DELEGATE_TO_PROXY=true
FRONTEND_URL=https://www.<domain>
PUBLIC_API_URL=https://api.<domain>
REDIRECT_URI=https://api.<domain>/api/auth/mezon/callback

JWT_SECRET=<random>
MEZON_OAUTH_URL=...
CLIENT_ID=...
CLIENT_SECRET=...
BOT_ID=...
BOT_TOKEN=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
CLOUDINARY_*=...
VNPAY_*=...
SEPAY_*=...
```

Danh sách đầy đủ: `apps/api/src/shared/services/app-config.service.ts`. `CORS_DELEGATE_TO_PROXY=true` vì Caddy xử lý CORS.

`APP_ROLE`: để trống hoặc `all` trên prod. Khi dựng máy mới song song với prod đang chạy, đặt `APP_ROLE=web` để tắt cron và bot Mezon (tránh chạy trùng trên cùng `BOT_TOKEN`), đổi lại `all` lúc cắt chuyển.

**Frontend (Vercel):**

```env
NEXT_PUBLIC_API_ENDPOINT=https://api.<domain>/api
NEXT_PUBLIC_MEZON_GATEWAY_URL=https://gw.<domain>
NEXT_PUBLIC_SITE_URL=https://www.<domain>
```

### Máy đích

- SSH alias `mac-remote` (qua Cloudflare Access), user `macbook` có sudo không cần mật khẩu. Kết nối qua Access thỉnh thoảng bị reset; các script tự thử lại tối đa 5 lần khi ssh thoát mã 255, nên cứ để chạy tiếp.
- Cloudflare: zone `mezonly.com` đã Active, tunnel đã tạo trong Zero Trust (lấy token). Chỉ copy chuỗi token từ lệnh dashboard gợi ý, **không chạy lệnh `cloudflared service install` đó trên máy local**: máy local sẽ thành connector thứ hai của tunnel và nhận một nửa traffic rồi trả 502. Tab Connectors của tunnel phải chỉ có đúng một dòng (mac-remote). Lỡ cài thì `sudo cloudflared service uninstall` trên máy local.

---

## Deploy lần đầu

```sh
CLOUDFLARE_TUNNEL_TOKEN=<token> ./scripts/bootstrap-mac-remote.sh
./scripts/fetch-db-backup.sh                      # tải dump mới nhất từ Cloudinary
DUMP=~/mezon-tutors-backups/mezon-<ngày>.dump ./scripts/restore-db-mac.sh
./scripts/deploy-api-mac-ssh.sh
```

Bootstrap (idempotent): cài Node 22, Postgres.app (PG17), Caddy, cloudflared → `initdb` + tạo DB → cài LaunchDaemon → `pmset` chống sleep → cài service cloudflared nếu có token. Chạy lại bất cứ lúc nào để cập nhật daemon/Caddyfile/token.

Thứ tự bắt buộc: **restore trước, deploy sau**, để `prisma migrate deploy` thấy `_prisma_migrations` của bản dump.

Sau đó trên Cloudflare dashboard, thêm public hostname vào tunnel: `api.mezonly.com` và `gw.mezonly.com` → `HTTP` `localhost:8090`.

---

## Redeploy API

```sh
./scripts/deploy-api-mac-ssh.sh            # deploy HEAD
REF=v1.2.3 ./scripts/deploy-api-mac-ssh.sh # deploy tag/commit khác
```

Script: đồng bộ env + Caddyfile + helper → `git archive` đẩy source → trên máy `turbo prune` → `yarn install` → build api → trỏ `current` → restart daemon api (`run-api.sh` chạy `prisma migrate deploy` rồi start) → chờ `/api/health`. Giữ 3 release gần nhất. Caddy chỉ restart khi Caddyfile đổi.

Rollback:

```sh
ssh mac-remote 'ls -1t ~/mezon-tutors/releases'
ssh mac-remote 'ln -sfn ~/mezon-tutors/releases/<release-cũ>/app ~/mezon-tutors/current && sudo launchctl kickstart -k system/com.mezonly.api'
```

---

## Kiểm tra

```sh
curl -i https://api.<domain>/api/health

curl -i -X OPTIONS "https://api.<domain>/api/health" \
  -H "Origin: https://www.<domain>" \
  -H "Access-Control-Request-Method: GET"

curl -i -X OPTIONS "https://gw.<domain>/v2/account/authenticate/idtoken" \
  -H "Origin: https://www.<domain>" \
  -H "Access-Control-Request-Method: POST"
```

Kỳ vọng: `200` (health), `204` + header CORS đúng origin (2 request còn lại).

Kiểm tra ngay trên máy, không qua tunnel:

```sh
ssh mac-remote 'curl -si -H "Host: api.mezonly.com" http://127.0.0.1:8090/api/health | head -1'
```

---

## Backup DB (bắt buộc — có wallet/balance)

Daemon `com.mezonly.backup` chạy `~/mezon-tutors/bin/backup-db.sh` lúc 01:00 giờ máy: `pg_dump -Fc` → upload Cloudinary `mezon-tutor/backup/mezon-YYYYMMDD.dump` (type authenticated) → giữ 7 ngày local và trên Cloudinary.

```sh
ssh mac-remote '~/mezon-tutors/bin/backup-db.sh'            # chạy tay
ssh mac-remote 'tail -n 5 ~/mezon-tutors-data/backups/backup.log'
./scripts/fetch-db-backup.sh [mezon-YYYYMMDD.dump]           # tải về máy local
```

Chạy backup tay trước mỗi redeploy có migration.

---

## Restore DB

```sh
DUMP=~/mezon-tutors-backups/mezon-<ngày>.dump ./scripts/restore-db-mac.sh
```

Script stop api → `pg_restore --clean` → in số dòng `users`/`tutor_profiles`/`transactions`/migrations → start api → chờ healthy.

---

## Hiệu năng & chịu tải

- Listing tutor phân trang/sort/lọc ở SQL, có index `verification_status + subject / country / rating`.
- Throttle 300 req/phút/IP cho ẩn danh; webhook thanh toán (`/api/webhook/*`) miễn throttle. IP thật lấy từ `CF-Connecting-IP` qua Caddy (`X-Forwarded-For`).
- gzip bật ở Caddy; Cloudflare nén thêm ở edge.
- Không có micro-cache. Nếu cần cache edge Cloudflare, lưu ý header `Access-Control-Allow-Origin` phản chiếu theo origin sẽ bị cache theo.
- `APP_ROLE` (`all` / `web` / `worker`) vẫn hỗ trợ nếu muốn tách process; hiện chạy `all` trong một daemon.

---

## Vận hành máy

- `pmset`: không sleep khi cắm điện, gập nắp vẫn chạy, tự bật lại sau mất điện. Máy phải luôn cắm sạc và có mạng.
- Reboot: `ssh mac-remote 'sudo reboot'`, sau ~2 phút mọi daemon tự lên. Kiểm tra bằng health. Đường SSH (Cloudflare Access → Remote Login cổng 22) cũng là LaunchDaemon hệ thống (`local.mac-demo.access-tunnel`), nên không cần Automatic login; giữ FileVault tắt để máy boot không chờ mật khẩu.
- TLS: Cloudflare quản lý, không cần gia hạn.
- Log Caddy/API/Postgres trong `~/mezon-tutors-data/logs`.

---

## Chuyển sang máy khác (migrate)

1. Chuẩn bị máy mới: macOS, SSH, sudo không mật khẩu, alias trong `~/.ssh/config`. Đặt `REMOTE=<alias>` (và `REMOTE_USER`, `REMOTE_HOME` nếu khác `macbook`).
2. Trên máy cũ: `~/mezon-tutors/bin/backup-db.sh` (dump tươi lên Cloudinary), rồi `sudo launchctl bootout system/com.mezonly.api`.
3. `./scripts/fetch-db-backup.sh` → `DUMP=… ./scripts/restore-db-mac.sh` → `./scripts/deploy-api-mac-ssh.sh` với `REMOTE` mới, `CLOUDFLARE_TUNNEL_TOKEN` của tunnel mới khi bootstrap.
4. Dashboard Cloudflare: chuyển public hostname `api`/`gw` sang tunnel mới.

Checklist:

- [ ] `.env.production` đúng (`DATABASE_URL` localhost)
- [ ] Restore trước deploy; đối chiếu số dòng `users` / `transactions`
- [ ] Health + preflight CORS qua internet OK
- [ ] Backup thử một lần thấy file trên Cloudinary
- [ ] Reboot thử

---

## File tham khảo

| File | Mục đích |
|------|----------|
| `scripts/bootstrap-mac-remote.sh` | Cài đặt máy đích lần đầu / cập nhật daemon |
| `scripts/deploy-api-mac-ssh.sh` | Redeploy |
| `scripts/restore-db-mac.sh` | Nạp dump vào máy đích |
| `scripts/fetch-db-backup.sh` | Tải dump từ Cloudinary |
| `scripts/backup-db-mac.sh` | Backup hằng ngày (chạy trên máy đích) |
| `deploy/Caddyfile` | Proxy api + gw, CORS |
| `deploy/mac/` | `run-api.sh`, `db-env.sh`, LaunchDaemon plist |
| `docs/mezon-gateway-cors.md` | Mezon gateway proxy |
