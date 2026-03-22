---
name: configure
description: "Set up the WeChat channel — run QR code login and review access policy. Use when the user asks to configure WeChat, log in to WeChat, or set up the channel."
user-invocable: true
allowed-tools:
  - Bash
  - Read
---

# WeChat Channel Configuration

You are configuring the WeChat (Weixin) channel plugin for Claude Code.

## Login

Run the login script. It handles everything: QR code rendering, polling, and credential saving.

```bash
bun ${CLAUDE_SKILL_DIR}/../../bin/login.ts
```

This script will:
1. Render a QR code directly in the terminal
2. Wait for the user to scan and confirm
3. Save credentials to `~/.claude/channels/weixin/account.json`
4. Initialize access control in `~/.claude/channels/weixin/access.json`

After it completes, tell the user to restart Claude Code.

## Status Check

When the user asks about status instead of login:
- Read `~/.claude/channels/weixin/account.json` — show if logged in, account ID
- Read `~/.claude/channels/weixin/access.json` — show DM policy, number of allowed users

## Important

- The script timeout is 5 minutes. If expired, the user can re-run `/weixin:configure`.
- After login, the user MUST restart Claude Code so the MCP server picks up the new credentials.
- WeChat requires iOS 8.0.70+ or Android equivalent with ClawBot plugin enabled.
