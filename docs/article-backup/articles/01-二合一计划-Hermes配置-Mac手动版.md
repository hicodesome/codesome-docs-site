# 【最新】Hermes 客户端配置教程（V3 / V5）

这是一篇 Hermes 客户端配置文章，V3 和 V5（二合一）都在这里配置。先判断你手里的 Key 属于哪套产品，再只使用对应的一组地址、provider 和环境变量。

## 配置方式

Hermes 有两种配置路径。普通电脑优先使用 CC Switch 图形界面；没有图形桌面的服务器、远程 SSH 环境和只使用终端的场景，使用后面的“无头配置”。两种方式最终配置的是同一个 Hermes provider，不要同时把两套配置拼在一起。

### 方式 A：CC Switch 图形界面（推荐）

CC Switch 适合在有桌面的 macOS、Windows 或 Linux 电脑上配置 Hermes。它把供应商标识、供应商名称、API 模式、API 端点、API Key 和模型列表集中在一个页面中，不需要手动编辑 `config.yaml`。

开始前请准备：

- 已安装 Hermes；安装命令见下方[安装 Hermes](#一安装-hermes)。
- 已安装最新版 CC Switch；如果还没有安装，请先看 [CC Switch 配置 Claude 桌面端教程](01-CCSwitch配置Claude桌面端.md) 中的下载说明。
- 已准备对应产品线的 API Key：V3 使用 `sk-...`，V5（二合一）使用 `cr-...`。

#### 1. 打开 Hermes 配置页面

打开 CC Switch，在应用列表中选择 Hermes 配置页面：

![CC Switch Hermes 配置页面](<images/Hermes 客户端配置教程-CC Switch-首页.png>)

#### 2. 新建自定义配置

点击右上角的加号，选择自定义配置：

![CC Switch 新建 Hermes 自定义配置](<images/Hermes 客户端配置教程-CC Switch-新建自定义配置.png>)

新建配置时，至少需要填写或选择这五项：

1. 供应商标识
2. 供应商名称
3. API 模式
4. API 端点
5. API Key

供应商标识和供应商名称可以自定义。为了便于以后区分，下面沿用截图中的建议命名。API 模式不能随意选择：Claude 使用 `Anthropic Messages`，GPT / Codex 使用 `OpenAI Responses`。

#### 3. 四套配置直接对照填写

| 产品路径 | 供应商标识 / 名称（建议） | API 模式 | API 端点 | API Key |
|---|---|---|---|---|
| V3 Claude | `codesome` | `Anthropic Messages` | `https://cc.codesome.ai` | `sk-...` |
| V3 Codex | `codesome-codex` | `OpenAI Responses` | `https://cc.codesome.ai/v1` | `sk-...` |
| V5 Claude | `v5claude` | `Anthropic Messages` | `https://v5.codesome.cn/api` | `cr-...` |
| V5 Codex | `v5codex` | `OpenAI Responses` | `https://v5.codesome.cn/openai` | `cr-...` |

> V3 的 `sk-...` Key 只能配 `cc.codesome.ai` 地址；V5 的 `cr-...` Key 只能配 `v5.codesome.cn` 地址。不要交叉使用。

#### 4. V3 Claude

V3 Claude 使用 `Anthropic Messages`，API 端点填写 `https://cc.codesome.ai`，Key 使用 V3 的 `sk-...`：

![CC Switch V3 Claude 配置](<images/Hermes 客户端配置教程-CC Switch-V3 Claude.png>)

模型列表可以填写：

```text
claude-sonnet-5
claude-opus-5
claude-fable-5
```

填入模型列表后，Hermes 的模型选择中才会显示这些模型：

![CC Switch V3 Claude 模型列表](<images/Hermes 客户端配置教程-CC Switch-V3 Claude模型.png>)

如果后台当前没有开放某个模型，不要只因为模型出现在列表中就继续使用；以当天 Codesome 后台可用模型为准。

#### 5. V3 Codex

V3 Codex 使用 `OpenAI Responses`，API 端点填写 `https://cc.codesome.ai/v1`，Key 仍然是 V3 的 `sk-...`：

![CC Switch V3 Codex 配置](<images/Hermes 客户端配置教程-CC Switch-V3 Codex.png>)

模型列表填写以下三个 ID，默认模型使用 `gpt-5.6-sol`：

```text
gpt-5.6-sol
gpt-5.6-luna
gpt-5.6-terra
```

![CC Switch V3 Codex 模型列表](<images/Hermes 客户端配置教程-CC Switch-V3 Codex模型.png>)

#### 6. V5（二合一）Claude

V5 Claude 使用 `Anthropic Messages`，API 端点填写 `https://v5.codesome.cn/api`，Key 使用 V5 的 `cr-...`：

![CC Switch V5 Claude 配置](<images/Hermes 客户端配置教程-CC Switch-V5 Claude.png>)

模型列表可以填写：

```text
claude-sonnet-5
claude-opus-5
claude-fable-5
```

![CC Switch V5 Claude 模型列表](<images/Hermes 客户端配置教程-CC Switch-V5 Claude模型.png>)

#### 7. V5（二合一）Codex

V5 Codex 使用 `OpenAI Responses`，API 端点填写 `https://v5.codesome.cn/openai`，Key 使用 V5 的 `cr-...`：

![CC Switch V5 Codex 配置](<images/Hermes 客户端配置教程-CC Switch-V5 Codex.png>)

模型列表填写以下三个 ID，默认模型使用 `gpt-5.6-sol`：

```text
gpt-5.6-sol
gpt-5.6-luna
gpt-5.6-terra
```

![CC Switch V5 Codex 模型列表](<images/Hermes 客户端配置教程-CC Switch-V5 Codex模型.png>)

#### 8. 保存并验证

所有字段填好后，点击右下角蓝色的“添加”按钮。GPT 配置如果有 `model.default` 字段，填写 `gpt-5.6-sol`；Claude 配置建议填写 `claude-sonnet-5`。

然后打开终端运行：

```bash
hermes
```

输入：

```text
hi
```

Hermes 能正常返回内容，说明 CC Switch 配置已经生效。模型列表能显示但测试失败时，先检查 API 模式、端点和 Key 前缀是否来自同一套 V3 或 V5 配置。

### 方式 B：无头配置（服务器 / 终端）

无头配置适用于服务器、远程 SSH、Linux 终端或没有图形桌面的环境。这个方式不打开 CC Switch，而是直接在终端编辑 Hermes 的 `config.yaml` 和 `.env` 文件；本文后面的配置示例都属于无头配置。

## 先判断你使用的是 V3 还是 V5

| 产品 | Key 特征 | 管理 / 使用入口 | Hermes 请求地址 |
|---|---|---|---|
| V3（Claude 月卡、GPT 月卡、按量） | `sk-...` | `https://cc.codesome.ai/keys` | `https://cc.codesome.ai` 或 `https://cc.codesome.ai/v1` |
| V5（二合一） | `cr-...` | `https://v5.codesome.cn` | `https://v5.codesome.cn/api` 或 `https://v5.codesome.cn/openai` |

V3 的 API Key 需要在 V3 后台创建，并在后台选择对应分组。V5 的 `cr-...` Key 直接用于 V5，不要拿到 V3 后台兑换或切换分组。

> **不要混用：** V3 的 `sk-...` Key 不能配 V5 地址；V5 的 `cr-...` Key 不能配 V3 地址。虽然 V3 Codex 和 V5 Codex 都使用 `OPENAI_API_KEY` 这个变量名，但地址、provider 和 Key 前缀不同。

## 一、安装 Hermes

### macOS、Linux 或 WSL

运行官方安装命令：

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

安装完成后，重新加载 shell：

```bash
source ~/.zshrc
```

如果你使用 bash：

```bash
source ~/.bashrc
```

确认安装成功：

```bash
hermes version
```

### Windows 原生环境

请使用 Hermes 官方 PowerShell 安装命令：

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

## 二、无头配置：打开 Hermes 配置文件

如果你使用的是服务器、远程 SSH 或没有图形桌面的终端环境，这一节就是你的配置路径。直接编辑 `config.yaml` 的方式属于无头配置，不需要打开 CC Switch。

```bash
mkdir -p ~/.hermes
nano ~/.hermes/config.yaml
```

下面只选择 V3 或 V5 中的一组配置写入 `config.yaml`，不要把两套配置拼在一起。

> Hermes 官方当前推荐使用 `providers:` 命名 provider 配置。一个 provider 可以在 `models:` 下同时登记多个模型 ID；本文按这个新格式写，不使用旧的 `custom_providers:` 列表格式。

## 三、V3 配置（`sk-...` Key）

### V3 + GPT / Codex

适用于 V3 的 GPT 月卡、按量或 Codex 分组。GPT provider 同时登记三个 GPT-5.6 模型 ID，但默认使用 Sol：

- `gpt-5.6-luna`
- `gpt-5.6-terra`
- `gpt-5.6-sol`（默认）

将下面内容写入 `~/.hermes/config.yaml`：

```yaml
model:
  provider: "codesome-v3-codex"
  default: "gpt-5.6-sol"
  context_length: 1050000

providers:
  codesome-v3-codex:
    api: "https://cc.codesome.ai/v1"
    key_env: "OPENAI_API_KEY"
    transport: "codex_responses"
    models:
      gpt-5.6-luna:
        context_length: 1050000
      gpt-5.6-terra:
        context_length: 1050000
      gpt-5.6-sol:
        context_length: 1050000

terminal:
  backend: "local"
  cwd: "."
  timeout: 180
```

V3 Codex 的 Key 写入 `~/.hermes/.env`：

```bash
nano ~/.hermes/.env
```

```dotenv
OPENAI_API_KEY=sk-替换成你的V3-Key
```

### V3 + Claude

适用于 V3 的 Claude 月卡或按量分组。将下面内容写入 `~/.hermes/config.yaml`：

```yaml
model:
  provider: "codesome-v3-claude"
  default: "claude-sonnet-5"
  context_length: 1000000

providers:
  codesome-v3-claude:
    api: "https://cc.codesome.ai"
    key_env: "CODESOME_CLAUDE_API_KEY"
    transport: "anthropic_messages"
    models:
      claude-sonnet-5:
        context_length: 1000000
      claude-opus-5:
        context_length: 1000000
      claude-fable-5:
        context_length: 1000000

terminal:
  backend: "local"
  cwd: "."
  timeout: 180
```

V3 Claude 的 Key 写入 `~/.hermes/.env`：

```dotenv
CODESOME_CLAUDE_API_KEY=sk-替换成你的V3-Key
```

这里的 `CODESOME_CLAUDE_API_KEY` 只是 Hermes `key_env` 指定的变量名，不是新的 Key 类型；值仍然必须是 V3 的 `sk-...` Key。

## 四、V5（二合一）配置（`cr-...` Key）

V5 没有 V3 的分组选择，Claude 和 GPT 使用同一个二合一 `cr-...` Key，但请求地址不同。

### V5 + GPT / Codex

GPT provider 同样登记三个 GPT-5.6 模型 ID，默认使用 Sol：

- `gpt-5.6-luna`
- `gpt-5.6-terra`
- `gpt-5.6-sol`（默认）

将下面内容写入 `~/.hermes/config.yaml`：

```yaml
model:
  provider: "codesome-unified-codex"
  default: "gpt-5.6-sol"
  context_length: 1050000

providers:
  codesome-unified-codex:
    api: "https://v5.codesome.cn/openai"
    key_env: "OPENAI_API_KEY"
    transport: "codex_responses"
    models:
      gpt-5.6-luna:
        context_length: 1050000
      gpt-5.6-terra:
        context_length: 1050000
      gpt-5.6-sol:
        context_length: 1050000

terminal:
  backend: "local"
  cwd: "."
  timeout: 180
```

V5 Codex 的 Key 写入 `~/.hermes/.env`：

```dotenv
OPENAI_API_KEY=cr-替换成你的二合一-Key
```

### V5 + Claude

将下面内容写入 `~/.hermes/config.yaml`：

```yaml
model:
  provider: "codesome-unified-claude"
  default: "claude-sonnet-5"
  context_length: 1000000

providers:
  codesome-unified-claude:
    api: "https://v5.codesome.cn/api"
    key_env: "ANTHROPIC_API_KEY"
    transport: "anthropic_messages"
    models:
      claude-sonnet-5:
        context_length: 1000000
      claude-opus-5:
        context_length: 1000000
      claude-fable-5:
        context_length: 1000000

terminal:
  backend: "local"
  cwd: "."
  timeout: 180
```

V5 Claude 的 Key 写入 `~/.hermes/.env`：

```dotenv
ANTHROPIC_API_KEY=cr-替换成你的二合一-Key
```

## 五、保存配置

在 `nano` 中：

1. 按 `Control + O` 保存，字母是 `O`。
2. 按回车确认文件名。
3. 按 `Control + X` 退出。

macOS Terminal 或 iTerm2 粘贴文本使用 `Command + V`。`Control + V` 不是 macOS 终端的普通粘贴快捷键。

## 六、验证 Hermes 模型连接

先验证模型路径，再配置 Telegram、飞书或其他 gateway：

```bash
hermes chat -q "Reply with exactly: HERMES_OK"
```

如果返回：

```text
HERMES_OK
```

说明当前 `config.yaml`、Key 和模型请求路径已经连通。之后可以检查完整配置：

```bash
hermes doctor
```

配置聊天机器人或其他渠道：

```bash
hermes gateway setup
```

模型验证失败时，不要继续配置 gateway。优先检查以下项目：

- V3 是否使用 `sk-...` Key 和 `cc.codesome.ai` 地址。
- V5 是否使用 `cr-...` Key 和 `v5.codesome.cn` 地址。
- Codex 是否使用 `OPENAI_API_KEY`。
- V3 Claude 是否使用 `CODESOME_CLAUDE_API_KEY`。
- V5 Claude 是否使用 `ANTHROPIC_API_KEY`。
- `provider`、`api`、`transport` 是否来自同一套 V3 或 V5 配置。

## 七、常用命令

启动 Hermes：

```bash
hermes
```

直接发送问题：

```bash
hermes chat -q "请用最简单的话告诉我 Hermes 能做什么"
```

继续上一次会话：

```bash
hermes -c
```

开始新对话：

```text
/new
```

## 八、上下文参数说明

本文配置的是 Hermes 通过 API provider 访问 Codesome 的方式：

- GPT-5.6 API 配置使用 `context_length: 1050000`。
- Claude Sonnet 5 和 Opus 5 配置使用 `context_length: 1000000`。
- 这两个数值属于 Hermes 的 API 配置，不等于官方 Codex 客户端的 `272000`；不要把不同客户端的配置互相复制。
- 如果后台或具体套餐给出了新的模型上下文限制，以当天 Codesome 后台和正式口径为准，不要自行把 V3 和 V5 的配置合并。

## 九、常见错误

### 401 或 API Key 无效

先看 Key 前缀和地址是否成套：

| 你使用的产品 | 正确 Key | 正确地址 |
|---|---|---|
| V3 Codex | `sk-...` | `https://cc.codesome.ai/v1` |
| V3 Claude | `sk-...` | `https://cc.codesome.ai` |
| V5 Codex | `cr-...` | `https://v5.codesome.cn/openai` |
| V5 Claude | `cr-...` | `https://v5.codesome.cn/api` |

### 连接超时

先完全关闭 VPN，然后再重试 Hermes。不要用 V5 地址测试 V3 Key，也不要用 V3 地址测试 V5 Key。

### 模型找不到

确认 `model.default` 和 `providers.<name>.models` 中的模型名称一致。GPT 默认使用 `gpt-5.6-sol`，同一 provider 同时登记 `gpt-5.6-luna`、`gpt-5.6-terra` 和 `gpt-5.6-sol`。

## 官方资料

- Hermes 官方配置文档：https://hermes-agent.nousresearch.com/docs/user-guide/configuration
- Hermes 官方 provider 文档：https://hermes-agent.nousresearch.com/docs/integrations/providers
- OpenAI GPT-5.6 模型文档：https://developers.openai.com/api/docs/guides/latest-model
- Hermes 官方网站：https://hermes-agent.nousresearch.com/
- Hermes 官方仓库：https://github.com/NousResearch/hermes-agent
