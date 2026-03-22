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

IMPORTANT: Follow these steps EXACTLY. Do NOT improvise with curl, python, or other methods.

## Step 1: Get QR code

Run this EXACT command (do not modify it):

```bash
cd ${CLAUDE_SKILL_DIR}/../.. && bun bin/login.ts get-qr
```

Parse the JSON output to get `qrcodeId` and `qrFile`.

## Step 2: Display QR code in your response

Use the Read tool to read the file path from `qrFile` (should be `/tmp/weixin-qr.txt`).

Then include the ENTIRE file contents in your text response inside a code block. This is how the user will see and scan the QR code — it MUST be in your text response, NOT inside a Bash call.

Example format:
````
请使用微信扫描以下二维码:

```
▄▄▄▄▄▄▄...
█ ▄▄▄ █...
(full QR code here)
```

扫码后请在手机上确认。
````

## Step 3: Poll for confirmation

Run this EXACT command (replace QRCODE_ID with the actual qrcodeId from step 1):

```bash
cd ${CLAUDE_SKILL_DIR}/../.. && bun bin/login.ts poll QRCODE_ID
```

This blocks for up to 5 minutes. Handle the result:

- Output contains `"confirmed"` → Login successful! Tell user to restart Claude Code.
- Output contains `"expired"` → Go back to Step 1 (max 3 retries).
- Output contains `"timeout"` → Tell user to retry `/weixin:configure`.
- Output contains `"scaned"` lines followed by `"confirmed"` → Same as confirmed.

## Status Check (when user asks about status, not login)

Read `~/.claude/channels/weixin/account.json` and `~/.claude/channels/weixin/access.json` to show current state.
