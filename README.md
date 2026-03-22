# claude-channel-weixin

WeChat (微信) channel for Claude Code — 在微信里和 Claude 对话。

## 功能

- 在微信中直接向 Claude 发消息，Claude 自动回复
- 语音消息自动转文字
- 引用消息包含上下文
- 登录即用，自动白名单

## 前置条件

- [Claude Code](https://claude.ai/code) 已安装
- [Bun](https://bun.sh) 运行时：`curl -fsSL https://bun.sh/install | bash`
- 微信 iOS 8.0.70+ 或 Android 对应版本，已启用 ClawBot 插件

## 安装

### 第 1 步：安装插件

在 Claude Code 终端中运行：

```
/plugin install weixin@sawzhang
```

> 首次使用会提示添加 `sawzhang` marketplace，确认即可。

### 第 2 步：登录微信

```
/weixin:configure
```

按提示操作：扫描二维码 → 手机确认 → 凭证自动保存。

### 第 3 步：启动 Claude Code

```bash
claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:weixin@sawzhang
```

**完成！** 现在从微信发消息给 ClawBot，Claude 就会收到并回复。

> **提示：** 只有用上述命令启动的 session 会接收微信消息。其他普通 `claude` session 不受影响。`--channels` 仅限官方审批的 channel 使用，第三方插件需要用 `--dangerously-load-development-channels`。

## 工作原理

```
微信 App ←→ ilink API ←→ [本插件] ←→ Claude Code (MCP stdio)
                              ↑
                        long-poll 轮询消息
                        sendMessage 发送回复
```

1. 插件通过 `ilink/bot/getupdates` 长轮询获取新消息
2. 消息作为 `notifications/claude/channel` 事件推送给 Claude Code
3. Claude 看到 `<channel source="weixin" user_id="..." ...>` 标签
4. Claude 通过 `reply` 工具调用 `ilink/bot/sendmessage` 回复

## 状态文件

所有状态保存在 `~/.claude/channels/weixin/`：

| 文件 | 用途 |
|------|------|
| `account.json` | Bot 凭证（token, baseUrl, accountId） |
| `access.json` | 访问控制（白名单、待配对） |
| `sync_buf.json` | getUpdates 游标（重启后恢复） |
| `logs/` | 日志文件 |

## 开发

```bash
cd weixin/

# 安装依赖
bun install

# 类型检查
bun build --no-bundle server.ts

# 直接运行 MCP server
bun server.ts
```

## License

MIT
