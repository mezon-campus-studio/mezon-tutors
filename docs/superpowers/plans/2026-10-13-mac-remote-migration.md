# Chuyển prod API sang `mac-remote` — kế hoạch thực thi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prod API + Postgres + proxy Mezon gateway chạy native trên `mac-remote` sau Cloudflare Tunnel, dữ liệu khớp LANIT tại thời điểm cắt, deploy/backup bằng script như trước.

**Architecture:** Cloudflare Tunnel → Caddy (127.0.0.1:8090, thay nginx) → NestJS :4000 → PostgreSQL 17 (Postgres.app). Mọi tiến trình là LaunchDaemon. Build trên máy đích từ `git archive`, release theo thư mục + symlink `current`.

**Tech Stack:** macOS 13 Intel, Node 22.23.3 (tarball), Yarn 4.11.0 (corepack), turbo 1.13.4 prune, Postgres.app 2.9.6/PG17, Caddy 2.11 + replace-response, cloudflared 2026.10.0, launchd, Cloudinary (backup).

**Spec:** `docs/superpowers/specs/2026-10-13-mac-remote-migration-design.md`

## Global Constraints

- Không Docker, không Homebrew trên `mac-remote`.
- Script bash không có comment (quy tắc CLAUDE.md). Bash trên máy đích là 3.2: không `mapfile`, không mảng kết hợp.
- `.env.production` không commit; `DATABASE_URL` trỏ `127.0.0.1:5432`; `CORS_DELEGATE_TO_PROXY=true` giữ nguyên.
- Script/doc VPS cũ giữ nguyên tới khi LANIT tắt hẳn.
- Thư mục đích: `/Users/macbook/mezon-tutors` (app) và `/Users/macbook/mezon-tutors-data` (pgdata, backups, logs).

## Review Focus

- Giá trị env chứa `#`, `=`, `+` (ví dụ `CLIENT_SECRET`) phải được nạp nguyên văn: `run-api.sh` đọc từng dòng và `export "$key=$value"`, không `source`.
- Preflight từ origin Vercel preview `https://mezon-tutors-abc123.vercel.app` phải được 204 với ACAO phản chiếu; origin lạ không có ACAO.
- WebSocket tới `gw.mezonly.com` phải đi qua handler không có `replace` (route `@websocket` riêng).
- Sau `sudo reboot`, cả 4 daemon lên lại mà không ai đăng nhập; api chờ postgres sẵn sàng trước khi migrate.
- Restore dump khi api chưa deploy (không có `current`) phải thành công và không cố start api.

---

### Task 1: Caddyfile + file launchd + wrapper (đã viết)

**Files:** `deploy/Caddyfile`, `deploy/mac/run-api.sh`, `deploy/mac/db-env.sh`, `deploy/mac/com.mezonly.{postgres,api,caddy,backup}.plist`

- [x] Viết file.
- [x] `caddy validate --config deploy/Caddyfile --adapter caddyfile` bằng binary có `replace_response` → "Valid configuration".
- [x] `plutil -lint deploy/mac/*.plist` → OK.
- [x] `bash -n deploy/mac/run-api.sh` và `shellcheck deploy/mac/run-api.sh deploy/mac/db-env.sh` sạch.

### Task 2: Script local (đã viết)

**Files:** `scripts/bootstrap-mac-remote.sh`, `scripts/deploy-api-mac-ssh.sh`, `scripts/fetch-db-backup.sh`, `scripts/restore-db-mac.sh`, `scripts/backup-db-mac.sh`

- [x] Viết file.
- [x] `shellcheck scripts/*mac*.sh scripts/fetch-db-backup.sh` sạch (cho phép SC2029 vì cố ý expand local trong ssh).
- [x] `sed` `DATABASE_URL` trong `.env.production` sang `127.0.0.1:5432`.
- [x] Commit: `feat(deploy): native mac-remote deploy scripts, Caddyfile and launchd daemons`.

### Task 3: Bootstrap `mac-remote` (chưa có tunnel)

- [x] `./scripts/bootstrap-mac-remote.sh` → in version node/yarn/postgres/caddy/cloudflared, daemon postgres/caddy/backup `loaded`, api `not loaded`.
- [x] `ssh mac-remote 'curl -s -o /dev/null -w "%{http_code}" -H "Host: api.mezonly.com" http://127.0.0.1:8090/api/health'` → 502 (Caddy chạy, api chưa có).

### Task 4: Restore dump mới nhất rồi deploy

- [x] `./scripts/fetch-db-backup.sh` → in `DUMP=~/mezon-tutors-backups/mezon-YYYYMMDD.dump`.
- [x] `DUMP=<file> ./scripts/restore-db-mac.sh` → row counts, `applied_migrations` = 62 với dump 2026-10-12 (65 dòng, 3 dòng rolled back), "No release deployed yet".
- [x] `./scripts/deploy-api-mac-ssh.sh` → `healthy`. Xem `tail -n 40 ~/mezon-tutors-data/logs/api.log` không có lỗi migrate.
- [x] Trên máy: `curl -s -H "Host: api.mezonly.com" http://127.0.0.1:8090/api/health` → 200.
- [x] Preflight: `curl -si -X OPTIONS -H "Host: api.mezonly.com" -H "Origin: https://www.mezonly.com" -H "Access-Control-Request-Method: GET" http://127.0.0.1:8090/api/health` → 204 + `access-control-allow-origin: https://www.mezonly.com`.
- [x] Preflight origin Vercel preview → 204 có ACAO; origin `https://evil.example` → không có ACAO.
- [x] gw: `curl -si -X OPTIONS -H "Host: gw.mezonly.com" -H "Origin: https://www.mezonly.com" -H "Access-Control-Request-Method: POST" http://127.0.0.1:8090/v2/account/authenticate/idtoken` → 204.
- [ ] gw rewrite: `curl -s -H "Host: gw.mezonly.com" http://127.0.0.1:8090/v2/... ` body không còn `gw.mezon.ai` (nếu upstream trả JSON có host).
- [x] Backup thử: `ssh mac-remote '~/mezon-tutors/bin/backup-db.sh'` → dòng OK và file xuất hiện trên Cloudinary.
- [x] `APP_ROLE=web` trong `.env.production` tới khi cắt: log có `cron schedulers disabled` và `bot connection disabled` (bot Mezon từng kết nối trùng với LANIT ở lần start đầu, đã dừng).
- [x] ~~Người dùng bật Automatic login cho `macbook`~~ Không cần: access tunnel + sshd là LaunchDaemon hệ thống (`local.mac-demo.access-tunnel`, Remote Login cổng 22), FileVault tắt.
- [ ] Reboot: `ssh mac-remote 'sudo reboot'`, chờ 2 phút, lặp lại health qua Caddy → 200.

### Task 5: Docs

**Files:** `docs/DEPLOY.md` (viết lại), `docs/mezon-gateway-cors.md` (phần proxy)

- [x] Viết lại cho mô hình mac-remote: kiến trúc, bootstrap, deploy, restore, backup, cutover, rollback, kiểm tra.
- [x] Commit: `docs: deploy runbook for mac-remote`.

### Task 6: Cloudflare + tunnel (người dùng làm dashboard, tôi chạy script)

- [x] Người dùng: add site `mezonly.com`, đổi NS ở tenten.vn (`damon`/`paris.ns.cloudflare.com`), Active 2026-10-13 ~14:20. `*`/apex/`www` DNS-only; `api`/`gw` đi theo wildcard `*` → `103.146.22.207`.
- [x] Người dùng: Zero Trust → Tunnels → tạo `mezonly-mac`, lấy token.
- [x] `CLOUDFLARE_TUNNEL_TOKEN=<token> ./scripts/bootstrap-mac-remote.sh` → `cloudflared service installed`, tunnel Healthy trên dashboard (2026-10-13 13:34, 4 kết nối QUIC tới hkg).
- [x] Người dùng thêm public hostname `api-mac.mezonly.com` và `gw-mac.mezonly.com` → `HTTP://localhost:8090`.
- [x] Caddy `bind 127.0.0.1 ::1` vì cloudflared nối `localhost` có thể ra `::1`.
- [x] Gỡ connector thừa trên máy local (`sudo cloudflared service uninstall`), tab Connectors chỉ còn mac-remote.
- [x] `curl -i https://api-mac.mezonly.com/api/health` → 200 (15/15 qua cả 3 IP edge); preflight CORS qua internet → 204.

### Task 7: Cutover (runbook trong spec)

- [x] ~~Người dùng (4G): stop api + backup trên LANIT~~ Không làm được: LANIT hết hạn, không gia hạn, 22/443 không trả lời (2026-10-13 ~14:20).
- [x] `./scripts/fetch-db-backup.sh` → bản mới nhất vẫn là `mezon-20261012.dump` (tạo 01:00 VN 2026-10-13), md5 trùng bản đã restore → không restore lại. Dữ liệu sau 01:00 trên LANIT (nếu có) đã mất.
- [x] `APP_ROLE=all` trong `.env.production` → đẩy env + `kickstart` api (code không đổi nên không rebuild); log có `[MezonBot] Connected to Mezon gateway` (14:27).
- [x] Người dùng: thêm published route `api.mezonly.com`, `gw.mezonly.com` → `localhost:8090` (14:33). Record A `*` → 103.146.22.207 vẫn còn, nên xoá (IP chết).
- [x] `https://api.mezonly.com/api/health` 6/6 200; preflight api/gw 204 đúng origin; gw POST → Mezon trả 401 `Server key required` (passthrough OK); `/api/tutor-profiles/verified` 200 có dữ liệu. Backup đầu tiên từ Mac: `mezon-20261013.dump` lên Cloudinary 14:36.
- [x] Người dùng xác nhận login Mezon thật từ `www.mezonly.com` chạy đúng (2026-10-13 ~14:50). Webhook thanh toán thử: chưa.
- [ ] Ghi memory: địa chỉ mới, ngày cắt. Commit xoá script/doc VPS cũ (commit riêng, sau khi LANIT huỷ).
