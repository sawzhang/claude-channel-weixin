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

State directory: `~/.claude/channels/weixin/`
Account file: `~/.claude/channels/weixin/account.json`

## Login Flow

When the user asks to log in or configure WeChat:

1. Check if already logged in by reading `~/.claude/channels/weixin/account.json`
2. If already logged in, show current status and ask if they want to re-login
3. To initiate login:

```bash
# Step 1: Get QR code
curl -s 'https://ilinkai.weixin.qq.com/ilink/bot/get_bot_qrcode?bot_type=3'
```

This returns JSON with:
- `qrcode`: the QR code identifier
- `qrcode_img_content`: the content to encode as a QR code (a URL)

4. **Render the QR code in the terminal** so the user can scan it directly:

```bash
# Use npx to render QR code in terminal (no install needed)
npx -y qrcode-terminal@0.12.0 '<qrcode_img_content value>'
```

This prints a scannable QR code in the terminal. Tell the user: "请使用微信扫描上方二维码"

5. Poll for scan status in a loop (every 3 seconds, timeout after 5 minutes):

```bash
# Step 2: Poll for scan result
curl -s -H 'iLink-App-ClientVersion: 1' \
  'https://ilinkai.weixin.qq.com/ilink/bot/get_qrcode_status?qrcode=<QRCODE_ID>'
```

Status values:
- `wait`: still waiting for scan — continue polling silently
- `scaned`: user scanned — print "已扫码，请在手机上确认..." and continue polling
- `confirmed`: success! Response includes `bot_token`, `ilink_bot_id`, `baseurl`, `ilink_user_id`
- `expired`: QR code expired — regenerate by going back to step 3 (max 3 retries)

6. On `confirmed`, create the state directory and save credentials:

```bash
mkdir -p ~/.claude/channels/weixin
chmod 700 ~/.claude/channels/weixin
```

Write to `~/.claude/channels/weixin/account.json` (mode 0o600):
```json
{
  "token": "<bot_token>",
  "baseUrl": "<baseurl or https://ilinkai.weixin.qq.com>",
  "accountId": "<ilink_bot_id>",
  "userId": "<ilink_user_id>",
  "savedAt": "<ISO timestamp>"
}
```

7. Initialize access control in `~/.claude/channels/weixin/access.json`:
```json
{
  "dmPolicy": "pairing",
  "allowFrom": ["<ilink_user_id>"],
  "pending": {}
}
```

8. Print success message and tell the user to restart Claude Code:

```
连接成功！

  账号 ID: <ilink_bot_id>
  状态目录: ~/.claude/channels/weixin/

  下一步: 重启 Claude Code 以启动消息轮询
```

## Status Check

When the user asks about status:
- Read account.json — show if logged in, account ID
- Read access.json — show DM policy, number of allowed users
- Check if the channel MCP server is running

## Important

- The QR code expires in ~5 minutes, poll every 3 seconds
- The bot_token is sensitive — file must be mode 0o600
- After login, the user MUST restart Claude Code so the MCP server picks up the new credentials
- WeChat requires iOS 8.0.70+ or Android equivalent with ClawBot plugin enabled
- Do NOT display raw JSON responses to the user — only show status updates and the final result
