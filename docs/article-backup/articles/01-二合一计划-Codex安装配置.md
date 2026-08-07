# 二合一 Codex 安装与配置指南

> 这篇只适用于二合一 + Codex。不要拿这篇配置 Claude Code，也不要拿这篇配置普通 V3。

## 适合谁读

* 你买的是二合一月卡。

* 你要使用 Codex CLI 或 Codex 桌面版。

* 你拿到的 key 常见是 `cr-...`。

* 你要把 Codex 接到 `https://v5.codesome.cn/openai`。

## 不适合谁读

| 你的情况                         | 应该看                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| 使用 V3 配 Codex，key 是 `sk-...` | [V3 Codex 安装与配置指南](v3-codex)        |
| 使用 V3 配 Claude Code          | [V3 Claude Code 安装与配置指南](v3-claude)  |
| 使用二合一配 Claude Code           | [二合一 Claude Code 安装与配置指南](combined-claude) |
| 已经报错                         | [使用问题速查](usage-faq)                  |

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

## 方法 1（推荐）：使用 CC switch 配置

方法 1 是唯一的配置流程：用 CC switch 管理请求地址、API Key、模型和本地代理配置，下面按系统同时提供 Codex CLI 的安装与验证步骤。CC switch 图形客户端支持 Windows 和 macOS；WSL 仅保留 CLI 安装步骤，CC switch 配置需在 Windows 或 macOS 中完成。

### Windows

前往 `https://github.com/farion1231/cc-switch/releases` 下载最新版本，选择对应的 `.msi` 安装包。

![ccswitch 安装包](<images/二合一 Codex 安装与配置指南-ccswitch_pkg1.png?v=1c51a08f4e1e3e2adc21a6a99af72e8a383e6d6fc3a3b0bc56c5a54f04f86493>)

![ccswitch 安装包](<images/二合一 Codex 安装与配置指南-ccswitch_pkg2.png?v=31a77070ab75372d5d0a2a331ab182d5e9127aa69ea5fb30d7c19beb449c1c49>)

安装完成后，获取你的二合一 key（`cr-...`）。

打开 ccswitch 主界面，点击右上角加号，创建供应商。注意一定要先切换到 codex 配置页面，需要在 ccswitch 主界面右上角点击 codex 图标再点击加号。

![ccswitch 右上角图标](<images/二合一 Codex 安装与配置指南-Screenshot 2026-07-11 215853.png?v=f33acb7a6545224ca37ad72ebf60e3db3921e7806449c79fc7e05668e3e9a64c>)

![ccswitch 填写二合一 Codex 配置](<images/二合一 Codex 安装与配置指南-image.png?v=d8c67319fe9b621bd4eea091ee95c0ea7d7b466221037d6f9a9f5d64038a8949>)

* 供应商名称填 `codesome-二合一`

* API Key 填你在二合一后台获得的 `cr-...` key

* 请求地址填 https://v5.codesome.cn/openai

* 模型名称填 `gpt-5.6-terra`

#### 安装并验证 Codex CLI

CC switch 配置完成后，还要安装 `codex` 命令。已经安装过 Codex 的用户可直接执行 `codex --version`，无需重复安装。

安装 Node.js：

```text
https://nodejs.org/en/download
```

安装完成后，在 PowerShell 验证：

```powershell
node -v
npm -v
```

安装 Codex：

```powershell
npm i -g @openai/codex
```

如果下载慢，可以使用镜像：

```powershell
npm i -g @openai/codex --registry=https://registry.npmmirror.com
```

验证：

```powershell
codex --version
```

### macOS

macOS 用户可以先执行：

```bash
brew tap farion1231/ccswitch
brew install --cask cc-switch
```

如果命令运行失败，前往 `https://github.com/farion1231/cc-switch/releases`，下载后缀是 `.dmg`的版本。

![ccswitch 安装包](<images/二合一 Codex 安装与配置指南-ccswitch_pkg1.png?v=1c51a08f4e1e3e2adc21a6a99af72e8a383e6d6fc3a3b0bc56c5a54f04f86493>)

![ccswitch 安装包](<images/二合一 Codex 安装与配置指南-ccswitch_pkg2.png?v=31a77070ab75372d5d0a2a331ab182d5e9127aa69ea5fb30d7c19beb449c1c49>)

macOS 在启动台选择 `cc-switch` 后，如果因为安全性问题无法打开，需要去：`设置` → `隐私与安全` → `安全性`，允许信任当前开发者。

![macOS 允许打开 cc-switch](<images/二合一 Codex 安装与配置指南-ccswitch_security.png?v=68b4d462edf23fe04de49e3822644b094c7bec1fc3028aa1a0d9a63bba65a17d>)

安装完成后，获取你的二合一 key（`cr-...`）。

打开 ccswitch 主界面，点击右上角加号，创建供应商。注意一定要先切换到 codex 配置页面。

![ccswitch 右上角图标](<images/二合一 Codex 安装与配置指南-Screenshot 2026-07-11 215853.png?v=f33acb7a6545224ca37ad72ebf60e3db3921e7806449c79fc7e05668e3e9a64c>)

![ccswitch 填写二合一 Codex 配置](<images/二合一 Codex 安装与配置指南-image.png?v=d8c67319fe9b621bd4eea091ee95c0ea7d7b466221037d6f9a9f5d64038a8949>)

* 供应商名称填 `codesome-二合一`

* API Key 填你在二合一后台获得的 `cr-...` key

* 请求地址填 https://v5.codesome.cn/openai

* 模型名称填 `gpt-5.6-terra`

#### 安装并验证 Codex CLI

CC switch 配置完成后，还要安装 `codex` 命令。已经安装过 Codex 的用户可直接执行 `codex --version`，无需重复安装。

安装 Node.js：

```text
https://nodejs.org/en/download
```

安装完成后，在终端验证：

```bash
node -v
npm -v
```

安装 Codex：

```bash
npm i -g @openai/codex
```

如果下载慢，可以使用镜像：

```bash
npm i -g @openai/codex --registry=https://registry.npmmirror.com
```

验证：

```bash
codex --version
```

### WSL

WSL 没有 CC switch 图形客户端。若你需要在 WSL 中安装 Codex CLI，可按下面步骤完成；CC switch 配置需在 Windows 或 macOS 中完成。

#### 安装并验证 Codex CLI

在 Windows PowerShell 输入：

```powershell
wsl
```

安装 Node.js：

```bash
sudo apt update
sudo apt install -y curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm alias default 'lts/*'
```

验证：

```bash
node -v
npm -v
```

安装 Codex：

```bash
npm i -g @openai/codex
```

### Codex 桌面版

**Codex 桌面版通常依赖 CLI。先完成本文的 CC switch 配置和 CLI 安装，再安装并打开桌面客户端。**

#### 下载地址

打开官方 Codex 桌面客户端下载页：

```text
https://developers.openai.com/codex/app
```

假如您无法访问，您可以看这里整理的安装包文档：

[codex安装包](https://oxv18tgb72z.feishu.cn/wiki/VqsgwplhVisZUokEDsacox7hnvb)

CC switch 配置和 CLI 安装完成后，打开 Codex 桌面客户端会看到类似界面。

![Codex 桌面客户端界面](<images/二合一 Codex 安装与配置指南-codex_desktop.png?v=7cb38254b32756e412a693956fcf22b42ce3c207fef9b02423a0032eadeb7a45>)

#### 使用顺序

1. **先按本文完成 CC switch 配置和二合一 Codex CLI 安装。**

2. 确认终端里执行 `codex` 可以正常进入并回复。

3. 打开安装包文档或官方下载地址，安装 Codex 桌面客户端。

4. 安装完成后打开桌面客户端。

5. 如果桌面版没有生效，退出后台进程后重新打开。

#### 注意事项

* 二合一 Codex 的 base URL 是 `https://v5.codesome.cn/openai`。

* 桌面版不是单独配置一套 Codesome；它通常读取本机 CLI 相关配置。

* 如果 CLI 没配好，桌面版大概率也不能正常使用。

* 如果你在 Windows / macOS / WSL 之间切换环境，先确认桌面版实际读取的是哪一套配置。

## 常见错误

1. 如果严格按本文配置后仍出现 503，请先回到 CC switch 的模型选择处，选择界面中正确显示的模型 ID `gpt-5.6-terra`，不要选择“自定义”。

2. 用 Claude Code 的 `ANTHROPIC_*` 配置 Codex。

3. 用二合一 Claude Code 地址 `https://v5.codesome.cn/api` 配 Codex。

4. 用 V3 地址 `https://cc.codesome.ai/v1` 配二合一。

5. 用 `sk-...` key 配二合一。

6. `~/.codex/config.toml` 不存在或写错。

7. 桌面版没重启。

8. WSL 和 Windows PowerShell 混在一起配置。

遇到报错，去看：

[使用问题速查：报错、账单与配置排查](usage-faq)
