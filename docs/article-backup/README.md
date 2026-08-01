# 文档站文章备份

此目录由 scripts/backup-articles.mjs 生成，保存当前站点根目录文章（^\d{2}-.+\.md$）及其实际引用的本地图片。

## 边界

- manifest.json 是来源、提交时间、文章/图片路径、大小和 SHA-256 清单。
- articles/ 与 images/ 只保存站点当前文件的副本，不复制 CDC 原始集合。
- CDC 来源只读校验固定 tag cdc-snapshot-2026-07-14，不会切换真值、改写正文或放宽 sync-cdc。
- 清单中的站点提交时间来自站点 Git HEAD；备份命令不写入不稳定的运行时间，因此重复执行不会产生无意义差异。

## 运行

~~~bash
node scripts/backup-articles.mjs --dry-run --cdc-source /path/to/hicodesome-docs-source
node scripts/backup-articles.mjs --cdc-source /path/to/hicodesome-docs-source
node scripts/backup-articles.mjs --verify
~~~

缺图、外部图片、越界图片引用或 CDC 固定快照不一致都会失败。--verify 独立读取本目录清单，逐文件进行 SHA-256 和字节数校验；追加 --verify-source 可再与当前站点源文件逐项比对。

## 恢复

恢复前先运行 --verify。将 articles/ 下文件复制回站点根目录、将 images/ 下文件复制回站点 images/，再运行站点 npm run check；清单中的 backupPath 与 sha256 用于逐文件核对，不能用 CDC 原始目录覆盖此备份。
