> 这篇只适用于二合一 + Claude Code。二合一不走 V3 主站兑换，也不要使用 V3 的 `https://cc.codesome.ai` 地址。

## 适合谁读

* 你买的是二合一月卡。

* 你要使用 Claude Code。

* 你拿到的 key 常见是 `cr-...`。

* 你要把 Claude Code 接到 `https://v5.codesome.cn/api`。

## 不适合谁读

| 你的情况                               | 应该看                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| 使用 V3 配 Claude Code，key 是 `sk-...` | [V3 Claude Code 安装与配置指南](01-V3计划-ClaudeCode安装配置.md) |
| 使用 V3 配 Codex                      | [V3 Codex 安装与配置指南](01-V3计划-Codex安装配置.md)       |
| 使用二合一配 Codex                       | [二合一 Codex 安装与配置指南](01-二合一计划-Codex安装配置.md)      |
| 已经报错                               | [使用问题速查](02-使用问题速查.md)                 |

## 配置前确认

1. 你使用的是二合一入口：`https://v5.codesome.cn`。

2. 二合一不在 V3 主站兑换，去 V3 兑换会失败。

3. 你的 API Key 常见是 `cr-...`。

4. 你正在配置的是 Claude Code，不是 Codex。

5. Claude Code 地址必须使用：`https://v5.codesome.cn/api`。

二合一 Claude Code 核心配置：

```text
ANTHROPIC_BASE_URL=https://v5.codesome.cn/api
ANTHROPIC_AUTH_TOKEN=你的 cr-... 开头 API Key
CLAUDE_CODE_ATTRIBUTION_HEADER=0
```

## 大扫除：先清理残留配置

> **重要：**&#x5982;果你以前配置过 V3、其他中转站，或者把 `sk-...` 和 `cr-...` 混用过，先做这一步。二合一 Claude Code 必须使用 `https://v5.codesome.cn/api` 和 `cr-...` key。
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

## Windows 用户

### 1. 安装 Git for Windows

打开：

```text
https://git-scm.com/download/win
```

安装后在 PowerShell 验证：

```powershell
git --version
```

### 2. 安装 Claude Code

打开 Windows PowerShell，执行：

```powershell
irm https://claude.ai/install.ps1 | iex
```

验证：

```powershell
claude --version
```

### 3. 写入二合一配置

把 `你的 cr-... 开头 API Key` 替换成真实 key：

```powershell
setx ANTHROPIC_BASE_URL "https://v5.codesome.cn/api"
setx ANTHROPIC_AUTH_TOKEN "你的 cr-... 开头 API Key"
setx CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC "1"
setx CLAUDE_CODE_ATTRIBUTION_HEADER "0"
```

关闭当前 PowerShell，重新打开一个新 PowerShell。

### 4. 验证

```powershell
claude
```

能进入 Claude Code 并正常回复，就配置完成。

### 5. （可选）用 ccswitch 配置

如果希望用图形界面管理配置，可以安装 ccswitch。

打开 ccswitch 下载页：<https://github.com/farion1231/cc-switch/releases>，下载 Windows 版本的 `.msi` 安装包。如果 GitHub 无法打开，在 Codesome 用户群说明"需要 ccswitch 安装包"。

> 不要从第三方网盘或来路不明的页面下载 ccswitch。

安装完成后打开 ccswitch，新建或编辑供应商配置。填写以下信息：

* 供应商名称填：`codesome-v5`

* 请求地址填：`https://v5.codesome.cn/api`

* API Key 填你的 `cr-...` 开头 API Key

![ccswitch 基础配置示例](<images/二合一 Claude Code 安装与配置指南-test-6.jpg?v=4ce199f7c38f58a25f2591f563cac2818f608b41ea3150be4be0bf518c182383>)

## macOS 用户

### 1. 安装 Node.js

打开：

```text
https://nodejs.org/en/download
```

安装后验证：

```bash
node -v
npm -v
```

### 2. 安装 Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

如果下载慢：

```bash
npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com
```

### 3. 写入二合一配置

```bash
echo 'export ANTHROPIC_BASE_URL="https://v5.codesome.cn/api"' >> ~/.zshrc
echo 'export ANTHROPIC_AUTH_TOKEN="你的 cr-... 开头 API Key"' >> ~/.zshrc
echo 'export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1' >> ~/.zshrc
echo 'export CLAUDE_CODE_ATTRIBUTION_HEADER=0' >> ~/.zshrc
source ~/.zshrc
```

### 4. 验证

新开终端：

```bash
claude
```

### 5. （可选）用 ccswitch 配置

如果希望用图形界面管理配置，可以安装 ccswitch。

打开 ccswitch 下载页：<https://github.com/farion1231/cc-switch/releases>，下载对应系统的 `.dmg` 安装包。如果 GitHub 无法打开，在 Codesome 用户群说明"需要 ccswitch 安装包"。

> 不要从第三方网盘或来路不明的页面下载 ccswitch。

macOS 首次打开如果遇到安全提示，需要在系统设置里允许打开当前开发者。

安装完成后打开 ccswitch，新建或编辑供应商配置。填写以下信息：

* 供应商名称填：`codesome-v5`

* 请求地址填：`https://v5.codesome.cn/api`

* API Key 填你的 `cr-...` 开头 API Key

![ccswitch 基础配置示例](<images/二合一 Claude Code 安装与配置指南-test-6.jpg?v=4ce199f7c38f58a25f2591f563cac2818f608b41ea3150be4be0bf518c182383>)

## Linux 用户

### 1. 安装 Node.js 和 npm

```bash
sudo apt update
sudo apt install -y nodejs npm
```

### 2. 安装 Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 3. 写入二合一配置

Bash 用户：

```bash
echo 'export ANTHROPIC_BASE_URL="https://v5.codesome.cn/api"' >> ~/.bashrc
echo 'export ANTHROPIC_AUTH_TOKEN="你的 cr-... 开头 API Key"' >> ~/.bashrc
echo 'export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1' >> ~/.bashrc
echo 'export CLAUDE_CODE_ATTRIBUTION_HEADER=0' >> ~/.bashrc
source ~/.bashrc
```

Zsh 用户：

```bash
echo 'export ANTHROPIC_BASE_URL="https://v5.codesome.cn/api"' >> ~/.zshrc
echo 'export ANTHROPIC_AUTH_TOKEN="你的 cr-... 开头 API Key"' >> ~/.zshrc
echo 'export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1' >> ~/.zshrc
echo 'export CLAUDE_CODE_ATTRIBUTION_HEADER=0' >> ~/.zshrc
source ~/.zshrc
```

### 4. 验证

```bash
claude
```

---

## 在 Claude Code 里使用 gpt-5.5

### 在 ccswitch 里配置 gpt-5.5

如图，重点核对这几项：

![ccswitch gpt-5.5 配置](<images/二合一 Claude Code 安装与配置指南-image.png?v=83aabbfff8128f07a443bf4e496ff532399c7ed6c6ed6662dc6d95822af10009>)

* 提供商名称填 `codesome`

* 请求地址填 `https://v5.codesome.cn/openai`

* API Key 填 cr 开头的 key

* 模型映射填入 `gpt-5.5`

### 打开 ccswitch 的代理开关

请务必开启这个开关，否则无法连接到 Codex。

![ccswitch 代理开关](<images/二合一 Claude Code 安装与配置指南-test-5.jpg?v=f217e037bf086fa6b83944c83185dffe0f931676910dbd09c4e9d6854bb9a6c8>)

如果找不到开关，就点击设置齿轮按钮进入设置页，再找到"代理"。

进入代理页面后，找到"在主页面显示本地代理开关"。

![ccswitch 代理设置](<images/二合一 Claude Code 安装与配置指南-test-3.jpg?v=196e3496b6ce91768df9e9b9101bbab1121319172e5e9f6051eba3ab8611844d>)

![ccswitch 代理设置](<images/二合一 Claude Code 安装与配置指南-test-4.jpg?v=af58e81c21d6f959dc05b55b3814bb39166be887533554b7cde161c39a2f0c46>)

打开后即可在主页看到这个开关。

### 验证

新开一个终端窗口，输入：

```bash
claude
```

看到欢迎界面后，按回车接受协议；再随便输一句话试试，能正常回复就说明配好了。

### 常见问题

#### 询问模型，发现是 claude 模型

原理是 ccs 的代理进行了转换，claude 客户端误以为自己是 claude 模型，是正常的，无需担忧，下图都是正常的

![正常现象](<images/二合一 Claude Code 安装与配置指南-test-1.jpg?v=c10c60d77afb414f4bc87b1721d738c756e4631ad7b1439fb824c32e86e16a98>)

![正常现象](<images/二合一 Claude Code 安装与配置指南-test.jpg?v=206835720f9055b82c19e3f915085818b179c90c214962e31bcb20b51a022750>)

#### 模型不回复

1. 看一下 ccswitch 的代理开关是不是关闭，需要保持开启

2. 新开一个窗口进行测试

3. 如果还是不回复，请在群里反馈，我们会第一时间帮您排查
