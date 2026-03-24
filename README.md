# claude-channel-weixin

**Turn WeChat into a Claude Code interface — chat with your AI agent from the app you already use every day.**

> 把微信变成 Claude Code 的入口 — 在你每天都用的 App 里和 AI 助手对话。

[![License](https://img.shields.io/badge/license-MIT-green)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Bun-blue)]()

## Why This Exists

Claude Code is powerful, but it lives in a terminal. Your team, your family, your life lives in **WeChat** — the app with 1.3 billion monthly users. This plugin bridges the two: send a message in WeChat, get a response from Claude.

No app switching. No terminal. Just chat.

## What You Get

- **Chat with Claude in WeChat** — Send text, get intelligent responses powered by Claude Code
- **Voice message support** — Voice messages auto-transcribed to text
- **Quoted context** — Reply to a message and Claude sees the full context
- **Zero config access** — Login once, auto-allowlisted, done
- **Full Claude Code power** — Not a wrapper. Your WeChat messages go through the real Claude Code agent with all its tools

## How It Works

```
WeChat App ←→ ilink API ←→ [This Plugin] ←→ Claude Code (MCP stdio)
                                  ↑
                            long-poll for messages
                            sendMessage for replies
```

1. Plugin long-polls `ilink/bot/getupdates` for new WeChat messages
2. Messages are pushed to Claude Code as `notifications/claude/channel` events
3. Claude sees `<channel source="weixin" ...>` and processes the message
4. Claude replies via the `reply` tool → `ilink/bot/sendmessage` → WeChat

## Quick Start

### Prerequisites

- [Claude Code](https://claude.ai/code) installed
- [Bun](https://bun.sh) runtime: `curl -fsSL https://bun.sh/install | bash`
- WeChat iOS 8.0.70+ or Android equivalent, with ClawBot plugin enabled

### Step 1: Add Marketplace

```
/plugin marketplace add sawzhang/claude-channel-weixin
```

### Step 2: Install Plugin

```
/plugin install weixin@sawzhang
```

### Step 3: Login to WeChat

Tell Claude "帮我配置微信" or "login to WeChat" — it will handle the rest. Or manually:

```
/weixin:configure
```

Scan QR code → Confirm on phone → Credentials auto-saved.

### Step 4: Launch Claude Code

```bash
claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:weixin@sawzhang
```

**Done.** Send a message to ClawBot in WeChat and Claude will respond.

> **Note:** Only sessions launched with the command above receive WeChat messages. Regular `claude` sessions are unaffected.

## State Files

All state is stored in `~/.claude/channels/weixin/`:

| File | Purpose |
|------|---------|
| `account.json` | Bot credentials (token, baseUrl, accountId) |
| `access.json` | Access control (allowlist, pending pairings) |
| `sync_buf.json` | getUpdates cursor (survives restarts) |
| `logs/` | Log files |

## Development

```bash
cd weixin/

# Install dependencies
bun install

# Type check
bun build --no-bundle server.ts

# Run MCP server directly
bun server.ts
```

## Project Structure

```
claude-channel-weixin/
├── .claude-plugin/        # Plugin manifest for Claude Code marketplace
├── weixin/
│   ├── server.ts          # MCP server entry point
│   ├── bin/               # CLI utilities (login, QR code)
│   ├── skills/            # Plugin skills (configure, access)
│   ├── package.json
│   └── .mcp.json          # MCP server config
├── CLAUDE.md
└── README.md
```

## License

MIT
