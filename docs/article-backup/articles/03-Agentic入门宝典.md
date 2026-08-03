# codesome｜Agentic 入门宝典

> 新手不用读全文：按下面 4 步做，每一步点一个链接、照着做就行。

## 新手四步（按顺序）

1. **买**：还没下单 → [月卡、按量和二合一怎么选（购买前选购指南）](02-月卡按量二合一怎么选.md)
2. **换**：拿到兑换码 → [cc兑换码兑换指南（codesome 新人体验额度领取入口）](05-兑换码兑换指南.md)
3. **建 Key**：→ [如何创建 API 以及选择对应的分组](01-如何创建API并选择分组.md)
4. **配客户端**：在下面按你用的工具点开对应教程

> 💡 分不清 V3 / 二合一？看你的 Key 开头：`sk-` 是 V3（用 `v3.codesome.cn` / `cc.codesome.ai`），`cr-` 是二合一（用 `v5.codesome.cn`）。分组、倍率怎么选见 [分组是什么、怎么选、怎么切换？](02-分组是什么怎么选怎么切换.md)。

## 配置教程（第 4 步）

### Claude Code

| 你的情况 | 教程 |
|---|---|
| V3（`sk-` Key） | [V3 Claude Code 安装与配置指南](01-V3计划-ClaudeCode安装配置.md) |
| 二合一（`cr-` Key） | [二合一 Claude Code 安装与配置指南](01-二合一计划-ClaudeCode安装配置.md) |
| 想图形化一键切换 Key | [CC Switch 配置 Claude 桌面端教程](01-CCSwitch配置Claude桌面端.md) |

### Codex

| 你的情况 | 教程 |
|---|---|
| V3 | [V3 Codex 安装与配置指南](01-V3计划-Codex安装配置.md) |
| 二合一 | [二合一 Codex 安装与配置指南](01-二合一计划-Codex安装配置.md) |

### OpenCode

| 你的情况 | 教程 |
|---|---|
| V3 | [V3 OpenCode 配置指南](01-V3计划-OpenCode配置.md) |
| 二合一 | [二合一 OpenCode 配置指南](01-二合一计划-OpenCode配置.md) |

### 其他 Agent

| 你的情况 | 教程 |
|---|---|
| Hermes（二合一） | [Hermes 二合一配置教程](01-二合一计划-Hermes配置-Mac手动版.md) 或 [hermes配置教程（AI 自动版）](01-二合一计划-Hermes配置-AI自动版.md) |
| OpenClaw | [OpenClaw 最新配置教程](01-OpenClaw配置教程.md) |
| PIAgent | [PIAgent 模型配置示例](01-PIAgent模型配置示例.md) |
| 牛马 AI（NewMax） | [牛马 AI（NewMax）配置教程](01-牛马AI配置教程.md) |
| Grok Build（V3） | [V3 Grok Build 安装与配置指南](01-V3计划-GrokBuild安装配置.md) |
| Cherry Studio / WorkBuddy / Trae / Claudian / VSCode 等通用客户端 | [第三方客户端接入 Codesome 配置指南](01-第三方客户端接入配置.md) |

## 常用操作

- [如何查询我的余额和用量（网页与 API）](02-V3-V5余额额度用量查询.md)
- [GPT Image 2 终端生图备忘录：无需脚本，终端直接生成图片](03-GPTImage2终端生图备忘录.md)
- [懒人党福音最简单：通过对话来管理你的 cc 中转站](03-对话管理CC中转站.md)
- [Claude Code 上下文自动压缩配置](02-ClaudeCode上下文压缩配置.md)
- [这样做，可以省下大半 Token 账单：长上下文降费执行手册](03-Token降费执行手册.md)

## 遇到问题先看

- 使用中报错、502、断连等：[codesome｜使用问题速查](02-使用问题速查.md)
- Codex 反复重连 + 502：[Codex 桌面版持续 Reconnecting + 502 报错排查](02-Codex桌面版断连和502排查.md)
- Hermes 互救：[【互救指南】小白也能看懂的 Codex、Claude Code、Hermes 互救指南](https://zvgmnl1sw58.feishu.cn/wiki/TokNdz8whoj6QHxLtwccpsttnIg)

记住三句话：

- **兑换码不是 API Key**：兑换码用来充值/兑换，API Key 要自己在后台创建。
- **403 先看分组**：是不是月卡没选月卡分组，或分组选错。
- **月卡只能用月卡分组**：切到按量分组会走按量余额。

## 常见问题

1. **在哪买？** 访问 `meta.codesome.cn` 购买下单拿兑换码；使用走 `cc.codesome.ai`（兑换码在兑换区兑换）。
2. **有专属折扣链接？** 在社交媒体/自媒体看到的专属折扣链接可以用，会有折扣惊喜。
3. **支持哪些模型？** Claude 全部支持最新模型；如 opus 5、sonnet 5 目前官方灰度测试，不一定会访问到资源。
4. **使用中报错？** 网络报错、502 等统一看[ codesome｜使用问题速查](02-使用问题速查.md)；上下文压缩问题看 [Claude Code 上下文自动压缩配置](02-ClaudeCode上下文压缩配置.md)。

## 站点说明

| 站点 | 类型 | 使用入口 | 说明 |
|---|---|---|---|
| V3 | 月卡 / 按量 | `v3.codesome.cn`（`cc.codesome.ai`） | 在 `meta.codesome.cn` 购买拿到兑换码，先到 V3 兑换区充值，再到后台创建 `sk-` API Key。多个兑换码逐个兑换。月卡只能用月卡分组。 |
| 二合一 | 一张卡同时用 Claude + GPT | `v5.codesome.cn`（`aio.codesome.ai`） | 二合一在 `meta.codesome.cn` 购买，`cr-` 开头卡密就是 API Key，无需兑换；不要拿二合一卡密去 V3 主站兑换。 |
| V4 | 已停止 | — | 不再接受新充值；已有 V4 余额请转移到 V3 后继续使用。 |

## 更多服务

- **AI 编程课**：[全网最值得看的熠辉老师 AI 编程课](05-AI编程课红包福利.md) ｜ [Codesome Claude Code 小白课程录播](04-小白课程录播合集.md)
- **Agent 学习平台**：[一个专门为全栈工程师设计的结构化 Agent 学习平台](03-Agentway学习平台介绍.md)
- **扣桑 AI 管家服务**：付费 599 元，端到端完成 2 个主流 AI Agent 工具（如 Codex、Claude Code、Hermes、OpenClaw）安装，提供 2 周 AI 使用教学和答疑，付费进入 AI 资深群群内技术答疑；管家联系微信 `oops0731111`。
- **新人福利**：[codesome 新人体验额度领取入口](05-兑换码兑换指南.md)（加微信 `oops0731111`，口号：领新人福利）
- **新手群**：见文末二维码进群。

## 合作方案

想要进行转售、分销等合作的 KOL、独立开发者、副业、代理商等小伙伴，可扫码进群和客服 1 号沟通。进群享受小白和技术答疑服务。

![codesome's genius 扣桑天才吧](<images/codesome｜Agentic 入门宝典-image-001.png?v=266a735f7f0dec67e44d044e78be927204f980498710e02ccd01b4d3432430d3>)
