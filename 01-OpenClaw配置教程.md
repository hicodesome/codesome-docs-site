# OpenClaw 最新配置教程

### 1.1 安装 Node.js

直接去官网下载安装器：https://nodejs.org/en/download下载 `Node.js 24 LTS` 的 `.pkg` 安装包，安装后确认：

```bash
node -v
npm -v



```

### 1.2 安装 OpenClaw

```bash
npm i -g openclaw
openclaw --version



```

### 1.3 配置

先打开配置文件（下面这一行不是命令）：

```bash
~/.openclaw/openclaw.json



```

如果你要用 Codex 渠道（**推荐**），就把下面这段合并到 `~/.openclaw/openclaw.json`。这里的 provider 名固定写 `codesome-codex`：（注意填写你的apikey）

```json
{
  "env": {
    "CODESOME_OPENAI_API_KEY": "你的apikey"
  },
  "gateway": { "mode": "local" },
  "tools": { "profile": "full" },
  "models": {
    "providers": {
      "codesome-codex": {
        "baseUrl": "https://cc.codesome.ai/v1",
        "apiKey": "${CODESOME_OPENAI_API_KEY}",
        "api": "openai-responses",
        "models": [
          {
            "id": "gpt-5.6-terra",
            "name": "gpt-5.6-terra",
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "codesome-codex/gpt-5.6-terra"
      },
      "models": {
        "codesome-codex/gpt-5.6-terra": {}
      }
    }
  }
}
```

这里用 `gpt-5.6-terra` 作为日常默认模型。OpenClaw 的 `openai-responses` 会在 `baseUrl` 后追加 `/responses`，所以 V3 必须填写 `https://cc.codesome.ai/v1`，最终请求为 `https://cc.codesome.ai/v1/responses`。需要更强能力时改成 `gpt-5.6-sol`，简单任务可用 `gpt-5.6-luna`；不要填写裸 `gpt-5.6`，否则会默认走更贵的 Sol。

如果你要用 Claude 渠道（**不推荐**），请只使用当天后台明确支持 OpenClaw 的分组。本文示例使用 V3 Claude；OpenClaw 的 `anthropic-messages` 会追加 `/v1/messages`，因此保留 `https://v3.codesome.cn` 这个根地址。不要按旧教程配置 Fable：普通 `PRO` 不支持 Fable，客服曾实测支持第三方外接的是明确标注 **`max2.2 可外接`** 的分组，但 Fable 已于 2026 年 7 月 19 日后不可用。就把下面这段合并到 `~/.openclaw/openclaw.json`。这里的 provider 名固定写 `codesome`：（注意填写你的apikey）

```json
{
  "env": {
    "CODESOME_API_KEY": "你的apikey"
  },
  "gateway": { "mode": "local" },
  "tools": { "profile": "full" },
  "models": {
    "providers": {
      "codesome": {
        "baseUrl": "https://v3.codesome.cn",
        "apiKey": "${CODESOME_API_KEY}",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "claude-sonnet-5",
            "name": "claude-sonnet-5",
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "claude-opus-4-8",
            "name": "Claude Opus 4.8",
            "contextWindow": 200000,
            "maxTokens": 16384
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "codesome/claude-sonnet-5"
      },
      "models": {
        "codesome/claude-opus-4-8": {},
        "codesome/claude-sonnet-5": {}
      }
    }
  }
}
```

Telegram、Discord、WhatsApp 等 IM 渠道，直接运行下面这个命令，然后在交互式里选 `Channels`：

```bash
openclaw configure



```

如果不会改 JSON，直接把 `~/.openclaw/openclaw.json` 发给你现在可用的 AI，例如 Trae、Cursor、Claude Code 或其他 AI IDE，让它帮你合并。

### 1.4 验证

```bash
openclaw dashboard
openclaw tui



```

***

## 2. Windows

### 2.1 安装 Node.js

直接去官网下载安装器：https://nodejs.org/en/download下载 `Node.js 24 LTS` 的 `.msi` 安装包，安装后在 PowerShell 里确认：

```powershell
node -v
npm -v



```

### 2.2 安装 OpenClaw

```powershell
npm i -g openclaw
openclaw --version



```

### 2.3 配置

模型部分默认只配置两种渠道：`codesome` 或 `codesome-codex`。先打开配置文件（下面这一行不是命令）：

```powershell
你的用户目录\.openclaw\openclaw.json



```

如果你要用 Codex / OpenAI 兼容渠道，就把上面 macOS 章节里的 `codesome-codex` 片段合并进去。如果你要用 Claude 渠道，就把上面 macOS 章节里的 `codesome` 片段合并进去。Telegram、Discord、WhatsApp 等 IM 渠道，直接运行下面这个命令，然后在交互式里选 `Channels`：

```powershell
openclaw configure



```

如果不会改 JSON，直接把 `%USERPROFILE%\.openclaw\openclaw.json` 发给你现在可用的 AI，例如 Trae、Cursor、Claude Code 或其他 AI IDE，让它帮你合并。

### 2.4 验证

```powershell
openclaw dashboard
openclaw tui



```

***

## 3. 常用命令

```bash
openclaw configure
openclaw dashboard
openclaw tui
openclaw channels status



```
