## 适用场景

如果你使用的是 **CC 月卡** 或 **二合一月卡**，在 Claude Code 中可能会遇到**上下文无法自动压缩/4 0 0 错误**的问题，导致对话超出上下文窗口限制后无法继续。

推荐配置 Claude 上下文自动压缩功能，让 Claude Code 在接近上下文限制时自动压缩历史对话。

## 配置方式

### 方式一：如果您是通过环境变量方式配置的

如果您按照配置教程使用环境变量方式配置 Claude Code，需要将自动压缩配置持久化写入配置文件。

#### Windows 配置

在 PowerShell 中执行：

```plain&#x20;text
setx CLAUDE_AUTO_COMPACT_ENABLED "true"
setx CLAUDE_AUTO_COMPACT_WINDOW "150000"

```

关闭当前 PowerShell，重新打开一个新 PowerShell，然后启动 `claude` 即可生效。

#### macOS / Linux 配置

将环境变量写入 shell 配置文件：

```bash
echo 'export CLAUDE_AUTO_COMPACT_ENABLED=true' >> ~/.zshrc
echo 'export CLAUDE_AUTO_COMPACT_WINDOW=150000' >> ~/.zshrc

source ~/.zshrc
claude

```

如果你使用的是 Bash，将 `~/.zshrc` 替换为 `~/.bashrc`。

### 方式二：如果您是使用 ccswitch 配置的

如果您按照配置教程使用 ccswitch 配置 Claude Code：

* 打开 ccswitch 应用

* 找到配置文件位置（通常在 ccswitch 设置中可以查看）

* 编辑配置的 JSON 文件，在对应供应商配置中添加环境变量：

```json
{
  "providers": [
    {
      "name": "codesome-v3",
      "baseUrl": "https://cc.codesome.ai",
      "apiKey": "你的 API Key",
      "env": {
        "CLAUDE_AUTO_COMPACT_ENABLED": "true",
        "CLAUDE_AUTO_COMPACT_WINDOW": "150000"
      }
    }
  ]
}

```

**提示**：如果您不知道怎么修改这个 JSON 文件，可以直接让 AI（如 Claude、ChatGPT）帮您配置，把当前配置文件内容发给 AI，告诉它需要添加自动压缩配置即可。

保存后重启 Claude Code 生效。

## 参数说明

* `CLAUDE_AUTO_COMPACT_ENABLED=true`：启用自动压缩功能

* `CLAUDE_AUTO_COMPACT_WINDOW=150000`：设置压缩窗口为 150000 tokens（约 15 万 tokens）

## 验证配置

配置完成后，启动 Claude Code：

```bash
claude

```

在长对话过程中，当上下文接近限制时，Claude Code 会自动压缩历史对话，你会看到类似提示：

```plain&#x20;text
Context window approaching limit, compacting conversation history...

```

## 常见问题

**Q: 压缩窗口设置多大合适？**

* 默认推荐 `150000` tokens（约 15 万 tokens）

* 如果对话特别长，可以适当调大，如 `200000`

* 不建议设置过小，可能导致频繁压缩影响体验

**Q: 配置后仍然无法压缩怎么办？**

* 确认已重启 Claude Code（关闭当前终端，重新打开）

* Windows 用户检查环境变量：在 PowerShell 中执行 `Get-ChildItem Env: | Where-Object { $_.Name -like 'CLAUDE*' }`

* macOS / Linux 用户检查环境变量：`env | grep CLAUDE`

* 如果使用 ccswitch，检查 JSON 配置格式是否正确

* 如果仍有问题，请在用户群反馈

## 适用版本

* V3 Claude Code（`sk-...` key）

* 二合一 Claude Code（`cr-...` key）

两种版本的配置方式完全相同。
