# 文章生命周期流程

本文是文档站文章登记、替换、改名和删除的操作清单。脚本会修改登记表、侧边栏、基准文档和站内文件引用，并在每个命令结尾自动运行 `npm run generate:titles` 与 `npm run check`。

## 先判断文章类型

- **CDC 槽位（slot）**：文章在 `scripts/cdc-manifest.mjs` 的 `articles` 中，必须保留 25 个固定 CDC `source` 文件的集合。替换槽位只能改 `site` 和 `title`，不能删除或改写 `source`。
- **站点独有（site-only）**：文章在 `scripts/content-baseline.mjs` 的 `SITE_ONLY_ARTICLES` 中，不参与 CDC 内容同步。
- **人工最新基准**：如果文章在 `LATEST_BASELINE_ARTICLES` 中，改名或替换时必须同步其中的 `site/title`，保留其人工基准语义。

每篇文章都必须在一个机器可读登记表中出现，且 `_sidebar.md` 中恰好有一个入口。首页 `03-Agentic入门宝典.md` 的入口位置仍需根据内容分类人工确认。

## 新增

先把新文章文件放在仓库根目录，再运行：

```bash
# 新增 CDC 槽位。--source 是固定 CDC 快照中的源文件名，不能省略。
node scripts/article-lifecycle.mjs add \
  --site 01-新文章.md --title '新文章标题' --type slot \
  --source 'CDC 源文章 - Feishu Docs.md'

# 新增站点独有文章。
node scripts/article-lifecycle.mjs add \
  --site 01-新文章.md --title '新文章标题' --type site-only
```

命令会更新对应登记表、`docs/CONTENT_BASELINE.md` 和 `_sidebar.md`，并提示检查首页入口。CDC 槽位的 `source` 必须来自固定 tag；若是已有 CDC 槽位换站点文件，使用下面的 `replace`，不要使用 `add`。

## 替换 CDC 槽位

先准备新文章并删除或移走旧的根目录文章文件，确保新文件已存在、旧文件不存在，再运行：

```bash
node scripts/article-lifecycle.mjs replace \
  --site 01-旧文章.md --to 01-新文章.md --title '新文章标题'
```

脚本会保留旧登记项的 `source`，同步 `site/title`、CDC 内部链接目标、人工基准（如有）、侧边栏、首页和全站站内引用。不要手动删除 CDC manifest 条目；`npm run check:cdc` 仍要求 25 个 CDC 源文件与固定快照严格一致。

## 改名

```bash
node scripts/article-lifecycle.mjs rename \
  --from 01-旧文件.md --to 01-新文件.md --title '新标题'
```

脚本会在目标不存在时移动文章文件；如果文件已经由外部流程移动，也可以保持目标文件存在、源文件不存在后运行。随后同步文章、首页、侧边栏和基准文档中的文件名、图片引用与链接。省略 `--title` 会保留旧登记标题。

## 删除或归档

```bash
node scripts/article-lifecycle.mjs remove --site 01-站点独有文章.md
node scripts/article-lifecycle.mjs remove --site 01-需要归档的CDC槽位.md
```

site-only 文章会移除登记、侧边栏和站内引用，并删除根目录文章文件；先确认该文件已进入 Git 历史或有外部备份。CDC 槽位不会删除文件或 `source`，只在 manifest 登记项增加 `archived: true`，以保留 CDC 25 源文件集合和可追溯性。

## 提交前门禁

生命周期脚本自动运行以下门禁；手工修改登记表或文章时也必须按同样顺序执行：

```bash
npm run generate:titles
npm run check
```

`npm run check` 已包含缓存版本、服务公开资源、标题输入、真实 Docsify 渲染和内容完整性门禁。若只修改浏览器资源或检查发布链路，可单独运行 `npm run check:cache`；它会要求 `index.html` 中的项目自有资源带非空 `?v=`，并在存在 Git 基线时阻止资源变更但缓存版本未变。

`npm run check:article-titles` 还会逐篇核对文章文件、登记标题和侧栏入口。每篇公开文章源文件必须以登记标题作为第一行的唯一 H1，不能缺少 H1、使用其他标题或把正文小节写成 H1。检查器会拒绝依赖运行时修复才能通过的源文件；正文标题统一使用 H2 或更低级别。

## 为什么这个问题会反复出现

这不是单篇文章偶发漏写标题，而是过去有多个入口把同一个缺陷重新带回来了：

1. CDC 原始 Markdown 来自外部文档，可能没有 H1、存在多个 H1，或把正文小节写成 H1；同步脚本过去只同步正文，不保证站点标题契约。
2. 旧版检查器先对坏源文件执行标题规范化，再检查规范化结果，所以检查通过并不代表仓库里的真实 Markdown 已经合格。下一次 CDC 同步、人工编辑或备份恢复又会把坏源文件带回来。
3. 浏览器标题脚本曾经在运行时补 H1、降级正文 H1。它能让部分 Docsify 页面看起来正常，却掩盖了直接 Markdown 响应和源文件的缺陷；脚本顺序、缓存或其他访问路径变化后，缺陷就会重新暴露。
4. 发布脚本过去只检查首页可达。首页能打开不等于 29 篇公开文章都满足标题契约，生产服务也可能在坏文件存在时继续被认为是 online。

当前的不可复发约束是分层的：登记表定义唯一标题；CDC 同步、生命周期脚本和 CMS 代理只接受 canonical 源文件；`npm run check` 和 GitHub `contract` 检查逐篇拒绝坏源文件；`server.mjs` 启动前验证全部文章、标题映射、入口脚本顺序、注入器和侧栏，运行中的 `/admin-api/healthz` 也复核同一运行时契约；release skill 还必须验证生产和公网健康接口报告 `titleContract=ready`、文章数和 `titleMapVersion` 均与目标提交一致。任一层失败都应停止后续发布，而不是靠浏览器 fallback 掩盖。

## 浏览器运行时资源

生产服务会整体屏蔽 `scripts/`；该目录只放生成、检查和管理脚本。`index.html` 直接加载的浏览器脚本必须放在公开的 `assets/` 下，并同步更新对应的 `?v=` 缓存版本。这样公开脚本不会依赖服务端私有目录的例外白名单。

`npm run check` 会启动本地生产服务，逐个请求 `index.html` 引用的本地脚本，并确认 `server.mjs`、`scripts/` 和 `docs/` 仍保持私有；服务端还会把入口页、生成标题映射、注入器、侧栏和全部文章源文件作为同一运行时契约检查。随后用实际的标题注入器遍历全部文章，验证渲染输入仍是这份规范源文件。浏览器验收会统计文章区域的全部后代 `h1`，因此嵌套 HTML H1、Setext H1 和重复标题都会失败。标题管线只验证 canonical source，不再把坏源文件临时修好或静默插入 fallback 标题；浏览器脚本路径、缓存版本、私有路径规则、标题映射或注入器行为发生回归时，会在提交和发布前失败。

服务端对公开文章 Markdown 和 `index.html` 使用 `no-cache, must-revalidate`，避免部署后继续使用旧响应；版本化的浏览器资源仍通过 `index.html` 的 `?v=` 变更缓存键。服务端只返回通过 canonical 标题契约的原始 Markdown 字节，源文件不合格时返回失败而不是修复后继续发布。运行时检查同时验证直接 Markdown 响应与源文件字节一致、唯一 H1 和缓存头，不只验证 Docsify 最终 DOM。

`server.mjs` 启动前会逐篇验证全部登记文章以及公开标题运行时资源；入口页、映射版本、脚本顺序、注入器或侧栏任一项漂移时进程拒绝监听端口。运行中的 `/admin-api/healthz` 和公开静态响应也会重新检查，发现文件漂移时分别返回 `503` 和拒绝服务，不能把部分可用状态报告为健康。

生产服务还会从同一份标题登记表建立编号文章白名单：未登记的 `NN-*.md` 路径直接返回 `404`，已登记文章必须能够返回非空正文。这样新增或遗漏登记的文章不能靠直接 URL 绕过标题管线公开；标题登记、文章文件、侧边栏和生成映射必须同时更新。

## 在线编辑写入边界

Decap 的 `main` 是审核基线，编辑内容必须先写入 `cms/*` 草稿分支，再通过 editorial workflow 的 Pull Request 合并。站点后台代理会拒绝对公开登记文章写入非 canonical Markdown、删除已登记文章，或写入 `main`/其他非 `cms/*` 分支；图片上传仍走 `images/uploads/*`。新增、改名和删除文章必须使用文章生命周期脚本并通过完整门禁。这条边界与标题和发布门禁一起防止后台编辑绕过源文件契约、生成映射和浏览器验收。

`npm run check:links` 会同时读取 Git 已跟踪文件与磁盘上的根目录文章文件，因此新文章不必先 `git add` 才能检查；`npm run check:secrets` 会扫描已跟踪、已暂存和当前未跟踪的 Markdown/HTML/JS 文件，长 `sk-`、`cr-`、`sk_cr-`、`ghp_` 和 JWT 形态会阻断检查。短占位符如 `sk-xxx` 和 `sk-请替换` 不会命中长 token 规则，但不得把真实 Key 当作占位符提交。

发布前使用 release skill 的 `preflight` 或 `deploy`。该技能调用 `npm run check`，因此敏感 Key 门禁会在 GitHub 推送和生产部署前再次执行。
