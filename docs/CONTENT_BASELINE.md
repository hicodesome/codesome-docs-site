# 文档内容基准

登记日期：2026-07-23

## 当前人工最新基准

以下 5 篇教程以站点当前内容为最新基准，不再与 CDC 快照比较，也不会被 `sync:cdc` 覆盖：

- [V3 Claude Code 安装与配置指南](../01-V3计划-ClaudeCode安装配置.md)
- [V3 Codex 安装与配置指南](../01-V3计划-Codex安装配置.md)
- [二合一 Claude Code 安装与配置指南](../01-二合一计划-ClaudeCode安装配置.md)
- [二合一 Codex 安装与配置指南](../01-二合一计划-Codex安装配置.md)
- [Claude Code 上下文自动压缩配置](../02-ClaudeCode上下文压缩配置.md)

机器可读登记位于 [`scripts/content-baseline.mjs`](../scripts/content-baseline.mjs)。

## 其他教程

除上述 5 篇外，文档站其余教程暂时继续以不可变 CDC 快照为准：

- CDC 标签：`cdc-snapshot-2026-07-14`
- CDC 内容清单：[`scripts/cdc-manifest.mjs`](../scripts/cdc-manifest.mjs)
- `npm run check:cdc` 和 `npm run sync:cdc` 会继续校验或同步其余教程；当前人工最新基准中的 5 篇会被排除。

## 维护规则

后续如果确认某篇教程应作为最新基准，需要同时更新：

1. `scripts/content-baseline.mjs` 中的登记；
2. 本文件中的清单和日期；
3. 对应过程记录和交接文档。

未被登记为人工最新基准的教程，默认仍以 CDC 为准。
