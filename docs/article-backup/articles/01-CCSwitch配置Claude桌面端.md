# 一、适用场景

本文档适用于需要通过 CC Switch 配置 Claude 桌面端（Cowork）的用户。

CC Switch 是用来管理 Claude Code 和 Claude 桌面端接入地址、API Key、模型和本地代理的配置工具。

***

# 二、准备工作

开始前请先准备好以下内容：

1. 已安装 Claude 桌面端（从 https://claude.com/download 下载）

2. 已下载最新版 CC Switch

3. 已获取可用的 API Key   - V3 产品线：`sk-...` 开头   - 二合一月卡：`cr-...` 开头

4. 确认自己要配置的请求地址、模型分组或套餐类型

***

# 三、下载并安装 CC Switch

**重要提示**：CC Switch 不是 Claude Code 或 Claude 桌面端本体，而是用来管理它们的配置工具。请先完成 Claude 桌面端安装，再下载并打开 CC Switch。

> ccswitch 不是 Claude Code 本体，而是用来管理 Claude Code 接入地址、API Key、模型和本地代理的配置工具。请先完成 Claude Code 安装，再下载并打开 ccswitch。

1. 打开 ccswitch 下载页：<https://github.com/farion1231/cc-switch/releases>

2. 在页面的 Assets 区域下载对应系统的安装包：Windows 用户下载 Windows 版本；macOS 用户按自己的芯片选择 Apple Silicon 或 Intel 版本。

3. 如果 GitHub 无法打开，或不确定该下载哪个文件，再在 Codesome 用户群 / 客服群里说明“需要 ccswitch 安装包”，让客服或管理员发最新版。

4. 安装完成后打开 ccswitch，再按照下面的字段填写 Codesome 配置。

ccswitch 下载页里，macOS 用户选择 `.dmg` 安装包，Windows 用户选择 `.msi` 安装包。

![ccswitch macOS 安装包](<images/CC Switch 配置 Claude 桌面端教程-ccswitch-macos-download.png?v=1c51a08f4e1e3e2adc21a6a99af72e8a383e6d6fc3a3b0bc56c5a54f04f86493>)

![ccswitch Windows 安装包](<images/CC Switch 配置 Claude 桌面端教程-ccswitch-windows-download.png?v=31a77070ab75372d5d0a2a331ab182d5e9127aa69ea5fb30d7c19beb449c1c49>)

macOS 首次打开如果遇到安全提示，需要在系统设置里允许打开当前开发者。

![macOS 允许打开 cc-switch](<images/CC Switch 配置 Claude 桌面端教程-ccswitch-macos-security.png?v=68b4d462edf23fe04de49e3822644b094c7bec1fc3028aa1a0d9a63bba65a17d>)

> 不要从第三方网盘或来路不明的页面下载 ccswitch。配置工具会接触 API Key，优先使用 GitHub Releases 或客服提供的版本。



***

# 四、使用 CC Switch 配置 Claude 桌面端

## 4.1 V3 产品线配置

**先点击右上角第二个图标，可以看到是claude 的图标，右下角带了一个电脑的符号。接着再在右上角的加号添加配置。**

![](<images/CC Switch 配置 Claude 桌面端教程-ccswitch右上角图标.png?v=28115791687214451786d10dce0614d623d76f4765033d33d3003c2d6fb4f9f0>)

如果您使用的是 **V3 / 普通 Codesome API / V3 月卡或按量**，API Key 形态是 `sk-...`，请按以下方式配置：

打开 CC Switch 后，新建或编辑供应商配置，填写以下信息：

* **供应商名称**：`codesome-v3`（可自定义）

* **请求地址**：`https://cc.codesome.ai`

* **API Key**：你的 `sk-...` 开头 API Key

![](<images/CC Switch 配置 Claude 桌面端教程-ccswitch详细配置之v3配置.png?v=6e4b55b310ce470cd3bc730db08611c54eae1e90c6231aadfc8663d0bc891583>)

**重要提醒**：

* 如果买的是月卡，记得在后台把这个 API Key 选到月卡/订阅分组

## 4.2 二合一产品线配置

如果您使用的是 **二合一月卡**，API Key 形态是 `cr-...`，请按以下方式配置：

打开 CC Switch 后，新建或编辑供应商配置，填写以下信息：

* **供应商名称**：`codesome-v5`（可自定义）

* **请求地址**：`https://v5.codesome.cn/api`

* **API Key**：你的 `cr-...` 开头 API Key

![](<images/CC Switch 配置 Claude 桌面端教程-ccswitch详细配置之二合一.png?v=7b99950e4603d328aabd202f41721cddb564d5dd3561f89ee401a012ddc99487>)

**配置参数对比**：

| 配置项        | V3 产品线                 | 二合一产品线                     |
| ---------- | ---------------------- | -------------------------- |
| 供应商名称      | codesome-v3（建议）        | codesome-v5（建议）            |
| 请求地址       | https://cc.codesome.ai | https://v5.codesome.cn/api |
| API Key 形态 | sk-...                 | cr-...                     |
| 分组选择       | 月卡/订阅分组 或 按量分组         | 二合一分组                      |

***

# 五、验证配置

## 5.1 Windows 验证

1. 完全退出 Claude 桌面端（右键托盘图标 → 退出）

2. 重新打开 Claude 桌面端

3. 在对话框中输入测试消息，能正常回复即配置成功

## 5.2 macOS 验证

1. 完全退出 Claude 桌面端（菜单栏图标右键 → Quit）

2. 重新打开 Claude 桌面端

3. 在对话框中输入测试消息，能正常回复即配置成功

***

# 六、常见问题

## 6.1 配置不生效

**原因**：未完全退出 Claude 桌面端

**解决**：

* Windows：右键托盘图标 → 退出，然后重新打开

* macOS：菜单栏图标右键 → Quit，然后重新打开

## 6.2 把兑换码当成 API Key

**原因**：兑换码和 API Key 是两个不同的东西

**解决**：

1. 先在后台完成兑换

2. 然后创建 API Key（`sk-...` 或 `cr-...` 开头）

3. 使用 API Key 进行配置

## 6.3 月卡用户没有选择正确分组

**原因**：API Key 没有分配到月卡/订阅分组

**解决**：

1. 登录 Codesome 后台

2. 找到对应的 API Key

3. 将其分配到月卡/订阅分组（V3）或二合一分组（二合一）

## 6.4 用错了产品线的配置

**原因**：V3 的 key 用了二合一的配置方式，或反之

**解决**：

* V3 用户：确认 API Key 是 `sk-...` 开头，请求地址是 `https://cc.codesome.ai`

* 二合一用户：确认 API Key 是 `cr-...` 开头，请求地址是 `https://v5.codesome.cn/api`

## 6.5 如果出现 Something went wrong

![](<images/CC Switch 配置 Claude 桌面端教程-ddac61b0-0a8a-4685-aef1-05bf9662c660.png?v=01a7a181eaf67b7275119ad931559bd7888bc3ca134591e3266adbf4f204ef39>)

如果出现上图这样的错误，您可以点击 Go back 然后重新请求一次。

***

# 七、参考文档

* Claude Cowork 官方配置文档：https://claude.com/docs/cowork/3p/configuration

* Claude Cowork 安装指南：https://support.claude.com/en/articles/14680741-install-and-configure-claude-cowork-with-third-party-platforms

* CC Switch GitHub 仓库：https://github.com/farion1231/cc-switch

***

# 八、遇到报错怎么办

如果配置过程中遇到报错，请查看：

[使用问题速查：报错、账单与配置排查](02-使用问题速查.md)

或在 Codesome 用户群 / 客服群里反馈，我们会第一时间帮您排查。
