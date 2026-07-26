# 文档内容基准

登记日期：2026-07-26

## 当前人工最新基准

以下 15 篇教程以站点当前内容为最新基准，不再与 CDC 快照比较，也不会被 `sync:cdc` 覆盖：

- [V3 Claude Code 安装与配置指南](../01-V3计划-ClaudeCode安装配置.md)
- [V3 Codex 安装与配置指南](../01-V3计划-Codex安装配置.md)
- [V3 OpenCode 配置指南](../01-V3计划-OpenCode配置.md)
- [二合一 Claude Code 安装与配置指南](../01-二合一计划-ClaudeCode安装配置.md)
- [二合一 Codex 安装与配置指南](../01-二合一计划-Codex安装配置.md)
- [二合一 OpenCode 配置指南](../01-二合一计划-OpenCode配置.md)
- [Claude Code 上下文自动压缩配置](../02-ClaudeCode上下文压缩配置.md)
- [codesome｜Agentic 入门宝典](../03-Agentic入门宝典.md)（2026-07-23 起，因主页需引用站点独有文章转人工维护）
- [Grok Build CLI + Codesome API 配置教程](../01-GrokBuildCLI配置教程.md)
- [OpenClaw 最新配置教程](../01-OpenClaw配置教程.md)
- [【最新】hermes配置教程](../01-二合一计划-Hermes配置-AI自动版.md)
- [【最新】Hermes 二合一配置教程](../01-二合一计划-Hermes配置-Mac手动版.md)
- [第三方客户端接入 Codesome 配置指南](../01-第三方客户端接入配置.md)
- [codesome｜使用问题速查](../02-使用问题速查.md)
- [这样做，可以省下大半 Token 账单：长上下文降费执行手册](../03-Token降费执行手册.md)

机器可读登记位于 [`scripts/content-baseline.mjs`](../scripts/content-baseline.mjs)。

## 站点独有人工文章

以下文章不来自 CDC 快照，由人工直接在站点仓库维护，不参与 `sync:cdc` 同步：

- [GPT Image 2 终端生图备忘录](../03-GPTImage2终端生图备忘录.md)
- [PIAgent 模型配置示例](../01-PIAgent模型配置示例.md)
- [月卡、按量和二合一怎么选（购买前选购指南）](../02-月卡按量二合一怎么选.md)

机器可读登记位于 [`scripts/content-baseline.mjs`](../scripts/content-baseline.mjs) 的 `SITE_ONLY_ARTICLES`。

## 其他教程

除上述 15 篇外，文档站其余教程暂时继续以不可变 CDC 快照为准：

- CDC 标签：`cdc-snapshot-2026-07-14`
- CDC 内容清单：[`scripts/cdc-manifest.mjs`](../scripts/cdc-manifest.mjs)
- `npm run check:cdc` 和 `npm run sync:cdc` 会继续校验或同步其余教程；当前人工最新基准中的 15 篇会被排除。

## 维护规则

后续如果确认某篇教程应作为最新基准，需要同时更新：

1. `scripts/content-baseline.mjs` 中的登记；
2. 本文件中的清单和日期；
3. 对应过程记录和交接文档。

新增或改名文章时，还必须在上述机器可读清单中登记最终标题，运行 `npm run generate:titles` 更新浏览器搜索标题映射，并通过 `npm run check`。CDC 清单提供默认标题，人工最新基准会覆盖同名 CDC 标题，站点独有文章由 `SITE_ONLY_ARTICLES` 登记。发布门禁会拒绝未登记文章、过期映射和错误的脚本加载顺序。

未被登记为人工最新基准的教程，默认仍以 CDC 为准。
