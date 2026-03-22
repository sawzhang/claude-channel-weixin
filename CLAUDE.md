# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code **channel plugin** that connects WeChat (微信) via the ilink Bot API. Users chat with Claude from WeChat; the plugin long-polls for inbound messages and replies through the same API. Modeled after the official Telegram channel plugin (`claude-channel-telegram`).

## Commands

```bash
bun install                    # install dependencies
bun build --no-bundle server.ts  # type-check (no separate tsc — single-file Bun project)
bun server.ts                  # run the MCP server directly (stdio transport)
```

There are no tests yet. No linter configured.

## Architecture

Everything lives in a single file: **`server.ts`** (~920 lines, Bun + TypeScript).

### Message flow

```
WeChat App → ilink API ← long-poll (getUpdates) ← server.ts → MCP notification → Claude Code
Claude Code → reply tool → server.ts → sendMessage → ilink API → WeChat App
```

### Key sections in server.ts (in order)

1. **WeChat API layer** — `apiFetch()`, `getUpdates()`, `sendMessage()`, `sendTyping()`, `getConfig()`. All POST JSON to `ilinkai.weixin.qq.com/ilink/bot/*` with Bearer token auth and `X-WECHAT-UIN` header.

2. **QR Login** — `fetchQRCode()` (GET `get_bot_qrcode`) and `pollQRStatus()` (GET `get_qrcode_status`). Used by the `/weixin:configure` skill, not called from server.ts startup.

3. **Access control** — Pairing model identical to the Telegram plugin: `gate()` returns deliver/drop/pair. Pending codes stored in `access.json`, approved via `/weixin:access pair <code>`. The `checkApprovals()` interval polls `~/.claude/channels/weixin/approved/` for files written by the skill.

4. **MCP Server** — Declares `claude/channel` experimental capability. Single tool: `reply`. Inbound messages arrive as `notifications/claude/channel` with meta: `user_id`, `message_id`, `user`, `ts`.

5. **Monitor loop** — `startMonitor()` → `poll()` infinite loop calling `getUpdates`. Each message goes through `processInbound()`: gate check → context token cache → typing indicator → emit MCP notification.

### Critical protocol detail: context_token

Every outbound `sendMessage` **must** include the `context_token` from the most recent inbound message for that user. Without it, the ilink API rejects the send. The `contextTokenStore` (in-memory Map) caches the latest token per user ID. This means the bot cannot message a user proactively — only reply after they send something.

### State files (`~/.claude/channels/weixin/`)

| File | Format | Purpose |
|------|--------|---------|
| `account.json` | `{ token, baseUrl, accountId, userId }` | Bot credentials from QR login |
| `access.json` | `{ dmPolicy, allowFrom[], pending{} }` | Access control state |
| `sync_buf.json` | `{ buf }` | getUpdates cursor for resume after restart |
| `.env` | `KEY=VALUE` lines | Optional env overrides (loaded at startup) |

### Skills

- `/weixin:access` — Pair, list, add/remove users, change policy. Reads/writes `access.json` and drops files in `approved/`.
- `/weixin:configure` — QR code login flow via curl commands. Saves `account.json`.

### Differences from the reference `@tencent-weixin/openclaw-weixin` plugin

This is a standalone MCP server, not an OpenClaw plugin. No dependency on the OpenClaw runtime, plugin SDK, or gateway. The ilink API calls are identical but implemented directly with `fetch()`. No CDN media upload/download (image/file/video sending not yet implemented). No AES-ECB encryption layer for media.
