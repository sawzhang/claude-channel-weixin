---
name: configure
description: "Set up the WeChat channel — run QR code login and review access policy. Use when the user asks to configure WeChat, log in to WeChat, or set up the channel."
user_invocable: true
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
- `qrcode_img_content`: URL to display as QR code

4. Display the QR code URL and tell the user to scan it with WeChat
5. Poll for status:

```bash
# Step 2: Poll for scan result (repeat until confirmed/expired)
curl -s -H 'iLink-App-ClientVersion: 1' \
  'https://ilinkai.weixin.qq.com/ilink/bot/get_qrcode_status?qrcode=<QRCODE>'
```

Status values:
- `wait`: still waiting for scan
- `scaned`: user scanned, waiting for confirmation
- `confirmed`: success! Response includes `bot_token`, `ilink_bot_id`, `baseurl`, `ilink_user_id`
- `expired`: QR code expired, need to regenerate

6. On `confirmed`, save to `~/.claude/channels/weixin/account.json`:
```json
{
  "token": "<bot_token>",
  "baseUrl": "<baseurl or https://ilinkai.weixin.qq.com>",
  "accountId": "<ilink_bot_id>",
  "userId": "<ilink_user_id>",
  "savedAt": "<ISO timestamp>"
}
```

7. Auto-add the `ilink_user_id` to the allowlist in access.json
8. Tell the user to restart Claude Code for the channel to start polling

## Status Check

When the user asks about status:
- Read account.json — show if logged in, account ID
- Read access.json — show DM policy, number of allowed users
- Check if the channel MCP server is running

## Important

- The QR code expires in ~5 minutes, poll frequently
- The bot_token is sensitive — store with mode 0o600
- After login, the user needs to restart Claude Code so the server picks up the new credentials
- WeChat requires iOS 8.0.70+ for the ClawBot plugin feature
