# 【最新】Hermes 客户端配置教程（V3 / V5）

这是一篇 Hermes 客户端配置文章，V3 和 V5（二合一）都在这里配置。先判断你手里的 Key 属于哪套产品，再只使用对应的一组地址、provider 和环境变量。

## 先判断你使用的是 V3 还是 V5

| 产品 | Key 特征 | 管理 / 使用入口 | Hermes 请求地址 |
|---|---|---|---|
| V3（Claude 月卡、GPT 月卡、按量） | `sk-...` | `https://cc.codesome.ai/keys` | `https://cc.codesome.ai` 或 `https://cc.codesome.ai/v1` |
| V5（二合一） | `cr-...` | `https://v5.codesome.cn` | `https://v5.codesome.cn/api` 或 `https://v5.codesome.cn/openai` |

V3 的 API Key 需要在 V3 后台创建，并在后台选择对应分组。V5 的 `cr-...` Key 直接用于 V5，不要拿到 V3 后台兑换或切换分组。

> **不要混用：** V3 的 `sk-...` Key 不能配 V5 地址；V5 的 `cr-...` Key 不能配 V3 地址。虽然 V3 Codex 和 V5 Codex 都使用 `OPENAI_API_KEY` 这个变量名，但地址、provider 和 Key 前缀不同。

## 一、安装 Hermes

macOS、Linux 或 WSL 运行官方安装命令：

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

Windows 原生环境请使用 Hermes 官方 PowerShell 安装命令：

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

## 二、打开 Hermes 配置文件

创建配置目录并打开主配置文件：

```bash
mkdir -p ~/.hermes
nano ~/.hermes/config.yaml
```

下面只选择 V3 或 V5 中的一组配置写入 `config.yaml`，不要把两套配置拼在一起。

## 三、V3 配置（`sk-...` Key）

### V3 + GPT / Codex

适用于 V3 的 GPT 月卡、按量或 Codex 分组。将下面内容写入 `~/.hermes/config.yaml`：

```yaml
model:
  default: "gpt-5.6-terra"
  provider: "codesome-v3-codex"
  context_length: 1050000

custom_providers:
  - name: "codesome-v3-codex"
    base_url: "https://cc.codesome.ai/v1"
    key_env: "OPENAI_API_KEY"
    api_mode: "codex_responses"
    models:
      gpt-5.6-terra:
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
  default: "claude-sonnet-5"
  provider: "codesome-v3-claude"
  context_length: 1000000

custom_providers:
  - name: "codesome-v3-claude"
    base_url: "https://cc.codesome.ai"
    key_env: "CODESOME_CLAUDE_API_KEY"
    api_mode: "anthropic_messages"
    models:
      claude-sonnet-5:
        context_length: 1000000
      claude-opus-5:
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

将下面内容写入 `~/.hermes/config.yaml`：

```yaml
model:
  default: "gpt-5.6-terra"
  provider: "codesome-unified-codex"
  context_length: 1050000

custom_providers:
  - name: "codesome-unified-codex"
    base_url: "https://v5.codesome.cn/openai"
    key_env: "OPENAI_API_KEY"
    api_mode: "codex_responses"
    models:
      gpt-5.6-terra:
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
  default: "claude-sonnet-5"
  provider: "codesome-unified-claude"
  context_length: 1000000

custom_providers:
  - name: "codesome-unified-claude"
    base_url: "https://v5.codesome.cn/api"
    key_env: "ANTHROPIC_API_KEY"
    api_mode: "anthropic_messages"
    models:
      claude-sonnet-5:
        context_length: 1000000
      claude-opus-5:
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
- `provider`、`base_url`、`api_mode` 是否来自同一套 V3 或 V5 配置。

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

先确认网络可以访问当前产品对应的地址，再运行 `hermes doctor`。不要用 V5 地址测试 V3 Key，也不要用 V3 地址测试 V5 Key。

### 模型找不到

确认 `model.default` 和 `custom_providers.models` 中的模型名称一致。当前示例使用 `gpt-5.6-terra`、`claude-sonnet-5` 和 `claude-opus-5`。

## 官方资料

- Hermes 官方网站：https://hermes-agent.nousresearch.com/
- Hermes 官方文档：https://hermes-agent.nousresearch.com/docs/
- Hermes 官方仓库：https://github.com/NousResearch/hermes-agent
