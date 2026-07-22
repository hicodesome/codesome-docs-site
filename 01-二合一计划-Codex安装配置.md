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

## Windows 用户

### 1. 安装 Node.js

打开：

```text
https://nodejs.org/en/download
```

Node.js 下载页用于确认 Windows Installer 的位置。

![](<images/二合一 Codex 安装与配置指南-win_nodejs.png?v=5220f5a230776392002cd51e9e12b77ecad72aff1f923bb1936a7d35a938ffbb>)

安装 Windows Installer 后，在 PowerShell 验证：

```powershell
node -v
npm -v
```

### 2. 安装 Codex

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

### 3. 写入二合一 Codex 配置

先设置 key：

```powershell
$Key = "这里替换成你的真实 cr-... API Key"
```

再执行下面这一整段（不要做任何修改，直接粘贴。）：

```powershell
if ([string]::IsNullOrWhiteSpace($Key) -or $Key -eq "这里替换成你的真实 cr-... API Key") {
    throw "请先执行：`$Key = `"你的真实 cr-... API Key`""
}

New-Item -ItemType Directory -Force "$HOME\.codex" | Out-Null

@'
model = "gpt-5.5"
review_model = "gpt-5.5"
model_reasoning_effort = "xhigh"
model_provider = "codesome"

disable_response_storage = true
network_access = "enabled"
windows_wsl_setup_acknowledged = true
check_for_update_on_startup = false

model_context_window = 1000000
model_auto_compact_token_limit = 900000

[model_providers.codesome]
name = "Codesome 二合一"
base_url = "https://v5.codesome.cn/openai"
wire_api = "responses"
env_key = "CODESOME_API_KEY"
'@ | Set-Content -Encoding UTF8 "$HOME\.codex\config.toml"

[Environment]::SetEnvironmentVariable("CODEX_HOME", "$HOME\.codex", "User")
[Environment]::SetEnvironmentVariable("CODESOME_API_KEY", $Key, "User")

$env:CODEX_HOME = "$HOME\.codex"
$env:CODESOME_API_KEY = $Key
```

### 4. 验证

重新打开 PowerShell：

```powershell
Get-Content "$HOME\.codex\config.toml" | Select-String 'model =|review_model =|model_provider =|base_url =|env_key ='
[Environment]::GetEnvironmentVariable("CODEX_HOME", "User")
if ($env:CODESOME_API_KEY) { "CODESOME_API_KEY 已生效" } else { "CODESOME_API_KEY 未生效" }
codex
```

### 5. （可选）用 ccswitch 配置

如果希望用图形界面管理配置，可以安装 ccswitch。

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

* 模型名称填 `gpt-5.5`

## macOS 用户

### 1. 安装 Node.js

打开：

```text
https://nodejs.org/en/download
```

Node.js 下载页用于确认 macOS Installer 的位置。

![](<images/二合一 Codex 安装与配置指南-mac_nodejs.png?v=8d2bd4a6accf600e92e47d6774f0f2c17fa95921690c9c23301d4279f6477960>)

安装后

打开终端：按 `Command + 空格`，搜索"终端"，回车。后面的安装和验证都在这个窗口里完成。

![](<images/二合一 Codex 安装与配置指南-mac_terminal.gif?v=77a9ae3e3800660be31a4000a43bb562c7a14307c816d120d280b66feb60a178>)

验证：

```bash
node -v
npm -v
```

### 2. 安装 Codex

```bash
npm i -g @openai/codex
```

如果下载慢：

```bash
npm i -g @openai/codex --registry=https://registry.npmmirror.com
```

### 3. 写入二合一 Codex 配置

```bash
export CODESOME_API_KEY='这里替换成你的真实 cr-... API Key'
```

然后执行：

```bash
KEY="${CODESOME_API_KEY:?请先执行 export CODESOME_API_KEY='你的真实 cr-... API Key'}"

mkdir -p ~/.codex

cat > ~/.codex/config.toml <<'EOF'
model = "gpt-5.5"
review_model = "gpt-5.5"
model_reasoning_effort = "xhigh"
model_provider = "codesome"

disable_response_storage = true
network_access = "enabled"
check_for_update_on_startup = false

model_context_window = 1000000
model_auto_compact_token_limit = 900000

[model_providers.codesome]
name = "Codesome 二合一"
base_url = "https://v5.codesome.cn/openai"
wire_api = "responses"
env_key = "CODESOME_API_KEY"
EOF

chmod 600 ~/.codex/config.toml

ESCAPED_KEY=$(printf "%s" "$KEY" | sed "s/'/'\\\\''/g")

for f in ~/.zshrc ~/.bashrc ~/.profile; do
  touch "$f"
  sed -i.bak \
    -e '/^unset CODEX_HOME$/d' \
    -e '/^export CODEX_HOME=/d' \
    -e '/^export CODESOME_API_KEY=/d' \
    "$f"

  cat >> "$f" <<EOF

unset CODEX_HOME
export CODEX_HOME="\$HOME/.codex"
export CODESOME_API_KEY='$ESCAPED_KEY'
EOF
done

export CODEX_HOME="$HOME/.codex"
export CODESOME_API_KEY="$KEY"
```

### 4. 验证

新开终端：

```bash
grep -n 'model =\|review_model =\|base_url =' ~/.codex/config.toml
test -n "$CODESOME_API_KEY" && echo "CODESOME_API_KEY 已生效" || echo "CODESOME_API_KEY 未生效"
codex
```

### 5. （可选）用 ccswitch 配置

如果希望用图形界面管理配置，可以安装 ccswitch。

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

* 模型名称填 `gpt-5.5`

## WSL 用户

### 1. 进入 WSL

在 Windows PowerShell 输入：

```powershell
wsl
```

### 2. 安装 Node.js

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

### 3. 安装 Codex

```bash
npm i -g @openai/codex
```

### 4. 配置

WSL 里的配置方式和 macOS/Linux 一样，使用 `~/.codex/config.toml`，`base_url` 必须是：

```text
https://v5.codesome.cn/openai
```

可以直接复用上一节 macOS 的配置命令。

## Codex 桌面版

**Codex 桌面版通常依赖 CLI 配置。先把二合一 Codex CLI 配好，再安装并打开桌面客户端。**

### 下载地址

打开官方 Codex 桌面客户端下载页：

```text
https://developers.openai.com/codex/app
```

假如您无法访问，您可以看这里整理的安装包文档：

[codex安装包](https://oxv18tgb72z.feishu.cn/wiki/VqsgwplhVisZUokEDsacox7hnvb)

CLI 配置完成后，打开 Codex 桌面客户端会看到类似界面。

![Codex 桌面客户端界面](<images/二合一 Codex 安装与配置指南-codex_desktop.png?v=7cb38254b32756e412a693956fcf22b42ce3c207fef9b02423a0032eadeb7a45>)

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
