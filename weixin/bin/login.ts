#!/usr/bin/env bun
/**
 * WeChat channel login script — QR code login flow.
 * Renders QR code in terminal, polls for confirmation, saves credentials.
 * Usage: bun bin/login.ts
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import QRCode from "qrcode-terminal";

const STATE_DIR = join(homedir(), ".claude", "channels", "weixin");
const ACCOUNT_FILE = join(STATE_DIR, "account.json");
const ACCESS_FILE = join(STATE_DIR, "access.json");
const API_BASE = "https://ilinkai.weixin.qq.com";

// ── Helpers ──────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[weixin] ${msg}`);
}

async function apiFetch(path: string, opts?: RequestInit) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json() as Promise<any>;
}

function renderQR(content: string): Promise<void> {
  return new Promise((resolve) => {
    QRCode.generate(content, { small: true }, (qr: string) => {
      console.log();
      console.log(qr);
      resolve();
    });
  });
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  // Check existing login
  if (existsSync(ACCOUNT_FILE)) {
    try {
      const existing = JSON.parse(readFileSync(ACCOUNT_FILE, "utf-8"));
      log(`已有登录凭证 (账号: ${existing.accountId})`);
      log("重新登录将覆盖现有凭证...");
    } catch {}
  }

  // Step 1: Get QR code
  log("正在获取二维码...");
  const qrRes = await apiFetch("/ilink/bot/get_bot_qrcode?bot_type=3");

  if (!qrRes.qrcode || !qrRes.qrcode_img_content) {
    console.error("[weixin] 获取二维码失败:", JSON.stringify(qrRes));
    process.exit(1);
  }

  const qrcodeId = qrRes.qrcode;
  const qrcodeContent = qrRes.qrcode_img_content;

  // Step 2: Render QR code in terminal
  log("请使用微信扫描以下二维码:");
  await renderQR(qrcodeContent);
  log("等待扫码...");

  // Step 3: Poll for status
  const POLL_INTERVAL = 3000;
  const TIMEOUT = 5 * 60 * 1000;
  const MAX_RETRIES = 3;
  let retries = 0;
  const startTime = Date.now();
  let scannedLogged = false;

  while (Date.now() - startTime < TIMEOUT) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    let statusRes: any;
    try {
      statusRes = await apiFetch(
        `/ilink/bot/get_qrcode_status?qrcode=${qrcodeId}`,
        { headers: { "iLink-App-ClientVersion": "1" } }
      );
    } catch (e) {
      log(`轮询出错: ${e}`);
      continue;
    }

    const status = statusRes.status;

    if (status === "wait") {
      continue;
    }

    if (status === "scaned" && !scannedLogged) {
      log("已扫码，请在手机上确认...");
      scannedLogged = true;
      continue;
    }

    if (status === "expired") {
      retries++;
      if (retries >= MAX_RETRIES) {
        log("二维码已过期且重试次数已用完，请重新运行。");
        process.exit(1);
      }
      log(`二维码已过期，正在刷新 (${retries}/${MAX_RETRIES})...`);
      const newQr = await apiFetch("/ilink/bot/get_bot_qrcode?bot_type=3");
      if (!newQr.qrcode || !newQr.qrcode_img_content) {
        log("刷新二维码失败");
        process.exit(1);
      }
      log("请重新扫描:");
      await renderQR(newQr.qrcode_img_content);
      scannedLogged = false;
      continue;
    }

    if (status === "confirmed") {
      const { bot_token, ilink_bot_id, baseurl, ilink_user_id } = statusRes;

      // Step 4: Save credentials
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

      // Initialize access control
      const access = {
        dmPolicy: "pairing",
        allowFrom: [ilink_user_id],
        pending: {},
      };
      writeFileSync(ACCESS_FILE, JSON.stringify(access, null, 2));
      chmodSync(ACCESS_FILE, 0o600);

      // Done!
      console.log();
      log("✅ 连接成功！");
      console.log();
      console.log(`  账号 ID:   ${ilink_bot_id}`);
      console.log(`  用户 ID:   ${ilink_user_id}`);
      console.log(`  状态目录:  ${STATE_DIR}`);
      console.log();
      console.log("  下一步: 重启 Claude Code 以启动消息轮询");
      console.log();
      process.exit(0);
    }
  }

  log("超时未确认，请重新运行。");
  process.exit(1);
}

main().catch((e) => {
  console.error("[weixin] 登录失败:", e.message || e);
  process.exit(1);
});
