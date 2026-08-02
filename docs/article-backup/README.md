# 文档站文章备份

此目录由 scripts/backup-articles.mjs 生成，保存当前站点根目录文章（^\d{2}-.+\.md$）及其实际引用的本地图片。

## 边界

  - manifest.json 是当前站点真值的来源、稳定内容指纹、文章/图片路径、大小和 SHA-256 清单。
  - articles/ 与 images/ 只保存站点当前文件的副本，不复制 CDC 原始集合。
  - generatedFrom.cdc 仅记录固定 tag 的 provenance 状态，不会切换真值或改写正文；验证需显式提供 CDC checkout。
  - generatedFrom.site 只由当前公开文章和引用图片的稳定路径、哈希及引用关系计算，不写 Git HEAD、commitDate 或运行时间；无关 Git 提交不会改变清单。

## 运行

~~~bash
node scripts/backup-articles.mjs --dry-run
node scripts/backup-articles.mjs
node scripts/backup-articles.mjs --verify
node scripts/backup-articles.mjs --verify --cdc-source /path/to/hicodesome-docs-source
~~~

缺图、外部图片、越界图片引用都会失败。--verify 会确认清单完整覆盖当前站点文章、引用图片、备份文章 canonical H1 和当前文件哈希；追加 --verify-source 可再显式比对当前站点源文件。提供 --cdc-source 时只额外校验固定 CDC provenance。

## 恢复

恢复前先运行 --verify。将 articles/ 下文件复制回站点根目录、将 images/ 下文件复制回站点 images/，再运行站点 npm run check；清单中的 backupPath 与 sha256 用于逐文件核对，不能用 CDC 原始目录覆盖此备份。
