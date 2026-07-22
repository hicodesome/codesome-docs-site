> 这篇只适用于 V3 + Codex。不要拿这篇配置 Claude Code，也不要拿这篇配置二合一。

## 适合谁读

* 你要使用 Codex CLI。

* 你要使用 Codex 桌面版，但还没完成 CLI 配置。

* 你买的是 V3 / 普通 Codesome API / V3 Codex 月卡或按量。

* 你已经创建了 V3 API Key，常见形态是 `sk-...`。

## 不适合谁读

| 你的情况                   | 应该看                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| 要配置 V3 Claude Code     | [V3 Claude Code 安装与配置指南](01-V3计划-ClaudeCode安装配置.md) |
| 使用二合一月卡，key 是 `cr-...` | [二合一 Codex 安装与配置指南](01-二合一计划-Codex安装配置.md)      |
| 已经报错                   | [使用问题速查](02-使用问题速查.md)                 |

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

## Windows 用户

### 1. 安装 Node.js

打开：

```text
https://nodejs.org/en/download
```

下载 Windows 安装包并安装。

![Windows Node.js 安装页](<images/V3 Codex 安装与配置指南-image-001.png?v=5220f5a230776392002cd51e9e12b77ecad72aff1f923bb1936a7d35a938ffbb>)

安装完成后，在 PowerShell 验证：

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

### 5. （可选）用 ccswitch 配置

如果希望用图形界面管理配置，可以安装 ccswitch。

前往 `https://github.com/farion1231/cc-switch/releases` 下载最新版本，选择对应的 `.msi` 安装包。

![ccswitch 安装包](<images/V3 Codex 安装与配置指南-image-009.png?v=1c51a08f4e1e3e2adc21a6a99af72e8a383e6d6fc3a3b0bc56c5a54f04f86493>)

![](<images/V3 Codex 安装与配置指南-image-010.png?v=31a77070ab75372d5d0a2a331ab182d5e9127aa69ea5fb30d7c19beb449c1c49>)

安装完成后，登录 Codesome V3 后台，打开 `https://v3.codesome.cn/keys` 获取对应 key。月卡订阅要切换到月卡分组；按量额度要切换到 Codex 分组。

![V3 后台创建或复制 key](<images/V3 Codex 安装与配置指南-image-2.png?v=0e891fddd0eba743244e85f24ab4207f1746ad791ae24cff0efc746a0b538281>)

打开 ccswitch 主界面，点击右上角加号，创建供应商：

* 供应商名称填 `codesome`

* API Key 填你在 V3 后台获得的 `sk-...` key

* 请求地址填 https://cc.codesome.ai/v1

* 模型名称填 `gpt-5.5`

![ccswitch 创建供应商](<images/V3 Codex 安装与配置指南-image-3.png?v=2ff353866a05e3177cf80238ca3eb6815a11633d1b1ef556feda91ab345ce5f1>)

![ccswitch 填写 V3 Codex 配置](<images/V3 Codex 安装与配置指南-image-1.png?v=011502a504e04b25a009cf7d72d8bfdc91061bf1b61d190e17889e44fb6613b3>)

## macOS 用户

### 1. 安装 Node.js

打开：

```text
https://nodejs.org/en/download
```

下载 macOS 安装包并安装。

![macOS Node.js 安装页](<images/V3 Codex 安装与配置指南-image-005.png?v=8d2bd4a6accf600e92e47d6774f0f2c17fa95921690c9c23301d4279f6477960>)

安装后

打开终端：按 `Command + 空格`，搜索"终端"，回车。后面的安装和验证都在这个窗口里完成。

![macOS 打开终端](<images/V3 Codex 安装与配置指南-image-006.gif?v=77a9ae3e3800660be31a4000a43bb562c7a14307c816d120d280b66feb60a178>)

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

### 5. （可选）用 ccswitch 配置

如果希望用图形界面管理配置，可以安装 ccswitch。

macOS 用户可以先执行：

```bash
brew tap farion1231/ccswitch
brew install --cask cc-switch
```

如果命令运行失败，前往 `https://github.com/farion1231/cc-switch/releases`，下载后缀是 `.dmg`的版本。

![ccswitch 安装包](<images/V3 Codex 安装与配置指南-image-009.png?v=1c51a08f4e1e3e2adc21a6a99af72e8a383e6d6fc3a3b0bc56c5a54f04f86493>)

![](<images/V3 Codex 安装与配置指南-image-010.png?v=31a77070ab75372d5d0a2a331ab182d5e9127aa69ea5fb30d7c19beb449c1c49>)

macOS 在启动台选择 `cc-switch` 后，如果因为安全性问题无法打开，需要去：`设置` → `隐私与安全` → `安全性`，允许信任当前开发者。

![macOS 允许打开 cc-switch](<images/V3 Codex 安装与配置指南-image-011.png?v=68b4d462edf23fe04de49e3822644b094c7bec1fc3028aa1a0d9a63bba65a17d>)

安装完成后，登录 Codesome V3 后台，打开 `https://v3.codesome.cn/keys` 获取对应 key。月卡订阅要切换到月卡分组；按量额度要切换到 Codex 分组。

![V3 后台创建或复制 key](<images/V3 Codex 安装与配置指南-image-2.png?v=0e891fddd0eba743244e85f24ab4207f1746ad791ae24cff0efc746a0b538281>)

打开 ccswitch 主界面，点击右上角加号，创建供应商：

* 供应商名称填 `codesome`

* API Key 填你在 V3 后台获得的 `sk-...` key

* 请求地址填 https://cc.codesome.ai/v1

* 模型名称填 `gpt-5.5`

![ccswitch 创建供应商](<images/V3 Codex 安装与配置指南-image-3.png?v=2ff353866a05e3177cf80238ca3eb6815a11633d1b1ef556feda91ab345ce5f1>)

![ccswitch 填写 V3 Codex 配置](<images/V3 Codex 安装与配置指南-image-1.png?v=011502a504e04b25a009cf7d72d8bfdc91061bf1b61d190e17889e44fb6613b3>)

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

![Codex 桌面客户端界面](<images/V3 Codex 安装与配置指南-image.png?v=7cb38254b32756e412a693956fcf22b42ce3c207fef9b02423a0032eadeb7a45>)

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

[使用问题速查：报错、账单与配置排查](02-使用问题速查.md)
