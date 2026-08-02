# 文章生命周期流程

站点公开文章以根目录 `^\d{2}-.+\.md$` 自动发现，不再维护 `LATEST_BASELINE_ARTICLES`、`SITE_ONLY_ARTICLES` 或其他逐篇当前基准名单。新增、修改、改名、删除文章和引用图片后，统一运行 `npm run baseline:refresh`。

## 新增文章

将文章放在站点根目录，文件名符合 `NN-*.md`，第一行是最终标题且全文只有一个 H1；在 `_sidebar.md` 增加一个入口，然后运行：

```bash
npm run baseline:refresh
npm run check
```

也可以使用生命周期命令自动更新侧边栏：

```bash
node scripts/article-lifecycle.mjs add \
  --site 01-新文章.md --title '新文章标题'
```

旧版 `--type slot|site-only` 参数仍可读取，但只为兼容旧调用，不会写入人工基准名单或修改 CDC manifest。

## 修改、改名和替换

直接修改文章正文或图片后运行 `npm run baseline:refresh`。改名或替换文件时同步处理 `_sidebar.md`、首页入口和站内链接；生命周期脚本可以处理常见文件名引用：

```bash
node scripts/article-lifecycle.mjs rename \
  --from 01-旧文件.md --to 01-新文件.md --title '新标题'

node scripts/article-lifecycle.mjs replace \
  --site 01-旧文件.md --to 01-新文件.md --title '新标题'
```

生命周期命令会刷新标题映射、Decap 配置、文章图片备份并运行站点检查。CDC manifest 只保留历史来源映射，不因当前站点改名、替换或正文更新而改写。

## 删除文章

先确认删除已进入 Git 历史或已有可回读备份，再运行：

```bash
node scripts/article-lifecycle.mjs remove --site 01-待删除文章.md
```

命令会移除侧边栏和站内链接、删除站点文件，随后刷新 manifest；对应旧文章备份和不再引用的图片也会被清理。若文章属于 CDC 来源，CDC 原仓和固定 tag 仍保持不变。

## 门禁

```bash
npm run baseline:check
npm run check
npm test
```

`baseline:check` 不需要 CDC checkout。CDC provenance 审计是单独的只读门禁：

```bash
npm run check:provenance -- --source /path/to/hicodesome-docs-source
```

任何缺图、外部图片、越界路径、文章集合漂移、标题不规范、备份哈希不符、旧备份残留或生成文件过期都必须阻断提交和发布。
