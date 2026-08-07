# V3 Claude Code 安装与配置指南

> 这篇只适用于 V3 + Claude Code。不要拿这篇配置 Codex，也不要拿这篇配置二合一。

## 适合谁读

* 你要使用 Claude Code。

* 你买的是 V3 / 普通 Codesome API / V3 月卡或按量。

* 你已经完成兑换，并创建了 V3 API Key。

* 你的 key 常见形态是 `sk-...`。

## 不适合谁读

| 你的情况                   | 应该看                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| 要配置 V3 Codex           | [V3 Codex 安装与配置指南](v3-codex)        |
| 使用二合一月卡，key 是 `cr-...` | [二合一 Claude Code 安装与配置指南](combined-claude) |
| 要配置二合一 Codex           | [二合一 Codex 安装与配置指南](combined-codex)       |
| 已经报错                   | [使用问题速查](usage-faq)                  |

## 配置前确认

1. 已经在 V3 后台完成兑换。

2. 已经创建 `sk-...` API Key。

3. API Key 分组选对：月卡选月卡/订阅分组，按量选按量分组。

4. 你正在配置的是 Claude Code，不是 Codex。

5. 如果以前配置过其他 Claude / Anthropic 地址，建议先清理旧环境变量。

> **切换到 Max 分组后要新开窗口：**&#x5982;果你是从其他分组切换到 `Max` 分组，请关闭当前 Claude Code 窗口，重新打开一个新窗口再测试。旧窗口可能沿用旧会话或旧进程状态，继续测试容易误以为 Codesome API 出问题。

## 大扫除：先清理残留配置

> **重要：**&#x5982;果你以前配置过其他 Claude / Anthropic 地址、其他中转站，或者从别的分组切换过来，先做这一步。很多配置失败不是新 key 有问题，而是旧环境变量还在生效。
>
> 下面命令执行时如果出现红字报错，通常说明对应变量本来不存在，可以继续下一步。

### Windows 清理环境变量和旧配置

在 PowerShell 里执行，先清理当前用户级环境变量：

```powershell
$vars = @(
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
  'CLAUDE_CODE_SUBAGENT_MODEL',
  'CLAUDE_CODE_EFFORT_LEVEL'
)

foreach ($var in $vars) {
  reg delete HKCU\Environment /V $var /F 2>$null
  Remove-Item "Env:$var" -ErrorAction SilentlyContinue
}

Get-ChildItem Env: |
  Where-Object {
    $_.Name -like 'ANTHROPIC_*' -or
    $_.Name -like 'CLAUDE_CODE_*'
  }

Get-ItemProperty HKCU:\Environment |
  Select-Object *ANTHROPIC*, *CLAUDE_CODE*
```

如果你以前用管理员权限配置过，还需要用"管理员身份运行"的 PowerShell 清理系统级环境变量：

```powershell
$machineEnvPath = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment'

Get-ItemProperty -Path $machineEnvPath |
  Get-Member -MemberType NoteProperty |
  Where-Object {
    $_.Name -like 'ANTHROPIC_*' -or
    $_.Name -like 'CLAUDE_CODE_*'
  } |
  ForEach-Object {
    Remove-ItemProperty -Path $machineEnvPath -Name $_.Name -ErrorAction SilentlyContinue
    Write-Host "Removed machine env:" $_.Name
  }
```

### macOS / Linux 清理环境变量和旧配置

如果你在 macOS、Linux 或 WSL 里配置过 Claude Code，也要清理当前 Session、shell 配置文件和旧的 `settings.json`。

```bash
# 临时清除当前 Session 环境变量
unset ANTHROPIC_BASE_URL
unset ANTHROPIC_AUTH_TOKEN
unset ANTHROPIC_MODEL
unset ANTHROPIC_DEFAULT_OPUS_MODEL
unset ANTHROPIC_DEFAULT_SONNET_MODEL
unset ANTHROPIC_DEFAULT_HAIKU_MODEL
unset CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
unset CLAUDE_CODE_SUBAGENT_MODEL
unset CLAUDE_CODE_EFFORT_LEVEL
unset OPENAI_API_KEY
unset CODESOME_API_KEY
unset SUB2API_API_KEY
unset http_proxy
unset https_proxy
unset HTTP_PROXY
unset HTTPS_PROXY
unset ALL_PROXY

# 清理 shell 配置文件里的旧变量
cleanup_file() {
  file="$1"
  [ -f "$file" ] || return 0
  tmp="$(mktemp)"
  grep -Ev 'ANTHROPIC|CLAUDE|OPENAI|CODESOME|SUB2API|proxy|PROXY' "$file" > "$tmp"
  cat "$tmp" > "$file"
  rm -f "$tmp"
}

cleanup_file ~/.zshrc
cleanup_file ~/.bashrc
cleanup_file ~/.bash_profile
cleanup_file ~/.profile

# 删除 Claude Code 旧配置文件
rm -f ~/.claude/settings.json

# 重新加载 shell 配置
source ~/.zshrc 2>/dev/null
source ~/.bashrc 2>/dev/null

# 检查是否还有残留
env | grep -E 'ANTHROPIC|CLAUDE|OPENAI|CODESOME|SUB2API|proxy|PROXY'

echo ""
echo "如果没有任何输出，说明环境变量已基本清理完成。"
```

清理完成后，关闭当前终端，重新打开一个新终端。

V3 Claude Code 核心配置：

```text
ANTHROPIC_BASE_URL=https://cc.codesome.ai
ANTHROPIC_AUTH_TOKEN=你的 sk-... 开头 API Key
CLAUDE_CODE_ATTRIBUTION_HEADER=0
```

## 方法 1（推荐）：使用 CC switch 配置

方法 1 是完整的推荐流程：安装 Claude Code CLI 后，再用 CC switch 管理请求地址、API Key 和本地代理配置。CC switch 本身不负责安装 CLI；Windows、macOS 和 Linux 都有当前客户端安装包，请继续完成对应系统的 CLI 安装与验证。

### Windows

打开 ccswitch 下载页：<https://github.com/farion1231/cc-switch/releases>

在页面的 Assets 区域下载 Windows 版本的 `.msi` 安装包。如果 GitHub 无法打开，在 Codesome 用户群说明"需要 ccswitch 安装包"。

> 不要从第三方网盘或来路不明的页面下载 ccswitch。

安装完成后打开 ccswitch，新建自定义配置。注意勾选最左侧的 claude 图标（不要选第二个带电脑标志的）。

![](<images/V3 Claude Code 安装与配置指南-image.png?v=f94e070d858fe20a48c89abd5aa037d6c326f9000c16dec35f60e428bdc617ba>)

按下图填写：

* 供应商名称填：`codesome-v3`

* 请求地址填：`https://cc.codesome.ai`

* API Key 填你的 `sk-...` 开头 API Key

![](<images/V3 Claude Code 安装与配置指南-image-1.png?v=0a2cb18e441bfbaf7943886143cee14c521b067cb78a5503eadf1e264c22accb>)

如果买的是月卡，记得在后台把这个 API Key 选到月卡/订阅分组。

#### 安装并验证 Claude Code CLI

CC switch 配置完成后，还要安装 `claude` 命令。已经安装过 Claude Code 的用户可直接执行 `claude --version`，无需重复安装。

Git for Windows 不是运行官方安装器的硬性前提，没有安装时 Claude Code 可以继续使用 PowerShell。不过仍然推荐安装：Claude Code 和其他 Agent 后续经常需要读取 Git 仓库、查看改动和提交代码，Git 基本属于必装的开发工具，建议现在一并安装：

```text
https://git-scm.com/download/win
```

打开 PowerShell（不要用 CMD），安装 Claude Code：

```powershell
irm https://claude.ai/install.ps1 | iex
```

验证：

```powershell
claude --version
```

### macOS

打开 ccswitch 下载页：<https://github.com/farion1231/cc-switch/releases>

在页面的 Assets 区域下载对应系统的安装包：按自己的芯片选择 Apple Silicon 或 Intel 版本的 `.dmg` 安装包。如果 GitHub 无法打开，在 Codesome 用户群说明"需要 ccswitch 安装包"。

![ccswitch macOS 安装包](<images/V3 Claude Code 安装与配置指南-ccswitch-macos-download.png?v=1c51a08f4e1e3e2adc21a6a99af72e8a383e6d6fc3a3b0bc56c5a54f04f86493>)

> 不要从第三方网盘或来路不明的页面下载 ccswitch。

macOS 首次打开如果遇到安全提示，需要在系统设置里允许打开当前开发者。

![macOS 允许打开 cc-switch](<images/V3 Claude Code 安装与配置指南-ccswitch-macos-security.png?v=68b4d462edf23fe04de49e3822644b094c7bec1fc3028aa1a0d9a63bba65a17d>)

安装完成后打开 ccswitch，新建自定义配置。注意勾选最左侧的 claude 图标（不要选第二个带电脑标志的）。

![](<images/V3 Claude Code 安装与配置指南-image.png?v=f94e070d858fe20a48c89abd5aa037d6c326f9000c16dec35f60e428bdc617ba>)

按下图填写：

* 供应商名称填：`codesome-v3`

* 请求地址填：`https://cc.codesome.ai`

* API Key 填你的 `sk-...` 开头 API Key

![](<images/V3 Claude Code 安装与配置指南-image-1.png?v=0a2cb18e441bfbaf7943886143cee14c521b067cb78a5503eadf1e264c22accb>)

如果买的是月卡，记得在后台把这个 API Key 选到月卡/订阅分组。

#### 安装并验证 Claude Code CLI

CC switch 配置完成后，还要安装 `claude` 命令。已经安装过 Claude Code 的用户可直接执行 `claude --version`，无需重复安装。

先安装 Node.js：

```text
https://nodejs.org/en/download
```

安装完成后，在终端验证：

```bash
node -v
npm -v
```

通过 npm 安装 Claude Code：

```bash
npm install -g @anthropic-ai/claude-code
```

如果默认 npm 下载慢或无法连接，使用镜像：

```bash
npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com
```

不要在 npm 安装命令前加 `sudo`。遇到权限或路径问题（无法写入 `/usr/local`）时，先看[使用问题速查](usage-faq)里的「npm 全局安装权限与路径修复」。

验证：

```bash
claude --version
```

### Linux

CC Switch 当前 Release 提供 Linux x86_64/ARM64 的 AppImage、deb 和 rpm。请从 <https://github.com/farion1231/cc-switch/releases> 下载与你的架构和发行版匹配的安装包，再按本节相同字段创建供应商。

先确认 Node.js 和 npm 已安装：

```bash
node -v
npm -v
```

如果未安装，Ubuntu / Debian 可以执行：

```bash
sudo apt update
sudo apt install -y nodejs npm
```

通过 npm 安装 Claude Code：

```bash
npm install -g @anthropic-ai/claude-code
```

如果默认 npm 无法连接，使用镜像：

```bash
npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com
```

不要使用 `sudo npm install -g`。遇到权限或路径问题（无法写入 `/usr/local`）时，先看[使用问题速查](usage-faq)里的「npm 全局安装权限与路径修复」。安装完成后验证：

```bash
claude --version
```

## 方法 2：不使用 CC switch，手动安装 CLI 并配置

方法 2 是方法 1 的替代流程，不是方法 1 的必做下一步。如果已经按方法 1 安装并验证过 CLI，不要重复安装；只有在不使用 CC switch 时，才从本节开始手动配置。

### Windows

#### 安装 Claude Code CLI

Git for Windows 不是运行官方安装器的硬性前提，没有安装时 Claude Code 可以继续使用 PowerShell。不过仍然推荐安装：Claude Code 和其他 Agent 后续经常需要读取 Git 仓库、查看改动和提交代码，Git 基本属于必装的开发工具，建议现在一并安装：

```text
https://git-scm.com/download/win
```

安装后可以在 PowerShell 验证；如果暂时不安装，跳过这一步：

```powershell
git --version
```

打开 PowerShell（不要用 CMD），安装 Claude Code：

```powershell
irm https://claude.ai/install.ps1 | iex
```

验证：

```powershell
claude --version
```

#### 手动配置环境变量

如果你不想用 ccswitch，可以通过环境变量直接配置。

把 `你的 sk-... 开头 API Key` 替换成真实 key：

```powershell
setx ANTHROPIC_BASE_URL "https://cc.codesome.ai"
setx ANTHROPIC_AUTH_TOKEN "你的 sk-... 开头 API Key"
setx CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC "1"
setx CLAUDE_CODE_ATTRIBUTION_HEADER "0"
```

关闭当前 PowerShell，重新打开一个新 PowerShell。

验证：

```powershell
claude
```

如果输入 `claude` 后提示“无法加载文件 `claude.ps1`，因为在此系统上禁止运行脚本”，或者看到 `PSSecurityException`，这是 **PowerShell 执行策略阻止 `claude.ps1` 运行**，不是 Claude Code 没有安装。执行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

出现确认提示后输入 `y` 并回车，再重新打开 PowerShell，输入 `claude` 验证。这个设置只作用于当前 Windows 用户，不需要把整台电脑的执行策略改成 `Unrestricted`。

![Claude Code 欢迎界面](<images/V3 Claude Code 安装与配置指南-claude-windows-welcome.png?v=3a32eb6d7560e74d00793fb1e34b250dee7f1733a1a4b626861dbff1b2cba0f7>)

能进入 Claude Code 并正常回复，就配置完成。

### macOS

#### 安装 Claude Code CLI

打开终端：按 `Command + 空格`，搜索"终端"，回车。后面的安装和验证都在这个窗口里完成。

![macOS 打开终端](<images/V3 Claude Code 安装与配置指南-macos-open-terminal.gif?v=77a9ae3e3800660be31a4000a43bb562c7a14307c816d120d280b66feb60a178>)

先安装 Node.js：

```text
https://nodejs.org/en/download
```

下载 macOS 安装包并安装。

![macOS Node.js 安装页](<images/V3 Claude Code 安装与配置指南-macos-node-installer.png?v=8d2bd4a6accf600e92e47d6774f0f2c17fa95921690c9c23301d4279f6477960>)

在终端验证：

```bash
node -v
npm -v
```

通过 npm 安装 Claude Code：

```bash
npm install -g @anthropic-ai/claude-code
```

如果默认 npm 下载慢或无法连接，使用镜像：

```bash
npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com
```

不要在 npm 安装命令前加 `sudo`。遇到权限或路径问题（无法写入 `/usr/local`）时，先看[使用问题速查](usage-faq)里的「npm 全局安装权限与路径修复」。

验证：

```bash
claude --version
```

#### 手动配置环境变量

如果你不想用 ccswitch，可以通过环境变量直接配置：

```bash
echo 'export ANTHROPIC_BASE_URL="https://cc.codesome.ai"' >> ~/.zshrc
echo 'export ANTHROPIC_AUTH_TOKEN="你的 sk-... 开头 API Key"' >> ~/.zshrc
echo 'export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1' >> ~/.zshrc
echo 'export CLAUDE_CODE_ATTRIBUTION_HEADER=0' >> ~/.zshrc
source ~/.zshrc
```

验证：

新开终端：

```bash
claude
```

看到欢迎界面后，按回车接受协议；再随便输一句话试试，能正常回复就说明配好了。

![Claude Code 欢迎界面](<images/V3 Claude Code 安装与配置指南-claude-macos-welcome.png?v=3a32eb6d7560e74d00793fb1e34b250dee7f1733a1a4b626861dbff1b2cba0f7>)

### Linux

不使用 CC Switch 时，可以直接安装 CLI 并通过环境变量配置。

#### 1. 安装 Node.js 和 npm

先检查：

```bash
node -v
npm -v
```

如果没有安装，Ubuntu / Debian 可以执行：

```bash
sudo apt update
sudo apt install -y nodejs npm
```

#### 2. 安装 Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

如果默认 npm 无法连接，使用镜像：

```bash
npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com
```

不要使用 `sudo npm install -g`。遇到权限或路径问题（无法写入 `/usr/local`）时，先看[使用问题速查](usage-faq)里的「npm 全局安装权限与路径修复」。

#### 3. 写入 V3 配置

Bash 用户：

```bash
echo 'export ANTHROPIC_BASE_URL="https://cc.codesome.ai"' >> ~/.bashrc
echo 'export ANTHROPIC_AUTH_TOKEN="你的 sk-... 开头 API Key"' >> ~/.bashrc
echo 'export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1' >> ~/.bashrc
echo 'export CLAUDE_CODE_ATTRIBUTION_HEADER=0' >> ~/.bashrc
source ~/.bashrc
```

Zsh 用户：

```bash
echo 'export ANTHROPIC_BASE_URL="https://cc.codesome.ai"' >> ~/.zshrc
echo 'export ANTHROPIC_AUTH_TOKEN="你的 sk-... 开头 API Key"' >> ~/.zshrc
echo 'export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1' >> ~/.zshrc
echo 'export CLAUDE_CODE_ATTRIBUTION_HEADER=0' >> ~/.zshrc
source ~/.zshrc
```

#### 4. 验证

```bash
claude
```

### VS Code、Trae 等 IDE 插件

直接使用前文已经完成的 CC Switch 配置，不需要再手动编辑 `settings.json`。

1. 打开 CC Switch，点击左上角的齿轮进入设置。
2. 勾选 **应用到 VS Code 插件**。这项设置同样适用于 Trae。
3. 打开 VS Code 或 Trae 的扩展市场，搜索 `Claude Code`。
4. 安装 Claude Code 插件后即可使用。

## 常见错误

1. 把兑换码当成 API Key。

2. 用 Codex 的配置方式配置 Claude Code。

3. `ANTHROPIC_AUTH_TOKEN` 没有替换成真实 key。

4. 配完没有重开终端。

5. 月卡用户没有选择月卡/订阅分组。

6. 用二合一的 `cr-...` key 或 v5 地址配置了这篇 V3 教程。

1) `CLAUDE_CODE_ATTRIBUTION_HEADER` 没有设置为 `0`。

遇到报错，去看：

[使用问题速查：报错、账单与配置排查](usage-faq)

## 在 Claude Code 里使用 gpt-5.6-terra

### 在 ccswitch 里配置 gpt-5.6-terra

如图，重点核对这几项：

![](<images/V3 Claude Code 安装与配置指南-test.jpg?v=4ce199f7c38f58a25f2591f563cac2818f608b41ea3150be4be0bf518c182383>)

* 提供商名称填 `codesome`

* 请求地址填 `https://cc.codesome.ai`

* API Key 填你在 Codesome 里设置的 key

* 分组选择 `codex月卡` 或 `codex分组`

### 配置高级选项

![](<images/V3 Claude Code 安装与配置指南-test-1.jpg?v=734aa79473f4a23c3a3fb79940cdb0474a3309dc1230f0c205e2e92eee189f23>)

### 打开 ccswitch 的代理开关

请务必开启这个开关，否则无法连接到 Codex。

![](<images/V3 Claude Code 安装与配置指南-test-2.jpg?v=f217e037bf086fa6b83944c83185dffe0f931676910dbd09c4e9d6854bb9a6c8>)

如果找不到开关，就点击设置齿轮按钮进入设置页，再找到"代理"。

进入代理页面后，找到"在主页面显示本地代理开关"。

![](<images/V3 Claude Code 安装与配置指南-test-3.jpg?v=196e3496bce91768df9e9b9101bbab1121319172e5e9f6051eba3ab8611844d>)

![](<images/V3 Claude Code 安装与配置指南-test-4.jpg?v=af58e81c21d6f959dc05b55b3814bb39166be887533554b7cde161c39a2f0c46>)

打开后即可在主页看到这个开关。

### 验证

新开一个终端窗口，输入：

```bash
claude


```

![](<images/V3 Claude Code 安装与配置指南-test-5.jpg?v=3a32eb6d7560e74d00793fb1e34b250dee7f1733a1a4b626861dbff1b2cba0f7>)

看到欢迎界面后，按回车接受协议；再随便输一句话试试，能正常回复就说明配好了。

### 常见问题

#### 询问模型，发现是 claude 模型

原理是 ccs 的代理进行了转换，claude 客户端误以为自己是 claude 模型，是正常的，无需担忧，下图都是正常的

![](<images/V3 Claude Code 安装与配置指南-test-6.jpg?v=c10c60d77afb414f4bc87b1721d738c756e4631ad7b1439fb824c32e86e16a98>)

![](<images/V3 Claude Code 安装与配置指南-test-7.jpg?v=206835720f9055b82c19e3f915085818b179c90c214962e31bcb20b51a022750>)

#### 模型不回复

1. 看一下 ccswitch 的代理开关是不是关闭，需要保持开启

2. 新开一个窗口进行测试

3. 如果还是不回复，请在群里反馈，我们会第一时间帮您排查
