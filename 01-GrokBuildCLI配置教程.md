本教程将指导你安装 Grok Build CLI，并配置使用 Codesome 的 OpenAI 兼容 API（默认使用 `gpt-5.6-terra`）。

***

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

如果提示 `command not found`，重启终端或手动添加到 PATH：

```bash
export PATH="$HOME/.grok/bin:$PATH"
```

***

## 第二步：配置 Codesome API

### 1. 创建配置文件

编辑 `~/.grok/config.toml`（如果不存在则创建）：

```toml
[cli]
installer = "internal"

# ===== v3 配置 =====
[model.codesome-gpt56-terra]
model = "gpt-5.6-terra"
name = "v3 Codesome GPT-5.6 Terra"
api_key = "你的_v3_API_KEY（sk-开头）"
base_url = "https://cc.codesome.ai/v1"

# ===== 二合一月卡配置 =====
[model.codesome-gpt56-terra-test]
model = "gpt-5.6-terra"
name = "二合一月卡 GPT-5.6 Terra (v5)"
api_key = "你的_二合一月卡_API_KEY（cr-开头）"
base_url = "https://v5.codesome.cn/openai"

[models]
default = "codesome-gpt56-terra-test"

[ui]
max_thoughts_width = 120
fork_secondary_model = "grok-build"
```

### 2. 替换 API Key

将 `YOUR_CODESOME_API_KEY_HERE` 替换为你的实际 Codesome API Key。

> **提示**：**v3 配置**（cc.codesome.ai）的 API Key 以 `sk-` 开头。

**二合一月卡配置**（v5.codesome.cn）的 API Key 以 `cr-` 开头，与 v3 对应不同的后端服务。

### 3. 验证配置

```bash
grok inspect
```

检查输出中是否显示 `codesome-gpt56-terra` 模型。

***

## 第三步：使用 Grok

### 交互模式（TUI）

```bash
cd /path/to/your-project
grok
```

在 TUI 中输入 `/model` 切换模型。

### 常用命令

* **检查配置**：`grok inspect`

* **切换模型**：`/model codesome-gpt56-terra`（TUI 内）或 `grok -m codesome-gpt56-terra`

* **更新 CLI**：`grok update`

***

## 配置说明

### base\_url 路径

* **v3 配置**：`https://cc.codesome.ai/v1`

* **二合一月卡配置**：`https://v5.codesome.cn/openai`

* Grok 会自动在后面添加 `/chat/completions`。因此最终请求地址分别为：

  ```plain&#x20;text
  V3：https://cc.codesome.ai/v1/chat/completions
  二合一：https://v5.codesome.cn/openai/chat/completions
  ```

### 模型 ID

* 默认使用 `gpt-5.6-terra`；需要更强能力时可改为 `gpt-5.6-sol`，简单任务可改为 `gpt-5.6-luna`。

* 不要填写裸 `gpt-5.6`，否则会默认指向更贵的 Sol。

* 注意grokbulid只支持OpenAI 兼容格式，所以只能支持 GPT。

***

## 故障排查

### 错误：`empty response from model`

* V3 的 `base_url` 应为 `https://cc.codesome.ai/v1`；二合一的 `base_url` 应为 `https://v5.codesome.cn/openai`。

* 验证 API Key 是否正确

* 确认 Codesome 账户有可用余额

### 错误：`404 Not Found`

* 检查 `base_url` 路径：V3 使用 `https://cc.codesome.ai/v1`，二合一使用 `https://v5.codesome.cn/openai`。

* 不要使用 `/v1/messages`（那是 Anthropic 原生格式）

### 错误：`503 Service Unavailable - No available accounts`

* 检查Codesome 分组是否正确，codex分组或gpt月卡分组，claude暂不支持

* v5 测试端点（`v5.codesome.cn`）的非 stream 请求也会返回 503，改用 grok 交互模式即可（交互模式走 stream）

***

## 官方文档

* Grok Build 文档：https://docs.x.ai/build/overview

* Grok CLI 主页：https://x.ai/cli

***

**配置完成后，在项目目录运行 `grok` 即可开始使用！**
