#!/usr/bin/env node

/**
 * Script tiện ích giúp lấy YOUTUBE_REFRESH_TOKEN cho dự án Mezon Tutors.
 *
 * Cách dùng:
 * 1. Đảm bảo GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET đã có trong apps/api/.env (hoặc truyền qua biến môi trường).
 * 2. Trên Google Cloud Console -> Credentials:
 *    Thêm Redirect URI: http://localhost:8989/oauth2callback
 * 3. Chạy lệnh:
 *    node scripts/get-youtube-refresh-token.mjs
 * 4. Mở trình duyệt đăng nhập tài khoản Google quản lý kênh YouTube.
 * 5. Script sẽ in ra YOUTUBE_REFRESH_TOKEN để bạn paste vào apps/api/.env.
 */

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  const envPath = resolve(__dirname, '../apps/api/.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const PORT = 8989;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || CLIENT_ID === 'your-google-client-id') {
  console.error('\n❌ Thiếu GOOGLE_CLIENT_ID trong apps/api/.env');
  console.error('Vui lòng điền GOOGLE_CLIENT_ID trước khi chạy script.\n');
  process.exit(1);
}

if (!CLIENT_SECRET || CLIENT_SECRET === 'your-google-client-secret') {
  console.error('\n❌ Thiếu GOOGLE_CLIENT_SECRET trong apps/api/.env');
  console.error('Vui lòng điền GOOGLE_CLIENT_SECRET trước khi chạy script.\n');
  process.exit(1);
}

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES.join(' '));
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent'); 

console.log('\n======================================================');
console.log('🔑 MEZON TUTORS - YOUTUBE REFRESH TOKEN GENERATOR');
console.log('======================================================\n');
console.log('1. Vui lòng đảm bảo bạn đã thêm Redirect URI sau vào Google Cloud Console:');
console.log(`   👉 \x1b[36m${REDIRECT_URI}\x1b[0m\n`);
console.log('2. Mở đường link sau trong trình duyệt để đăng nhập và cấp quyền:\n');
console.log(`   \x1b[34m${authUrl.toString()}\x1b[0m\n`);
console.log('Đang chờ bạn cấp quyền trên trình duyệt...\n');

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
    if (reqUrl.pathname !== '/oauth2callback') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const code = reqUrl.searchParams.get('code');
    const error = reqUrl.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>Lỗi: ${error}</h1><p>Vui lòng thử lại.</p>`);
      console.error(`\n❌ Đăng nhập thất bại: ${error}`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Thiếu mã ủy quyền (code).</h1>');
      return;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>Lỗi lấy token</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
      console.error('\n❌ Không lấy được token từ Google:', tokenData);
      server.close();
      process.exit(1);
    }

    const refreshToken = tokenData.refresh_token;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1 style="color: #16a34a;">Lấy Refresh Token thành công!</h1>
        <p>Bạn có thể đóng tab này và quay lại cửa sổ terminal.</p>
      </div>
    `);

    console.log('\n======================================================');
    console.log('THÀNH CÔNG! DƯỚI ĐÂY LÀ TOKEN CỦA BẠN:');
    console.log('======================================================\n');
    if (refreshToken) {
      console.log(`\x1b[32mYOUTUBE_REFRESH_TOKEN=${refreshToken}\x1b[0m\n`);
      console.log('👉 Hãy copy dòng trên và dán vào file \x1b[33mapps/api/.env\x1b[0m');
    } else {
      console.log('\x1b[33m⚠️ Google không trả về refresh_token mới (do tài khoản đã từng cấp quyền).\x1b[0m');
      console.log('Nếu bạn cần sinh refresh_token mới, hãy vào https://myaccount.google.com/permissions xóa quyền ứng dụng và chạy lại script.');
    }
    console.log('\n======================================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Đã xảy ra lỗi ngoài ý muốn:', err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT);
