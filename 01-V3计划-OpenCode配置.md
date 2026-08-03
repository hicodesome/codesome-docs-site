# V3 OpenCode 配置指南

## V3 如何配置 OpenCode

V3 如何配置希望在 **OpenCode** 中使用 Claude 或 GPT 模型的用户。

> 说明：OpenCode 的详细配置不是本文关注的重点。为降低使用成本，下面直接给出可用的示例配置，关键项（baseURL、模型 ID、API Key）都在里面，照抄替换即可。

## 当前 V3 套餐支持的模型

**Claude 模型**（通过 Anthropic Messages 格式）：

* `claude-sonnet-5`

* `claude-opus-5`

**GPT 模型**（通过 OpenAI Responses 格式）：

* `gpt-5.6-luna`：适合简单、低成本任务

* `gpt-5.6-terra`：适合日常开发，推荐作为默认模型

* `gpt-5.6-sol`：适合高难度任务

* `gpt-5.6`：默认模型 ID，当前对应 Sol 档

## 配置文件位置

OpenCode 的全局配置文件路径一般是：

```bash
~/.config/opencode/opencode.json
```

如果这个文件不存在，可以手动创建。OpenCode 同时支持 `opencode.jsonc`，如果原来用的是 `opencode.jsonc`，可以继续使用。

如果你已经有配置文件，**不要直接覆盖**，可以把原配置和下面的示例配置一起发给 AI，让它帮你合并到现有配置中。

## 方案一：只使用 Claude

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
        "claude-sonnet-5": {
          "name": "Claude Sonnet 5"
        },
        "claude-opus-5": {
          "name": "Claude Opus 5"
        }
      }
    }
  },
  "model": "codesome-v3-anthropic/claude-sonnet-5",
  "small_model": "codesome-v3-anthropic/claude-sonnet-5"
}
```

## 方案二：只使用 GPT

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
        "gpt-5.6-luna": {
          "name": "GPT-5.6 Luna",
          "limit": {
            "context": 1050000,
            "output": 128000
          }
        },
        "gpt-5.6-terra": {
          "name": "GPT-5.6 Terra",
          "limit": {
            "context": 1050000,
            "output": 128000
          }
        },
        "gpt-5.6-sol": {
          "name": "GPT-5.6 Sol",
          "limit": {
            "context": 1050000,
            "output": 128000
          }
        },
        "gpt-5.6": {
          "name": "GPT-5.6（默认 Sol）",
          "limit": {
            "context": 1050000,
            "output": 128000
          }
        }
      }
    }
  },
  "model": "codesome-v3-openai/gpt-5.6-terra",
  "small_model": "codesome-v3-openai/gpt-5.6-terra"
}
```

## 方案三：同时使用 Claude 和 GPT

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
        "claude-sonnet-5": {
          "name": "Claude Sonnet 5"
        },
        "claude-opus-5": {
          "name": "Claude Opus 5"
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
        "gpt-5.6-luna": {
          "name": "GPT-5.6 Luna",
          "limit": {
            "context": 1050000,
            "output": 128000
          }
        },
        "gpt-5.6-terra": {
          "name": "GPT-5.6 Terra",
          "limit": {
            "context": 1050000,
            "output": 128000
          }
        },
        "gpt-5.6-sol": {
          "name": "GPT-5.6 Sol",
          "limit": {
            "context": 1050000,
            "output": 128000
          }
        },
        "gpt-5.6": {
          "name": "GPT-5.6（默认 Sol）",
          "limit": {
            "context": 1050000,
            "output": 128000
          }
        }
      }
    }
  },
  "model": "codesome-v3-anthropic/claude-sonnet-5",
  "small_model": "codesome-v3-anthropic/claude-sonnet-5"
}
```

**注意**：目前 Codesome V3 的分组机制下，**一个 API Key 只能对应一类模型**。

* 如果你的 API Key 属于 Claude 分组，只能用于 Claude 模型，无法使用 GPT 模型
* 如果你的 API Key 属于 GPT 分组，只能用于 GPT 模型，无法使用 Claude 模型

因此同时使用两种模型，需要准备两个不同分组的 API Key，分别填入两个 provider 的 `apiKey`。

## 替换 API Key

找到配置里的这一行（多个 provider 就有多行）：

```json
"apiKey": "sk-请替换成你的API Key"
```

把它替换成你自己的 Codesome V3 API Key：

```json
"apiKey": "sk-xxxxxxxxxxxxxxxx"
```

**注意**：

* API Key 前后要保留英文双引号，不要多加空格
* 不要把 API Key 发到公开群、论坛、GitHub 或截图里

## 关键点

* **baseURL 别搞混**：Claude 用 `https://cc.codesome.ai`，GPT 用 `https://cc.codesome.ai/openai`；V3 不需要 `/api/v1` 后缀。配错会出现 `Not Found` 或路径错误。
* **默认模型**：`model` 和 `small_model` 决定 OpenCode 默认使用哪个模型，按需换成上面任意模型 ID。日常开发推荐 `codesome-v3-openai/gpt-5.6-terra`；主模型和小模型也可以不同。
* **重启生效**：保存后完全退出并重新打开 OpenCode，避免旧配置缓存。
* **切换模型**：配置完成后，在 OpenCode 里随时用斜杠命令 `/models` 打开模型选择界面，选择你想使用的模型即可。
