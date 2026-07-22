> 这篇只适用于二合一 + Codex。不要拿这篇配置 Claude Code，也不要拿这篇配置普通 V3。

## 适合谁读

* 你买的是二合一月卡。

* 你要使用 Codex CLI 或 Codex 桌面版。

* 你拿到的 key 常见是 `cr-...`。

* 你要把 Codex 接到 `https://v5.codesome.cn/openai`。

## 不适合谁读

| 你的情况                         | 应该看                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| 使用 V3 配 Codex，key 是 `sk-...` | [V3 Codex 安装与配置指南](01-V3计划-Codex安装配置.md)        |
| 使用 V3 配 Claude Code          | [V3 Claude Code 安装与配置指南](01-V3计划-ClaudeCode安装配置.md)  |
| 使用二合一配 Claude Code           | [二合一 Claude Code 安装与配置指南](01-二合一计划-ClaudeCode安装配置.md) |
| 已经报错                         | [使用问题速查](02-使用问题速查.md)                  |

## Codex 和 Claude Code 的关键区别

| 工具                   | 二合一地址                           |
| -------------------- | ------------------------------- |
| Claude Code          | `https://v5.codesome.cn/api`    |
| Codex / OpenAI 格式客户端 | `https://v5.codesome.cn/openai` |

如果你正在配置 Codex，不要照 Claude Code 教程写 `ANTHROPIC_*`，也不要使用 `/api` 地址。

## 配置前确认

1. 你使用的是二合一入口：`https://v5.codesome.cn`。

2. 二合一不在 V3 主站兑换。

3. 你的 API Key 常见是 `cr-...`。

4. 你正在配置的是 Codex，不是 Claude Code。

5. Codex 地址必须使用：`https://v5.codesome.cn/openai`。

二合一 Codex 核心配置：

## 方法 1（推荐）：用 ccswitch 配置二合一 Codex

### 1. 安装 ccswitch

macOS 用户可以先执行：

如果命令运行失败，前往 `https://github.com/farion1231/cc-switch/releases`，下载后缀是 `.dmg`的版本。

Windows 用户前往 `https://github.com/farion1231/cc-switch/releases` 下载最新版本，并选择对应的 `.msi` 安装包。

![](<images/二合一 Codex 安装与配置指南-ccswitch_pkg1.png>)

![](<images/二合一 Codex 安装与配置指南-ccswitch_pkg2.png>)

### 2. 首次打开时的系统安全提示

macOS 在启动台选择 `cc-switch` 后，如果因为安全性问题无法打开，需要去：`设置` → `隐私与安全` → `安全性`，允许信任当前开发者。

![](<images/二合一 Codex 安装与配置指南-ccswitch_security.png>)

### 3. 获取二合一 Codex Key

下单后即可获取对应 key。你的 key 是 `cr-...`。

### 4. 创建二合一供应商

打开 ccswitch 主界面，点击右上角加号，创建供应商。这里只写二合一 Codex 配置，不适用于 V3。

注意一定要先切换到codex配置页面，需要在ccswitch主界面右上角点击codex图标再点击加号

![](<images/二合一 Codex 安装与配置指南-Screenshot 2026-07-11 215853.png>)



![](<images/二合一 Codex 安装与配置指南-image.png>)

* 供应商名称填 `codesome-`二合一

* API Key 填你在二合一后台获得的 `cr-...` key

* 请求地址填 <https://v5.codesome.cn/openai>

* 模型名称填 `gpt-5.5`

## 以下是环境变量方式配置，不再推荐（方法2）

## Windows PowerShell 推荐路径

### 1. 安装 Node.js

打开：

Node.js 下载页用于确认 Windows Installer 的位置。

![](<images/二合一 Codex 安装与配置指南-win_nodejs.png>)

安装 Windows Installer 后，在 PowerShell 验证：

### 2. 安装 Codex

如果下载慢，可以使用镜像：

验证：

### 3. 写入二合一 Codex 配置

先设置 key：

再执行下面这一整段（不要做任何修改，直接粘贴。）：

### 4. 验证

重新打开 PowerShell：

## macOS 推荐路径

### 1. 安装 Node.js

打开：

Node.js 下载页用于确认 macOS Installer 的位置。

![](<images/二合一 Codex 安装与配置指南-mac_nodejs.png>)

安装后

打开终端：按 `Command + 空格`，搜索"终端"，回车。后面的安装和验证都在这个窗口里完成。

![](<images/二合一 Codex 安装与配置指南-mac_terminal.gif>)

验证：

### 2. 安装 Codex

如果下载慢，可以使用镜像：

### 3. 写入二合一 Codex 配置

然后执行：

### 4. 验证

新开终端：

## WSL 推荐路径

### 1. 进入 WSL

在 Windows PowerShell 输入：

### 2. 安装 Node.js

验证：

### 3. 安装 Codex

### 4. 配置

WSL 里的配置方式和 macOS/Linux 一样，使用 `~/.codex/config.toml`，`base_url` 必须是：

可以直接复用上一节 macOS 的配置命令。

## Codex 桌面版

**Codex 桌面版通常依赖 CLI 配置。先把二合一 Codex CLI 配好，再安装并打开桌面客户端。**

### 下载地址

打开官方 Codex 桌面客户端下载页：

假如您无法访问，您可以看这里整理的安装包文档：

[codex安装包](https://oxv18tgb72z.feishu.cn/wiki/VqsgwplhVisZUokEDsacox7hnvb)

CLI 配置完成后，打开 Codex 桌面客户端会看到类似界面。

![](<images/二合一 Codex 安装与配置指南-codex_desktop.png>)

### 使用顺序

1. **先按本文完成二合一 Codex CLI 安装与配置。**

2. 确认终端里执行 `codex` 可以正常进入并回复。

3. 打开安装包文档或官方下载地址，安装 Codex 桌面客户端。

4. 安装完成后打开桌面客户端。

5. 如果桌面版没有生效，退出后台进程后重新打开。

### 注意事项

* 二合一 Codex 的 base URL 是 `https://v5.codesome.cn/openai`。

* 桌面版不是单独配置一套 Codesome；它通常读取本机 CLI 相关配置。

* 如果 CLI 没配好，桌面版大概率也不能正常使用。

* 如果你在 Windows / macOS / WSL 之间切换环境，先确认桌面版实际读取的是哪一套配置。

## 常见错误

1. 用 Claude Code 的 `ANTHROPIC_*` 配置 Codex。

2. 没有设置 `CODESOME_API_KEY`。

3. 用二合一 Claude Code 地址 `https://v5.codesome.cn/api` 配 Codex。

4. 用 V3 地址 `https://cc.codesome.ai/v1` 配二合一。

5. 用 `sk-...` key 配二合一。

6. `~/.codex/config.toml` 不存在或写错。

7. 桌面版没重启。

8. WSL 和 Windows PowerShell 混在一起配置。

遇到报错，去看：

[使用问题速查：报错、账单与配置排查](02-使用问题速查.md)
