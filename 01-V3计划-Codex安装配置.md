> 这篇只适用于 V3 + Codex。不要拿这篇配置 Claude Code，也不要拿这篇配置二合一。

## 适合谁读

* 你要使用 Codex CLI。

* 你要使用 Codex 桌面版，但还没完成 CLI 配置。

* 你买的是 V3 / 普通 Codesome API / V3 Codex 月卡或按量。

* 你已经创建了 V3 API Key，常见形态是 `sk-...`。

## 不适合谁读

| 你的情况                   | 应该看                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| 要配置 V3 Claude Code     | [V3 Claude Code 安装与配置指南](https://zvgmnl1sw58.feishu.cn/wiki/IPomwd31niucKwkVIVucP63an1g) |
| 使用二合一月卡，key 是 `cr-...` | [二合一 Codex 安装与配置指南](https://oxv18tgb72z.feishu.cn/docx/STgaddmS6o5FTNxdm6Yc83tAnud)      |
| 已经报错                   | [使用问题速查](https://zvgmnl1sw58.feishu.cn/wiki/UU8Uw09k3itFOzkfj88ceSfenfg)                 |

## Codex 和 Claude Code 的关键区别

| 工具          | 常见配置                                        |
| ----------- | ------------------------------------------- |
| Claude Code | `ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN` |
| Codex       | `CODESOME_API_KEY`、`~/.codex/config.toml`   |

如果你正在配置 Codex，不要照 Claude Code 教程写 `ANTHROPIC_*`。

## 配置前确认

1. 已经在 V3 后台兑换成功。

2. 已经创建 `sk-...` API Key。

3. API Key 分组适合 Codex。

4. 你知道自己是在 Windows、macOS 还是 WSL 里配置。

5. 如果使用桌面版，也要先完成 CLI 配置。

V3 Codex 核心配置：

```text
base_url=https://cc.codesome.ai/v1
env_key=CODESOME_API_KEY
```

## 方法 1（推荐）：用 ccswitch 配置 V3 Codex

### 1. 安装 ccswitch

macOS 用户可以先执行：

```bash
brew tap farion1231/ccswitch
brew install --cask cc-switch
```

如果命令运行失败，前往 `https://github.com/farion1231/cc-switch/releases`，下载后缀是 `.dmg`的版本。

Windows 用户前往 `https://github.com/farion1231/cc-switch/releases` 下载最新版本，并选择对应的 `.msi` 安装包。

![ccswitch  安装包](<images/V3 Codex 安装与配置指南-image-009.png>)

![](<images/V3 Codex 安装与配置指南-image-010.png>)

### 2. 首次打开时的系统安全提示

macOS 在启动台选择 `cc-switch` 后，如果因为安全性问题无法打开，需要去：`设置` → `隐私与安全` → `安全性`，允许信任当前开发者。

![macOS 允许打开 cc-switch](<images/V3 Codex 安装与配置指南-image-011.png>)

### 3. 获取 V3 Codex Key

登录 Codesome V3 后台，打开 `https://v3.codesome.cn/keys` 获取对应 key。月卡订阅要切换到月卡分组；按量额度要切换到 Codex 分组。

![V3 后台创建或复制 key](<images/V3 Codex 安装与配置指南-image-2.png>)

### 4. 创建 V3 供应商

打开 ccswitch 主界面，点击右上角加号，创建供应商。这里只写 V3 Codex 配置，不适用于二合一月卡。

![ccswitch 创建供应商](<images/V3 Codex 安装与配置指南-image-3.png>)

![ccswitch 填写 V3 Codex 配置](<images/V3 Codex 安装与配置指南-image-1.png>)

* 供应商名称填 `codesome`

* API Key 填你在 V3 后台获得的 `sk-...` key

* 请求地址填 https://cc.codesome.ai/v1

* 模型名称填 `gpt-5.6-terra`

`gpt-5.6-sol` 适合高难度任务，`gpt-5.6-luna` 适合简单任务。不要直接填写裸 `gpt-5.6`，它会默认指向更贵的 Sol。

## Windows PowerShell 推荐路径

### 1. 安装 Node.js

打开：

```text
https://nodejs.org/en/download
```

Node.js 下载页用于确认 Windows Installer 的位置。

![Windows Node.js 安装页](<images/V3 Codex 安装与配置指南-image-001.png>)

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

### 3. 写入 V3 Codex 配置

先设置 key：

```powershell
$Key = "这里替换成你的真实 sk-... API Key"
```

再执行下面这一整段（不要做任何修改，直接粘贴。）：

```powershell
if ([string]::IsNullOrWhiteSpace($Key) -or $Key -eq "这里替换成你的真实 sk-... API Key") {
    throw "请先执行：`$Key = `"你的真实 sk-... API Key`""
}

New-Item -ItemType Directory -Force "$HOME\.codex" | Out-Null

@'
model = "gpt-5.6-terra"
review_model = "gpt-5.6-terra"
model_reasoning_effort = "xhigh"
model_provider = "codesome"

disable_response_storage = true
network_access = "enabled"
windows_wsl_setup_acknowledged = true
check_for_update_on_startup = false

model_context_window = 1000000
model_auto_compact_token_limit = 900000

[model_providers.codesome]
name = "Codesome V3"
base_url = "https://cc.codesome.ai/v1"
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

## macOS 推荐路径

### 1. 安装 Node.js

打开：

```text
https://nodejs.org/en/download
```

Node.js 下载页用于确认 macOS Installer 的位置。

![macOS Node.js 安装页](<images/V3 Codex 安装与配置指南-image-005.png>)

安装后

打开终端：按 `Command + 空格`，搜索“终端”，回车。后面的安装和验证都在这个窗口里完成。

![macOS 打开终端](<images/V3 Codex 安装与配置指南-image-006.gif>)

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

### 3. 写入 V3 Codex 配置

```bash
export CODESOME_API_KEY='这里替换成你的真实 sk-... API Key'
```

然后执行：

```bash
KEY="${CODESOME_API_KEY:?请先执行 export CODESOME_API_KEY='你的真实 sk-... API Key'}"

mkdir -p ~/.codex

cat > ~/.codex/config.toml <<'EOF'
model = "gpt-5.6-terra"
review_model = "gpt-5.6-terra"
model_reasoning_effort = "xhigh"
model_provider = "codesome"

disable_response_storage = true
network_access = "enabled"
check_for_update_on_startup = false

model_context_window = 1000000
model_auto_compact_token_limit = 900000

[model_providers.codesome]
name = "Codesome V3"
base_url = "https://cc.codesome.ai/v1"
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

## WSL 推荐路径

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
https://cc.codesome.ai/v1
```

可以直接复用上一节 macOS 的配置命令。

## Codex 桌面版

**Codex 桌面版通常依赖 CLI 配置。先把 CLI 配好，再安装并打开桌面客户端。**

### 下载地址

打开官方 Codex 桌面客户端下载页：

```text
https://developers.openai.com/codex/app
```



CLI 配置完成后，打开 Codex 桌面客户端会看到类似界面。

![Codex 桌面客户端界面](<images/V3 Codex 安装与配置指南-image.png>)

### 使用顺序

1. **先按本文完成 Codex CLI 安装与配置。**

2. 确认终端里执行 `codex` 可以正常进入并回复。

3. 打开安装包文档或官方下载地址，安装 Codex 桌面客户端。

4. 安装完成后打开桌面客户端。

5. 如果桌面版没有生效，退出后台进程后重新打开。

### 注意事项

* 桌面版不是单独配置一套 Codesome；它通常读取本机 CLI 相关配置。

* 如果 CLI 没配好，桌面版大概率也不能正常使用。

* 如果你在 Windows / macOS / WSL 之间切换环境，先确认桌面版实际读取的是哪一套配置。

## 常见错误

1. 用 Claude Code 的 `ANTHROPIC_*` 配置 Codex。

2. 没有设置 `CODESOME_API_KEY`。

3. `~/.codex/config.toml` 不存在或写错。

4. V3 `base_url` 少了 `/v1`。

5. 桌面版没重启。

6. WSL 和 Windows PowerShell 混在一起配置。

7. 用二合一 `cr-...` key 或 v5 地址配置了这篇 V3 教程。

遇到报错，去看：

[使用问题速查：报错、账单与配置排查](https://zvgmnl1sw58.feishu.cn/wiki/UU8Uw09k3itFOzkfj88ceSfenfg)
