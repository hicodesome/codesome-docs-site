本文适用于已经购买 **Codesome V3 套餐**，并希望在 **OpenCode** 中使用 Claude 或 GPT 模型的用户。

当前 V3 套餐支持：

**Claude 模型**（通过 Anthropic Messages 格式）：

* `claude-sonnet-4-6`

* `claude-opus-4-7`

**GPT 模型**（通过 OpenAI Responses 格式）：

* `gpt-5.5`

下面按步骤配置即可。

***

## 一、找到 OpenCode 配置文件

OpenCode 的配置文件路径一般是：

```bash
~/.config/opencode/config.json
```

如果这个文件不存在，可以手动创建。

如果你已经有这个配置文件，**不要直接覆盖原来的内容**，可以把下面的配置内容发给 AI，让 AI 帮你合并到现有 `config.json` 中。

***

## 二、选择配置方案

根据你想使用的模型，选择对应的配置：

### 方案 A：只配置 Claude

如果你只想使用 Claude 模型，使用这个配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "codesome-v3-anthropic": {
      "npm": "@ai-sdk/anthropic",
      "name": "Codesome V3 Claude",
      "options": {
        "baseURL": "https://cc.codesome.ai",
        "apiKey": "sk-请替换成你的API Key",
        "timeout": 600000,
        "chunkTimeout": 30000
      },
      "models": {
        "claude-sonnet-4-6": {
          "name": "Claude Sonnet 4.6"
        },
        "claude-opus-4-7": {
          "name": "Claude Opus 4.7"
        }
      }
    }
  },
  "model": "codesome-v3-anthropic/claude-sonnet-4-6",
  "small_model": "codesome-v3-anthropic/claude-sonnet-4-6"
}
```

### 方案 B：只配置 GPT

如果你只想使用 GPT 模型，使用这个配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "codesome-v3-openai": {
      "npm": "@ai-sdk/openai",
      "name": "Codesome V3 OpenAI",
      "options": {
        "baseURL": "https://cc.codesome.ai/openai",
        "apiKey": "sk-请替换成你的API Key",
        "timeout": 600000,
        "chunkTimeout": 30000
      },
      "models": {
        "gpt-5.5": {
          "name": "GPT-5.5",
          "limit": {
            "context": 400000,
            "output": 128000
          }
        }
      }
    }
  },
  "model": "codesome-v3-openai/gpt-5.5",
  "small_model": "codesome-v3-openai/gpt-5.5"
}
```

***

## 三、替换 API Key

找到这一行（或多行，如果你配置了多个 provider）：

```json
"apiKey": "sk-请替换成你的API Key"
```

把里面的内容替换成你自己的 Codesome V3 API Key，例如：

```json
"apiKey": "sk-xxxxxxxxxxxxxxxx"
```

**重要提示**：

* API Key 前后要保留英文双引号

* 不要多加空格

* 不要把 API Key 发到公开群、论坛、GitHub 或截图里

***

## 四、模型说明

### 默认模型

配置中的 `model` 和 `small_model` 决定了 OpenCode 默认使用哪个模型。

**推荐配置**（使用 Claude Sonnet 4.6）：

```json
"model": "codesome-v3-anthropic/claude-sonnet-4-6",
"small_model": "codesome-v3-anthropic/claude-sonnet-4-6"
```

### 切换到 GPT

如果你想默认使用 GPT-5.5，可以改成：

```json
"model": "codesome-v3-openai/gpt-5.5",
"small_model": "codesome-v3-openai/gpt-5.5"
```

### 切换到 Opus

如果你想默认使用 Claude Opus 4.7，可以改成：

```json
"model": "codesome-v3-anthropic/claude-opus-4-7",
"small_model": "codesome-v3-anthropic/claude-opus-4-7"
```

### 混合使用

你也可以让主模型和小模型使用不同的配置，例如：

```json
"model": "codesome-v3-anthropic/claude-opus-4-7",
"small_model": "codesome-v3-anthropic/claude-sonnet-4-6"
```

不过一般建议两个模型保持一致，这样更稳定。

***

## 五、保存并重启 OpenCode

配置完成后，保存文件。

然后重新启动 OpenCode。

如果 OpenCode 已经打开，请完全退出后重新打开，避免旧配置还在缓存里继续作妖。

***

## 六、切换模型

配置完成后，你可以在 OpenCode 中随时切换模型。

使用斜杠命令 `/model` 即可打开模型选择界面：



![](<images/V3 如何配置 OpenCode-切换模型使用斜杠model命令.png?v=f9efdd9979736c507ba9986e3b9d2c483cc6d4090840311219b53efb281b81fd>)

执行命令后会显示可用的模型列表，选择你想使用的模型即可：



![](<images/V3 如何配置 OpenCode-这是命令执行后的选模型界面.png?v=e7455b388fd700f3f3d87806783d1ff9af0edf7a536a5a12ec7da3f5b7d4e50b>)

***

## 七、常见报错说明

### 1. Claude 报错：`Not Found` 或路径错误

如果使用 Claude 模型时看到类似报错，说明 Claude 的 `baseURL` 配错了。

请确认配置里是：

```json
"baseURL": "https://cc.codesome.ai"
```

**注意**：V3 的 baseURL 是 `https://cc.codesome.ai`，不需要 `/api/v1` 后缀。

***

### 2. GPT 报错：路径错误

如果使用 GPT 模型时报错，请确认 GPT 的 `baseURL` 是：

```json
"baseURL": "https://cc.codesome.ai/openai"
```

注意：

* Claude 的 baseURL 是 `https://cc.codesome.ai`

* GPT 的 baseURL 是 `https://cc.codesome.ai/openai`

两者不一样，不要搞混。

***

### 3. 报错：JSON 格式错误

如果提示配置文件格式错误，请重点检查：

* 是否少了英文逗号 `,`

* 是否少了右括号 `}`

* 是否用了中文引号 `" "`

* 是否把 API Key 外面的英文双引号删掉了

正确示例：

```json
"apiKey": "sk-xxxxxxxxxxxxxxxx"
```

错误示例：

```json
"apiKey": sk-xxxxxxxxxxxxxxxx
```

JSON 对格式非常敏感，敏感程度堪比半夜两点的客服群。

***

### 4. 已经有配置文件怎么办？

如果你已经有自己的 `config.json`，不要直接覆盖。

可以把你的原配置和本文配置一起发给 AI，并告诉它：

```txt
请帮我把 Codesome V3 的 Claude 和 GPT provider 合并到我现有的 OpenCode config.json 中，不要删除我原来的配置。
```

这样可以避免把你原来的其他 provider、模型、主题或快捷配置覆盖掉。

***

## 八、最终检查项

配置完成后，你可以检查这几项：

1. 配置文件路径是否正确：

```bash
~/.config/opencode/config.json
```

1. Claude 的 `baseURL` 是否为：

```json
"https://cc.codesome.ai"
```

1. GPT 的 `baseURL` 是否为：

```json
"https://cc.codesome.ai/openai"
```

1. 所有 provider 的 `apiKey` 是否都已经替换成自己的 Codesome V3 API Key

2. 默认模型是否已设置（推荐 `codesome-v3-anthropic/claude-sonnet-4-6`）

3. 修改后是否已经重启 OpenCode

***

## 九、同时使用 Claude 和 GPT

如果你需要同时使用 Claude 和 GPT 模型，可以在配置文件中同时添加两个 provider（参考方案 A 和方案 B 的配置，合并到同一个 `config.json` 中）。

**重要提示**：

目前 Codesome V3 的分组机制下，**一个 API Key 只能对应一类模型**。

* 如果你的 API Key 属于 Claude 分组，那么这个 Key 只能用于 Claude 模型，无法使用 GPT 模型

* 如果你的 API Key 属于 GPT 分组，那么这个 Key 只能用于 GPT 模型，无法使用 Claude 模型

因此，如果你需要同时使用两种模型，你需要：

1. 准备两个不同的 API Key（一个属于 Claude 分组，一个属于 GPT 分组）

2. 在配置文件中分别为两个 provider 配置对应的 API Key

示例配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "codesome-v3-anthropic": {
      "npm": "@ai-sdk/anthropic",
      "name": "Codesome V3 Claude",
      "options": {
        "baseURL": "https://cc.codesome.ai",
        "apiKey": "sk-你的Claude分组API Key",
        "timeout": 600000,
        "chunkTimeout": 30000
      },
      "models": {
        "claude-sonnet-4-6": {
          "name": "Claude Sonnet 4.6"
        },
        "claude-opus-4-7": {
          "name": "Claude Opus 4.7"
        }
      }
    },
    "codesome-v3-openai": {
      "npm": "@ai-sdk/openai",
      "name": "Codesome V3 OpenAI",
      "options": {
        "baseURL": "https://cc.codesome.ai/openai",
        "apiKey": "sk-你的GPT分组API Key",
        "timeout": 600000,
        "chunkTimeout": 30000
      },
      "models": {
        "gpt-5.5": {
          "name": "GPT-5.5",
          "limit": {
            "context": 400000,
            "output": 128000
          }
        }
      }
    }
  },
  "model": "codesome-v3-anthropic/claude-sonnet-4-6",
  "small_model": "codesome-v3-anthropic/claude-sonnet-4-6"
}
```

***

## 十、一句话版

在 OpenCode 的配置文件 `~/.config/opencode/config.json` 中：

* Claude 的 `baseURL` 设置为 `https://cc.codesome.ai`

* GPT 的 `baseURL` 设置为 `https://cc.codesome.ai/openai`

* 所有 provider 的 `apiKey` 都替换成你的 Codesome V3 API Key（如需同时使用两种模型，需要两个不同分组的 API Key）

* 保存后重启 OpenCode 即可
