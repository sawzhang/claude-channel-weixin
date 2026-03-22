---
name: configure
description: "Set up the WeChat channel — run QR code login and review access policy. Use when the user asks to configure WeChat, log in to WeChat, or set up the channel."
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
---

# WeChat Channel Configuration

You are configuring the WeChat (Weixin) channel plugin for Claude Code.

## Login Flow

Follow these steps EXACTLY in order. Do NOT skip steps or combine them.

### Step 1: Get QR code

```bash
bun ${CLAUDE_SKILL_DIR}/../../bin/login.ts get-qr
```

This outputs JSON with `qrcodeId` and `qrFile`. Save the `qrcodeId` for step 3.

### Step 2: Display QR code

Read the QR code file with the Read tool:

```
Read /tmp/weixin-qr.txt
```

Then display the QR code contents directly in your text response inside a code block, like:

````
请使用微信扫描以下二维码:

```
<paste the exact contents of /tmp/weixin-qr.txt here>
```

扫描后请在手机上确认连接。
````

This is critical — the QR code MUST appear in your text response (not inside a Bash tool call) so the user can see and scan it without it being collapsed.

### Step 3: Poll for confirmation

Run the poll command with the `qrcodeId` from step 1. Set a 5-minute timeout:

```bash
bun ${CLAUDE_SKILL_DIR}/../../bin/login.ts poll <qrcodeId>
```

This command blocks until the user confirms, the QR expires, or timeout. It outputs JSON status lines.

Interpret the final output:
- `{"status":"confirmed","accountId":"...","userId":"..."}` → Success! Tell the user: "连接成功！请重启 Claude Code。"
- `{"status":"expired"}` → QR expired. Go back to Step 1 to get a new QR code. Max 3 retries.
- `{"status":"timeout"}` → Tell the user to re-run `/weixin:configure`.
- `{"status":"scaned"}` → User scanned but hasn't confirmed yet. This is an intermediate status, the command continues polling.

### Step 4: Confirm success

After confirmed status, tell the user:
- 连接成功
- 账号 ID 和用户 ID (from the confirmed output)
- 下一步: 重启 Claude Code 以启动消息轮询

## Status Check

When the user asks about status (not login):
- Read `~/.claude/channels/weixin/account.json` — show if logged in, account ID
- Read `~/.claude/channels/weixin/access.json` — show DM policy, allowed users count
