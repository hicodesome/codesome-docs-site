# 文档内容基准

当前基准以站点仓库工作树为真值：根目录中符合 `^\d{2}-.+\.md$` 的公开文章，以及这些文章实际引用的本地 `images/` 图片。标题来自每篇文章第一行的唯一 canonical H1，文章、图片、引用关系、大小和 SHA-256 由 `docs/article-backup/manifest.json` 统一记录。

## 日常刷新

新增、修改、改名、删除文章或图片后，只运行：

```bash
npm run baseline:refresh
```

该命令自动发现文章和图片、生成标题映射与后台配置、更新并清理 `docs/article-backup/`，最后执行当前基准检查。重复运行不写运行时间等不稳定字段，内容未变化时不会重写文件。

提交前或 CI 只需运行：

```bash
npm run baseline:check
```

缺图、外部图片、越界路径、文章集合漂移、标题不符合 canonical H1、备份缺失、哈希不符和备份中残留旧文件都会失败关闭。

## CDC provenance

CDC `cdc-snapshot-2026-07-14` 不再覆盖站点正文或图片，也不决定当前文章集合。它只作为不可变历史来源和审计锚点，固定为：

- 仓库：`hicodesome/hicodesome-docs-source`
- 标签：`cdc-snapshot-2026-07-14`
- 提交：`4f1256480ad14c4664408227b11ed6cd9b977746`

日常 `npm run check`、`npm run check:ci` 和 `baseline:*` 不要求 CDC checkout。需要审计 provenance 时显式提供只读 checkout：

```bash
npm run check:provenance -- --source /path/to/hicodesome-docs-source
```

`npm run sync:cdc` 保留为兼容入口，行为仅为上述 provenance 校验，绝不会写入文章或图片。

## 恢复

先运行 `npm run baseline:check`，再将 `docs/article-backup/articles/` 恢复到站点根目录、将 `docs/article-backup/images/` 恢复到 `images/`，最后运行 `npm run baseline:refresh` 和 `npm run check`。不要用 CDC 原始目录覆盖当前站点内容。
