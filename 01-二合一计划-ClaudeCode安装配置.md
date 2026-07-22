> 这篇只适用于二合一 + Claude Code。二合一不走 V3 主站兑换，也不要使用 V3 的 `https://cc.codesome.ai` 地址。

## 适合谁读

* 你买的是二合一月卡。

* 你要使用 Claude Code。

* 你拿到的 key 常见是 `cr-...`。

* 你要把 Claude Code 接到 `https://v5.codesome.cn/api`。

## 不适合谁读

| 你的情况                               | 应该看                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| 使用 V3 配 Claude Code，key 是 `sk-...` | [V3 Claude Code 安装与配置指南](https://zvgmnl1sw58.feishu.cn/wiki/IPomwd31niucKwkVIVucP63an1g) |
| 使用 V3 配 Codex                      | [V3 Codex 安装与配置指南](https://zvgmnl1sw58.feishu.cn/wiki/O13Yw8j1kiseS4k2TC0c2Qp8nug)       |
| 使用二合一配 Codex                       | [二合一 Codex 安装与配置指南](https://oxv18tgb72z.feishu.cn/docx/STgaddmS6o5FTNxdm6Yc83tAnud)      |
| 已经报错                               | [使用问题速查](https://zvgmnl1sw58.feishu.cn/wiki/UU8Uw09k3itFOzkfj88ceSfenfg)                 |

## 配置前确认

1. 你使用的是二合一入口：`https://v5.codesome.cn`。

2. 二合一不在 V3 主站兑换，去 V3 兑换会失败。

3. 你的 API Key 常见是 `cr-...`。

4. 你正在配置的是 Claude Code，不是 Codex。

5. Claude Code 地址必须使用：`https://v5.codesome.cn/api`。

二合一 Claude Code 核心配置：

## 大扫除：先清理残留配置

> **重要：**&#x5982;果你以前配置过 V3、其他中转站，或者把 `sk-...` 和 `cr-...` 混用过，先做这一步。二合一 Claude Code 必须使用 `https://v5.codesome.cn/api` 和 `cr-...` key。
>
> 下面命令执行时如果出现红字报错，通常说明对应变量本来不存在，可以继续下一步。

在 PowerShell 里执行，先清理当前用户级环境变量：

如果你以前用管理员权限配置过，还需要用“管理员身份运行”的 PowerShell 清理系统级环境变量：

### macOS / Linux 清理环境变量和旧配置

如果你在 macOS、Linux 或 WSL 里配置过 Claude Code，也要清理当前 Session、shell 配置文件和旧的 `settings.json`。

macOS / Linux 清理完成后，关闭当前终端，重新打开一个新终端，再继续写入本篇二合一配置。

最后检查并删除旧配置文件：

如果这个文件存在，先删除它；如果不存在，直接继续。完成后关闭当前终端，重新打开一个新 PowerShell，再继续写入本篇二合一配置：`ANTHROPIC_BASE_URL=https://v5.codesome.cn/api`，`ANTHROPIC_AUTH_TOKEN=你的 cr-... 开头 API Key`。

## 方法 1（推荐）：用 ccswitch 配置

### 下载 ccswitch

> ccswitch 不是 Claude Code 本体，而是用来管理 Claude Code 接入地址、API Key、模型和本地代理的配置工具。请先完成 Claude Code 安装，再下载并打开 ccswitch。

1. 打开 ccswitch 下载页：<https://github.com/farion1231/cc-switch/releases>

1) 在页面的 Assets 区域下载对应系统的安装包：Windows 用户下载 Windows 版本；macOS 用户按自己的芯片选择 Apple Silicon 或 Intel 版本。

1. 如果 GitHub 无法打开，或不确定该下载哪个文件，再在 Codesome 用户群 / 客服群里说明“需要 ccswitch 安装包”，让客服或管理员发最新版。

1) 安装完成后打开 ccswitch，再按照下面的字段填写二合一配置。

> 不要从第三方网盘或来路不明的页面下载 ccswitch。配置工具会接触 API Key，优先使用 GitHub Releases 或客服提供的版本。

如果使用 ccswitch 管理 Claude Code 配置，核心填写：

### 按图填写基础配置

打开 ccswitch 后，新建或编辑供应商配置。下图用于确认字段位置，实际填写值以本小节文字为准。

![ccswitch 基础配置示例](<images/二合一 Claude Code 安装与配置指南-test-6.jpg>)

* 供应商名称填：`codesome-v5`

* 请求地址填：`https://v5.codesome.cn/api`

* API Key 填你的 `cr-...` 开头 API Key

配置完成后，如果你要在 VSCode 等 IDE 插件里使用，记得确认插件能读取当前 Claude Code 配置。

## 以下是环境变量方式配置，不再推荐（方法2）

## Windows 推荐路径

### 1. 安装 Git for Windows

打开：

安装后在 PowerShell 验证：

### 2. 安装 Claude Code

打开 Windows PowerShell，执行：

验证：

### 3. 写入二合一配置

把 `你的 cr-... 开头 API Key` 替换成真实 key：

关闭当前 PowerShell，重新打开一个新 PowerShell。

### 4. 验证

能进入 Claude Code 并正常回复，就配置完成。

## macOS 推荐路径

### 1. 安装 Node.js

打开：

安装后验证：

### 2. 安装 Claude Code

如果下载慢：

### 3. 写入二合一配置

### 4. 验证

新开终端：

## Linux 推荐路径

### 1. 安装 Node.js 和 npm

如果没有安装，Ubuntu / Debian 可以执行：

### 2. 安装 Claude Code

### 3. 写入二合一配置

Bash 用户：

Zsh 用户：

### 4. 验证

## 在 Claude Code 里使用 GPT-5.6

### 1. 在 ccswitch 里配置 gpt-5.6-terra

如图，重点核对这几项：

![](<images/二合一 Claude Code 安装与配置指南-image.png>)

* 提供商名称填 `codesome`

* 请求地址填 `https://v5.codesome.cn/openai`

* API Key 填cr开头的key

* 模型映射填入 `gpt-5.6-terra`

日常任务推荐 Terra；高难度任务可改为 `gpt-5.6-sol`，简单任务可改为 `gpt-5.6-luna`。不要直接填写裸 `gpt-5.6`，否则会默认指向更贵的 Sol。

### 2. 打开 ccswitch 的代理开关

请务必开启这个开关，否则无法连接到 Codex。

![](<images/二合一 Claude Code 安装与配置指南-test-5.jpg>)

如果找不到开关，就点击设置齿轮按钮进入设置页，再找到“代理”。

进入代理页面后，找到“在主页面显示本地代理开关”。

![](<images/二合一 Claude Code 安装与配置指南-test-3.jpg>)

![](<images/二合一 Claude Code 安装与配置指南-test-4.jpg>)

打开后即可在主页看到这个开关。

### 3. 验证

新开一个终端窗口，输入：

![](<images/二合一 Claude Code 安装与配置指南-test-2.jpg>)

看到欢迎界面后，按回车接受协议；再随便输一句话试试，能正常回复就说明配好了。

### 4. 常见问题

#### 4.1 询问模型，发现是claude模型

原理是ccs的代理进行了转换，claude客户端误以为自己是claude模型，是正常的，无需担忧，下图都是正常的

![](<images/二合一 Claude Code 安装与配置指南-test-1.jpg>)

![](<images/二合一 Claude Code 安装与配置指南-test.jpg>)

#### 4.2 模型不回复

1. 看一下ccswitch的代理开关是不是关闭，需要保持开启

2. 新开一个窗口进行测试

3. 如果还是不回复，请在群里反馈，我们会第一时间帮您排查

##
