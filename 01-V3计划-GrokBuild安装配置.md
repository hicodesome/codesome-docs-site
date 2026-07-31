# V3 Grok Build 安装与配置指南

> 面向 **V3 套餐**用户：在 **Grok Build**（xAI 官方 CLI）中接入 Codesome 的 **Grok 4.5** 模型，直接在终端里用 Grok 写代码、查资料、跑 Agent 任务。

**一句话回答**：安装 Grok Build CLI → 在 `~/.grok/config.toml` 中粘贴下方 Codesome V3 配置 → 把 `api_key` 换成你自己的 Key → 运行 `grok` 即可。

## 适用范围

| 项目 | 说明 |
|---|---|
| 套餐 | V3（`cc.codesome.ai`，API Key 以 `sk-` 开头） |
| 模型 | `grok-4.5` |
| 客户端 | Grok Build CLI（xAI 官方命令行工具） |

> 二合一/月卡套餐请参考对应的二合一教程。

---

## 第一步：安装 Grok Build CLI

### macOS / Linux / WSL

在终端中运行：

```bash
curl -fsSL https://x.ai/cli/install.sh | bash
```

### Windows（PowerShell）

在 PowerShell 中运行：

```powershell
irm https://x.ai/cli/install.ps1 | iex
```

### 验证安装

```bash
grok --version
```

如果提示 `command not found`，重启终端，或手动加入 PATH：

```bash
export PATH="$HOME/.grok/bin:$PATH"
```

---

## 第二步：创建 Codesome V3 配置

Grok Build 的配置文件是：

* macOS / Linux：`~/.grok/config.toml`
* Windows：`%USERPROFILE%\.grok\config.toml`

1. 创建（或编辑）该文件；
2. 粘贴下面的完整配置；
3. 把 `api_key` 替换成你自己的 V3 API Key。

```toml
[models]
default = "grok"
web_search = "grok"

[model."grok"]
model = "grok-4.5"
base_url = "https://cc.codesome.ai/v1"
name = "Grok 4.5"
api_key = "sk-请替换成你的API Key"
api_backend = "responses"
context_window = 1000000
supports_backend_search = true
```

> **小提示**：如果你不想把 Key 明文写在配置文件里，也可以改用 `env_key = "XAI_API_KEY"`，并在终端里 `export XAI_API_KEY=你的Key`。

### 配置项说明

| 配置项 | 示例值 | 作用 |
|---|---|---|
| `[models] default` | `"grok"` | 默认使用的模型，值对应下面的 `[model."grok"]` 别名 |
| `[models] web_search` | `"grok"` | 客户端联网搜索（`web_search` 工具）使用的模型 |
| `[model."grok"] model` | `"grok-4.5"` | 实际发给 API 的模型 ID |
| `base_url` | `"https://cc.codesome.ai/v1"` | Codesome V3 API 地址 |
| `name` | `"Grok 4.5"` | 在模型选择器中显示的名称 |
| `api_key` | 你的 Key | V3 API Key（`sk-` 开头） |
| `api_backend` | `"responses"` | 使用 OpenAI Responses 协议 |
| `context_window` | `1000000` | 上下文窗口长度，影响自动压缩时机 |
| `supports_backend_search` | `true` | Codesome 端点支持服务端搜索工具 |

---

## 第三步：验证配置

```bash
grok inspect
```

确认输出中 `Config Sources → User` 指向 `~/.grok/config.toml`。

再确认模型已加载：

```bash
grok models
```

应该能看到类似输出：

```text
Default model: grok

Available models:
  - grok-4.5
  * grok (default)
```

---

## 第四步：开始使用

### 交互模式（推荐）

```bash
cd /path/to/your-project
grok
```

### 单次提问（Headless）

```bash
grok -p "帮我写一个 Python 冒泡排序"
```

### 切换模型

在交互界面输入 `/model`，或启动时指定：

```bash
grok -m grok
```

### 常用命令

| 命令 | 作用 |
|---|---|
| `grok` | 进入交互模式 |
| `grok -p "问题"` | 单次提问后退出 |
| `grok -m grok` | 指定模型启动 |
| `grok inspect` | 查看当前生效配置 |
| `grok models` | 列出可用模型 |
| `grok update` | 更新 Grok Build CLI |
| `grok doctor` | 检查终端环境 |

---

## 联网搜索

Grok Build 默认启用联网搜索：

* `[models] web_search = "grok"` 指定搜索使用的模型；
* `supports_backend_search = true` 表示 Codesome 端点支持服务端搜索工具。

如需临时关闭联网，可加参数启动：

```bash
grok --disable-web-search
```

---

## 故障排查

### 401 Unauthorized

API Key 不对或已过期。检查 `api_key` 是否正确、前后没有多余空格。

### 404 Not Found

* 检查 `base_url` 是否为 `https://cc.codesome.ai/v1`，不要漏掉 `/v1`；
* `api_backend = "responses"` 时，请求会打到 `/v1/responses`。

### 503 Service Unavailable / No available accounts

Codesome 对应分组暂时没有可用账号，稍后重试或联系客服。

### empty response from model

* 确认账户有可用余额；
* 确认 API Key 属于 V3 套餐（`sk-` 开头）。

---

## 官方文档

* Grok Build 官方文档：<https://docs.x.ai/build/overview>
* Grok Build 配置说明：<https://docs.x.ai/build/settings>
* Grok CLI 主页：<https://x.ai/cli>

---

## 相关文档

* [V3 Claude Code 安装与配置指南](01-V3计划-ClaudeCode安装配置.md)
* [V3 Codex 安装与配置指南](01-V3计划-Codex安装配置.md)
* [V3 OpenCode 配置指南](01-V3计划-OpenCode配置.md)
* [第三方客户端接入 Codesome 配置指南](01-第三方客户端接入配置.md)
