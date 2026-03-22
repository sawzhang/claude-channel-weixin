#!/usr/bin/env bun
/**
 * WeChat channel login script — two-phase QR code login.
 *
 * Phase 1: bun login.ts get-qr
 *   → Fetches QR code, saves ASCII art to /tmp/weixin-qr.txt
 *   → Outputs JSON: { qrcodeId, qrcodeContent, qrFile }
 *
 * Phase 2: bun login.ts poll <qrcodeId>
 *   → Polls until confirmed/expired
 *   → On confirmed: saves account.json + access.json
 *   → Outputs JSON: { status, accountId?, userId?, error? }
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import QRCode from "qrcode-terminal";

const STATE_DIR = join(homedir(), ".claude", "channels", "weixin");
const ACCOUNT_FILE = join(STATE_DIR, "account.json");
const ACCESS_FILE = join(STATE_DIR, "access.json");
const API_BASE = "https://ilinkai.weixin.qq.com";
const QR_FILE = "/tmp/weixin-qr.txt";

async function apiFetch(path: string, opts?: RequestInit) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json() as Promise<any>;
}

function generateQRToString(content: string): Promise<string> {
  return new Promise((resolve) => {
    QRCode.generate(content, { small: true }, (qr: string) => {
      resolve(qr);
    });
  });
}

// ── Phase 1: get-qr ─────────────────────────────────────────────────

async function getQR() {
  const qrRes = await apiFetch("/ilink/bot/get_bot_qrcode?bot_type=3");

  if (!qrRes.qrcode || !qrRes.qrcode_img_content) {
    console.log(JSON.stringify({ error: "获取二维码失败" }));
    process.exit(1);
  }

  const qrAscii = await generateQRToString(qrRes.qrcode_img_content);
  writeFileSync(QR_FILE, qrAscii);

  console.log(JSON.stringify({
    qrcodeId: qrRes.qrcode,
    qrcodeContent: qrRes.qrcode_img_content,
    qrFile: QR_FILE,
  }));
}

// ── Phase 2: poll ────────────────────────────────────────────────────

async function poll(qrcodeId: string) {
  const POLL_INTERVAL = 3000;
  const TIMEOUT = 5 * 60 * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    let statusRes: any;
    try {
      statusRes = await apiFetch(
        `/ilink/bot/get_qrcode_status?qrcode=${qrcodeId}`,
        { headers: { "iLink-App-ClientVersion": "1" } }
      );
    } catch (e: any) {
      continue;
    }

    const status = statusRes.status;

    if (status === "wait") continue;

    if (status === "scaned") {
      console.log(JSON.stringify({ status: "scaned" }));
      continue;
    }

    if (status === "expired") {
      console.log(JSON.stringify({ status: "expired" }));
      process.exit(0);
    }

    if (status === "confirmed") {
      const { bot_token, ilink_bot_id, baseurl, ilink_user_id } = statusRes;

      mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });

      const account = {
        token: bot_token,
        baseUrl: baseurl || API_BASE,
        accountId: ilink_bot_id,
        userId: ilink_user_id,
        savedAt: new Date().toISOString(),
      };
      writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
      chmodSync(ACCOUNT_FILE, 0o600);

      const access = {
        dmPolicy: "allowlist",
        allowFrom: [ilink_user_id],
        pending: {},
      };
      if (!existsSync(ACCESS_FILE)) {
        writeFileSync(ACCESS_FILE, JSON.stringify(access, null, 2));
        chmodSync(ACCESS_FILE, 0o600);
      }

      console.log(JSON.stringify({
        status: "confirmed",
        accountId: ilink_bot_id,
        userId: ilink_user_id,
      }));
      process.exit(0);
    }
  }

  console.log(JSON.stringify({ status: "timeout" }));
  process.exit(1);
}

// ── Entry ────────────────────────────────────────────────────────────

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "get-qr") {
  await getQR();
} else if (cmd === "poll") {
  if (!args[0]) {
    console.log(JSON.stringify({ error: "Usage: login.ts poll <qrcodeId>" }));
    process.exit(1);
  }
  await poll(args[0]);
} else {
  console.log(JSON.stringify({ error: "Usage: login.ts <get-qr|poll> [args]" }));
  process.exit(1);
}
