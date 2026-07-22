本文适用于已经购买 **Codesome 二合一月卡**，并希望在 **OpenCode** 中使用 Claude 或 GPT 模型的用户。

当前二合一月卡支持：

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

这个文件还有可能是jsonl后缀，

***

## 二、选择配置方案

根据你想使用的模型，选择对应的配置：

### 方案 A：只配置 Claude

如果你只想使用 Claude 模型，使用这个配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "codesome-anthropic": {
      "npm": "@ai-sdk/anthropic",
      "name": "Codesome 二合一 Claude",
      "options": {
        "baseURL": "https://v5.codesome.cn/api/v1",
        "apiKey": "cr-请替换成你的API Key",
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
  "model": "codesome-anthropic/claude-sonnet-4-6",
  "small_model": "codesome-anthropic/claude-sonnet-4-6"
}
```

### 方案 B：只配置 GPT

如果你只想使用 GPT 模型，使用这个配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "codesome-openai": {
      "npm": "@ai-sdk/openai",
      "name": "Codesome 二合一 OpenAI",
      "options": {
        "baseURL": "https://v5.codesome.cn/openai",
        "apiKey": "cr-请替换成你的API Key",
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
  "model": "codesome-openai/gpt-5.5",
  "small_model": "codesome-openai/gpt-5.5"
}
```

### 方案 C：同时配置 Claude 和 GPT（推荐）

如果你想同时配置两种模型，可以随时切换，使用这个配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "codesome-anthropic": {
      "npm": "@ai-sdk/anthropic",
      "name": "Codesome 二合一 Claude",
      "options": {
        "baseURL": "https://v5.codesome.cn/api/v1",
        "apiKey": "cr-请替换成你的API Key",
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
    "codesome-openai": {
      "npm": "@ai-sdk/openai",
      "name": "Codesome 二合一 OpenAI",
      "options": {
        "baseURL": "https://v5.codesome.cn/openai",
        "apiKey": "cr-请替换成你的API Key",
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
  "model": "codesome-anthropic/claude-sonnet-4-6",
  "small_model": "codesome-anthropic/claude-sonnet-4-6"
}
```

***

## 三、替换 API Key

找到这一行（或多行，如果你配置了多个 provider）：

```json
"apiKey": "cr-请替换成你的API Key"
```

把里面的内容替换成你自己的 Codesome API Key，例如：

```json
"apiKey": "cr-xxxxxxxxxxxxxxxx"
```

**重要提示**：

* 如果你同时配置了 Claude 和 GPT，两个 provider 的 `apiKey` 都要替换成**同一个** Codesome API Key

* API Key 前后要保留英文双引号

* 不要多加空格

* 不要把 API Key 发到公开群、论坛、GitHub 或截图里

***

## 四、模型说明

### 默认模型

配置中的 `model` 和 `small_model` 决定了 OpenCode 默认使用哪个模型。

**推荐配置**（使用 Claude Sonnet 4.6）：

```json
"model": "codesome-anthropic/claude-sonnet-4-6",
"small_model": "codesome-anthropic/claude-sonnet-4-6"
```

### 切换到 GPT

如果你想默认使用 GPT-5.5，可以改成：

```json
"model": "codesome-openai/gpt-5.5",
"small_model": "codesome-openai/gpt-5.5"
```

### 切换到 Opus

如果你想默认使用 Claude Opus 4.7，可以改成：

```json
"model": "codesome-anthropic/claude-opus-4-7",
"small_model": "codesome-anthropic/claude-opus-4-7"
```

### 混合使用

你也可以让主模型和小模型使用不同的配置，例如：

```json
"model": "codesome-anthropic/claude-opus-4-7",
"small_model": "codesome-anthropic/claude-sonnet-4-6"
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

![](<images/二合一月卡如何配置 OpenCode-切换模型使用斜杠model命令.png?v=f9efdd9979736c507ba9986e3b9d2c483cc6d4090840311219b53efb281b81fd>)

执行命令后会显示可用的模型列表，选择你想使用的模型即可：

![](<images/二合一月卡如何配置 OpenCode-这是命令执行后的选模型界面.png?v=e7455b388fd700f3f3d87806783d1ff9af0edf7a536a5a12ec7da3f5b7d4e50b>)

***

## 七、常见报错说明

### 1. Claude 报错：`Not Found: Route /api/messages not found`

如果使用 Claude 模型时看到类似报错：

```txt
Not Found: Route /api/messages not found
```

说明 Claude 的 `baseURL` 配错了。

请确认配置里是：

```json
"baseURL": "https://v5.codesome.cn/api/v1"
```

不是：

```json
"baseURL": "https://v5.codesome.cn/api"
```

**原因**：OpenCode 使用 `@ai-sdk/anthropic` 时，会自动在 `baseURL` 后面拼接 `/messages`。

所以正确请求地址应该是：

```txt
https://v5.codesome.cn/api/v1/messages
```

如果少了 `/v1`，就会请求到：

```txt
https://v5.codesome.cn/api/messages
```

这个地址不存在，所以会报错。

***

### 2. GPT 报错：路径错误

如果使用 GPT 模型时报错，请确认 GPT 的 `baseURL` 是：

```json
"baseURL": "https://v5.codesome.cn/openai"
```

注意：

* Claude 的 baseURL 是 `https://v5.codesome.cn/api/v1`

* GPT 的 baseURL 是 `https://v5.codesome.cn/openai`

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
"apiKey": "cr-xxxxxxxxxxxxxxxx"
```

错误示例：

```json
"apiKey": cr-xxxxxxxxxxxxxxxx
```

JSON 对格式非常敏感，敏感程度堪比半夜两点的客服群。

***

### 4. 已经有配置文件怎么办？

如果你已经有自己的 `config.json`，不要直接覆盖。

可以把你的原配置和本文配置一起发给 AI，并告诉它：

```txt
请帮我把 Codesome 二合一的 Claude 和 GPT provider 合并到我现有的 OpenCode config.json 中，不要删除我原来的配置。
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
"https://v5.codesome.cn/api/v1"
```

1. GPT 的 `baseURL` 是否为：

```json
"https://v5.codesome.cn/openai"
```

1. 所有 provider 的 `apiKey` 是否都已经替换成自己的 Codesome API Key

2. 默认模型是否已设置（推荐 `codesome-anthropic/claude-sonnet-4-6`）

3. 修改后是否已经重启 OpenCode

***

## 九、完整推荐配置（Claude + GPT）

如果你是第一次配置 OpenCode，并且想同时使用 Claude 和 GPT，直接使用下面这一份即可：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "codesome-anthropic": {
      "npm": "@ai-sdk/anthropic",
      "name": "Codesome 二合一 Claude",
      "options": {
        "baseURL": "https://v5.codesome.cn/api/v1",
        "apiKey": "cr-请替换成你的API Key",
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
    "codesome-openai": {
      "npm": "@ai-sdk/openai",
      "name": "Codesome 二合一 OpenAI",
      "options": {
        "baseURL": "https://v5.codesome.cn/openai",
        "apiKey": "cr-请替换成你的API Key",
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
  "model": "codesome-anthropic/claude-sonnet-4-6",
  "small_model": "codesome-anthropic/claude-sonnet-4-6"
}
```

记得把两个 `apiKey` 都替换成你自己的 Codesome API Key。

***

## 十、一句话版

在 OpenCode 的配置文件 `~/.config/opencode/config.json` 中：

* Claude 的 `baseURL` 设置为 `https://v5.codesome.cn/api/v1`

* GPT 的 `baseURL` 设置为 `https://v5.codesome.cn/openai`

* 所有 provider 的 `apiKey` 都替换成你的 Codesome API Key

* 保存后重启 OpenCode 即可
