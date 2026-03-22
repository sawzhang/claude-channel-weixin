# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code **channel plugin marketplace** containing the WeChat (微信) channel. The plugin connects WeChat via the ilink Bot API — long-polls for inbound messages and replies through the same API. Modeled after the official Telegram channel plugin.

## Repo Structure

This repo is a **marketplace** (like `claude-plugins-official`). Plugin code lives in the `weixin/` subdirectory:

```
claude-channel-weixin/          # marketplace repo
├── weixin/                     # plugin directory
│   ├── server.ts               # MCP server (~920 lines, Bun + TypeScript)
│   ├── package.json
│   ├── .mcp.json
│   ├── .claude-plugin/
│   └── skills/
├── README.md
├── CLAUDE.md
└── .gitignore
```

## Commands

```bash
cd weixin/
bun install                      # install dependencies
bun build --no-bundle server.ts  # type-check
bun server.ts                    # run the MCP server directly (stdio transport)
```

No tests yet. No linter configured.

## Architecture

Everything lives in a single file: **`weixin/server.ts`** (~920 lines).

### Message flow

```
WeChat App → ilink API ← long-poll (getUpdates) ← server.ts → MCP notification → Claude Code
Claude Code → reply tool → server.ts → sendMessage → ilink API → WeChat App
```

### Key sections in server.ts (in order)

1. **WeChat API layer** — `apiFetch()`, `getUpdates()`, `sendMessage()`, `sendTyping()`, `getConfig()`. All POST JSON to `ilinkai.weixin.qq.com/ilink/bot/*` with Bearer token auth and `X-WECHAT-UIN` header.

2. **QR Login** — `fetchQRCode()` and `pollQRStatus()`. Used by the `/weixin:configure` skill, not called from server.ts startup.

3. **Access control** — Pairing model: `gate()` returns deliver/drop/pair. Pending codes stored in `access.json`, approved via `/weixin:access pair <code>`.

4. **MCP Server** — Declares `claude/channel` experimental capability. Single tool: `reply`. Inbound messages arrive as `notifications/claude/channel`.

5. **Monitor loop** — `startMonitor()` → `poll()` infinite loop calling `getUpdates`. Each message goes through `processInbound()`: gate check → context token cache → typing indicator → emit MCP notification.

### Critical protocol detail: context_token

Every outbound `sendMessage` **must** include the `context_token` from the most recent inbound message for that user. Without it, the ilink API rejects the send. The `contextTokenStore` (in-memory Map) caches the latest token per user ID.

### State files (`~/.claude/channels/weixin/`)

| File | Format | Purpose |
|------|--------|---------|
| `account.json` | `{ token, baseUrl, accountId, userId }` | Bot credentials from QR login |
| `access.json` | `{ dmPolicy, allowFrom[], pending{} }` | Access control state |
| `sync_buf.json` | `{ buf }` | getUpdates cursor for resume after restart |
| `.env` | `KEY=VALUE` lines | Optional env overrides (loaded at startup) |

### Skills

- `/weixin:access` — Pair, list, add/remove users, change policy.
- `/weixin:configure` — QR code login flow via curl commands. Saves `account.json`.
