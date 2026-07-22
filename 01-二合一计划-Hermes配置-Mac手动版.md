# 【最新】Hermes 二合一配置教程

本教程适用于 Codesome 二合一版本（V5）
\</quote-container>

# Mac 小白版：从零配好 Hermes（二合一版本）

## 一、安装 Git

打开终端，然后输入：

```plaintext
git --version
```

如果你看到了版本号，比如：

```plaintext
git version 2.39.3
```

说明 Git 已经装好了，可以继续下一步。

如果系统提示找不到 `git`，或者没有正常显示版本号，就先安装 Git。

在终端输入：

```plaintext
brew install git
```

## 二、安装 Hermes

运行官方安装命令：

```plaintext
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

安装完成后，重新加载 shell：

```plaintext
source ~/.zshrc
```

如果你不是 zsh，也可以试一下：

```plaintext
source ~/.bashrc
```

然后确认 Hermes 已经装好：

```plaintext
hermes version
```

## 三、配置模型

先创建配置目录：

```plaintext
mkdir -p ~/.hermes
```

然后打开配置文件：

```plaintext
nano ~/.hermes/config.yaml
```

### 方式一：使用 GPT模型（推荐）

把下面这段内容直接粘进去（使用 Control + V）：

```plaintext
model:
  default: "gpt-5.5"
  provider: "codesome-unified-codex"
  context_length: 2000000

custom_providers:
  - name: "codesome-unified-codex"
    base_url: "https://v5.codesome.cn/openai"
    key_env: "OPENAI_API_KEY"
    api_mode: "codex_responses"
    models:
      gpt-5.5:
        context_length: 2000000

terminal:
  backend: "local"
  cwd: "."
  timeout: 180
```

### 方式二：使用 Claude

或者也可以使用这个配置：

```plaintext
model:
  default: "claude-sonnet-4-6"
  provider: "codesome-unified-claude"
  context_length: 2000000

custom_providers:
  - name: "codesome-unified-claude"
    base_url: "https://v5.codesome.cn/api"
    key_env: "ANTHROPIC_API_KEY"
    api_mode: "anthropic_messages"
    models:
      claude-sonnet-4-6:
        context_length: 2000000
      claude-opus-4-6:
        context_length: 2000000

terminal:
  backend: "local"
  cwd: "."
  timeout: 180
```

保存并退出：

* 按 `Control + O` 保存（这是字母 o）

* 按回车确认

* 按 `Control + X` 退出

## 四、获取 API Key

您购买的是二合一月卡，下单后会收到以 `cr-` 开头的 API Key。

## 五、配置 API Key

打开 Hermes 的环境变量文件：

```plaintext
nano ~/.hermes/.env
```

### 如果你使用的是 Codex 配置

添加以下内容，把 key 替换成你自己的（使用 Control + V 粘贴）：

```plaintext
OPENAI_API_KEY=cr-你的二合一key
```

注意：虽然变量名是 `OPENAI_API_KEY`，但这里填的是 Codesome 二合一的 key（`cr-` 开头），因为 Codex 接口使用的是 OpenAI Responses 格式。

### 如果你使用的是 Claude 配置

添加以下内容：

```plaintext
ANTHROPIC_API_KEY=cr-你的二合一key
```

保存并退出：

* 按 `Control + O` 保存

* 按回车确认

* 按 `Control + X` 退出

## 六、验证模型配置

先确认模型能正常工作，运行：

```plaintext
hermes chat -q "Reply with exactly: HERMES_OK"
```

如果返回了：

```plaintext
HERMES_OK
```

如图：

说明你的模型配置已经通了，可以继续下一步。

## 七、配置聊天机器人

以上模型验证通过后，再继续接下来的操作。

在终端运行：

```plaintext
hermes gateway setup
```

进去以后选择你想要的渠道：

跟随向导，一步一步完成配置。

## 八、常用命令

启动 CLI：

```plaintext
hermes
```

直接问一句话：

```plaintext
hermes chat -q "请用最简单的话告诉我 Hermes 能做什么"
```

继续上一次会话：

```plaintext
hermes -c
```

检查配置有没有问题：

```plaintext
hermes doctor
```

开一个新对话：

进入 Hermes 以后输入：

```plaintext
/new
```

## 九、常见错误

### 401 错误

如果遇到 401 错误，请检查：

1. API key 是否正确（二合一的 key 应该以 `cr-` 开头）

2. API key 是否已过期

3. 环境变量名称是否正确：

   * Codex 配置使用 `OPENAI_API_KEY`

   * Claude 配置使用 `ANTHROPIC_API_KEY`

### 连接超时

如果遇到连接超时，请检查：

1. 网络连接是否正常

2. 是否能访问 `https://v5.codesome.cn`

3. 防火墙或代理设置是否正确

### Unknown provider 错误

如果遇到 `Unknown provider` 错误，可以尝试使用回退配置：

**Codex 回退配置：**

```plaintext
model:
  default: gpt-5.5
  provider: custom
  base_url: https://v5.codesome.cn/openai
  api_mode: codex_responses
  context_length: 2000000

terminal:
  backend: local
  cwd: .
  timeout: 180
```

**Claude 回退配置：**

```plaintext
model:
  default: claude-sonnet-4-6
  provider: custom
  base_url: https://v5.codesome.cn/api
  api_mode: anthropic_messages
  context_length: 2000000

terminal:
  backend: local
  cwd: .
  timeout: 180
```

## 十、二合一版本与 V3 版本的区别

***

## 相关链接

* Codesome 二合一后台：https://v5.codesome.cn

* Hermes 官方文档：https://github.com/NousResearch/hermes-agent

* Codesome 主文档：[站内文章](03-Agentic入门宝典.md)
