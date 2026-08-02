# 文章生命周期流程

本文是文档站文章登记、替换、改名和删除的操作清单。脚本会修改登记表、侧边栏、基准文档和站内文件引用，并在每个命令结尾自动运行 `npm run generate:titles` 与 `npm run check`。

## 公开文章自动发现

站点根目录中符合 `^\d{2}-.*\.md$` 的文件就是公开文章；`README.md`、`_sidebar.md`、`docs/` 和其他子目录不在扫描范围。`npm run generate:titles` 会从这个集合同时生成标题映射和 Decap `admin/config.yml`；`npm run check` 会校验公开文章、侧边栏、生成文件、链接、图片、敏感信息和备份清单一致。

- 已在 CDC 或人工基准登记的文章，继续以登记标题为权威，文件必须以它作为第一行唯一 H1。
- 新的未登记文章，以第一行唯一 H1 作为标题，无需为了进入编辑器再手工维护一份清单。
- CDC 来源、人工基准和动态事实仍是独立的可追溯契约；自动发现不替代这些来源登记。

## 先判断文章类型

- **CDC 槽位（slot）**：文章在 `scripts/cdc-manifest.mjs` 的 `articles` 中，必须保留 25 个固定 CDC `source` 文件的集合。替换槽位只能改 `site` 和 `title`，不能删除或改写 `source`。
- **站点独有（site-only）**：文章在 `scripts/content-baseline.mjs` 的 `SITE_ONLY_ARTICLES` 中，不参与 CDC 内容同步。
- **人工最新基准**：如果文章在 `LATEST_BASELINE_ARTICLES` 中，改名或替换时必须同步其中的 `site/title`，保留其人工基准语义。

每篇公开文章都必须被自动扫描集合纳入，且 `_sidebar.md` 中恰好有一个入口。首页 `03-Agentic入门宝典.md` 的入口位置仍需根据内容分类人工确认。

## 新增

不需登记来源的新文章，放到仓库根目录，使用 `NN-*.md` 文件名并以唯一 H1 开头。同步增加 `_sidebar.md` 入口后运行：

```bash
npm run generate:titles
npm run backup:articles
npm run check
```

第一条命令会自动把新文章加入 `assets/article-titles.js` 和 `admin/config.yml`。备份命令会更新 `docs/article-backup/`；受控工作区要能读取固定 CDC 源，或显式传入 `--cdc-source`。

需要登记 CDC 来源或人工基准语义时，再使用生命周期命令：

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

`npm run check:article-titles` 还会逐篇核对文章文件、发布标题和侧栏入口。每篇公开文章源文件必须以发布标题作为第一行的唯一 H1，不能缺少 H1、使用其他标题或把正文小节写成 H1。检查器会拒绝依赖运行时修复才能通过的源文件；正文标题统一使用 H2 或更低级别。

## 为什么这个问题会反复出现

这不是单篇文章偶发漏写标题，而是过去有多个入口把同一个缺陷重新带回来了：

1. CDC 原始 Markdown 来自外部文档，可能没有 H1、存在多个 H1，或把正文小节写成 H1；同步脚本过去只同步正文，不保证站点标题契约。
2. 旧版检查器先对坏源文件执行标题规范化，再检查规范化结果，所以检查通过并不代表仓库里的真实 Markdown 已经合格。下一次 CDC 同步、人工编辑或备份恢复又会把坏源文件带回来。
3. 浏览器标题脚本曾经在运行时补 H1、降级正文 H1。它能让部分 Docsify 页面看起来正常，却掩盖了直接 Markdown 响应和源文件的缺陷；脚本顺序、缓存或其他访问路径变化后，缺陷就会重新暴露。仅统计 DOM 里的 H1 也不够，CSS 隐藏或零尺寸的“幽灵标题”仍可能让检查误报通过。
4. 发布脚本过去只检查首页可达。首页能打开不等于 29 篇公开文章都满足标题契约，生产服务也可能在坏文件存在时继续被认为是 online。
5. 后台代理过去只在 `contents` API 入口检查文章正文；Decap editorial workflow 还会调用 Git blobs/trees/commits 和 PR merge API，低层入口若只依赖 GitHub 保护而不在代理最后一跳复核，管理员令牌或错误的强制合并路径仍可能把坏树带到 `main`。运行时健康缓存若只看文件元数据，也可能漏掉“内容变了但大小和时间戳恢复”的漂移。
6. 合并门禁过去只从拟合并 tree 读取文章文件，没有用同一份运行时契约验证 `index.html`、`_sidebar.md` 和入口页引用的浏览器脚本；同时 merge 请求允许省略 `sha`，检查完成后 PR head 发生变化时仍可能把未验证的新 head 交给 GitHub 合并。这两个缺口让标题问题可以从 CMS 的低层 Git API 或检查与合并之间的时间窗口重新进入发布链路。

当前的不可复发约束是分层的：登记表定义唯一标题；CDC 同步、生命周期脚本和 CMS 代理只接受 canonical 源文件；`npm run check` 和 GitHub `contract` 检查逐篇拒绝坏源文件；PR 代理只允许 `cms/* -> main`，merge 必须携带 40 位当前 PR head SHA，服务端只接受与该 head 完全一致的请求，并要求 `contract` check 的 `head_sha` 一致且检查来源必须是 GitHub Actions App `15368`；合并前再从该精确 SHA 读取完整运行时 tree，使用同一份契约验证全部文章、`index.html`、侧栏和入口页引用的脚本；`server.mjs` 启动前验证全部文章、标题映射、入口脚本顺序、注入器和侧栏，运行中的 `/admin-api/healthz` 以文件内容 SHA-256 指纹复核同一运行时契约；本地和公网真实浏览器验收还检查 H1 未被祖先样式隐藏、具有非零尺寸，并覆盖桌面和移动视口；独立 release skill 在导入任何站点提交代码之前还会用外置 SHA-256 信任清单固定标题关键门禁，并独立核对文章、映射、侧栏、CMS 配置和入口资源。任一层失败都应停止后续发布，而不是靠浏览器 fallback 掩盖。

## 浏览器运行时资源

生产服务会整体屏蔽 `scripts/`；该目录只放生成、检查和管理脚本。`index.html` 直接加载的浏览器脚本必须放在公开的 `assets/` 下，并同步更新对应的 `?v=` 缓存版本。这样公开脚本不会依赖服务端私有目录的例外白名单。

`npm run check` 会启动本地生产服务，逐个请求 `index.html` 引用的本地脚本，并确认 `server.mjs`、`scripts/` 和 `docs/` 仍保持私有；服务端还会把入口页、生成标题映射、注入器、侧栏和全部文章源文件作为同一运行时契约检查。随后用实际的标题注入器遍历全部文章，验证渲染输入仍是这份规范源文件。浏览器验收会统计文章区域的全部后代 `h1`，因此嵌套 HTML H1、Setext H1 和重复标题都会失败。标题管线只验证 canonical source，不再把坏源文件临时修好或静默插入 fallback 标题；浏览器脚本路径、缓存版本、私有路径规则、标题映射或注入器行为发生回归时，会在提交和发布前失败。

服务端对公开文章 Markdown 和 `index.html` 使用 `no-cache, must-revalidate`，避免部署后继续使用旧响应；版本化的浏览器资源仍通过 `index.html` 的 `?v=` 变更缓存键。服务端只返回通过 canonical 标题契约的原始 Markdown 字节，源文件不合格时返回失败而不是修复后继续发布。运行时检查同时验证直接 Markdown 响应与源文件字节一致、唯一 H1 和缓存头，不只验证 Docsify 最终 DOM。

`server.mjs` 启动前会逐篇验证全部登记文章以及公开标题运行时资源；入口页、映射版本、脚本顺序、注入器或侧栏任一项漂移时进程拒绝监听端口。运行中的 `/admin-api/healthz` 和公开静态响应每次用关键文件内容指纹重新检查，发现文件漂移时分别返回 `503` 和拒绝服务，不能把部分可用状态报告为健康。

生产服务还会从同一份标题登记表建立编号文章白名单：未登记的 `NN-*.md` 路径直接返回 `404`，已登记文章必须能够返回非空正文。这样新增或遗漏登记的文章不能靠直接 URL 绕过标题管线公开；标题登记、文章文件、侧边栏和生成映射必须同时更新。

## 在线编辑写入边界

Decap 的 `main` 是审核基线，编辑内容必须先写入 `cms/*` 草稿分支，再通过 editorial workflow 的 Pull Request 合并。站点后台代理会拒绝对公开登记文章写入非 canonical Markdown、删除已登记文章，或写入 `main`/其他非 `cms/*` 分支；图片上传仍走 `images/uploads/*`。低层 Git 对象 API 仍保留给 Decap 组装草稿提交，但 PR 只能从本站 `cms/*` 指向 `main`，合并请求必须携带当前 PR head 的完整 SHA；合并接口会读取该精确 head 的 `contract` check 和完整运行时文章树，任何缺标题、重复 H1、缺文章、缺入口资源或运行时脚本漂移的提交都会被拒绝，且同一 SHA 会原样交给 GitHub 作为最终合并条件。新增、改名和删除文章必须使用文章生命周期脚本并通过完整门禁。这条边界与标题和发布门禁一起防止后台编辑绕过源文件契约、生成映射和浏览器验收。

`npm run check:links` 会同时读取 Git 已跟踪文件与磁盘上的根目录文章文件，因此新文章不必先 `git add` 才能检查；`npm run check:secrets` 会扫描已跟踪、已暂存和当前未跟踪的 Markdown/HTML/JS 文件，长 `sk-`、`cr-`、`sk_cr-`、`ghp_` 和 JWT 形态会阻断检查。短占位符如 `sk-xxx` 和 `sk-请替换` 不会命中长 token 规则，但不得把真实 Key 当作占位符提交。

发布前使用 release skill 的 `preflight` 或 `deploy`。该技能调用 `npm run check`，因此敏感 Key 门禁会在 GitHub 推送和生产部署前再次执行。

## CMS 变更自动审阅

`.github/workflows/review-cms-changes.yml` 每 30 分钟和手工触发时执行只读审阅：

1. 从 GitHub 查找 open `cms/* -> main` PR 以及没有 PR 的 `cms/*` 分支。
2. 读取 PR files 或 compare files 和完整 unified diff；摘要只列文件、状态和增删统计，不把 diff 正文写入日志。
3. 只接受根目录公开文章和 `images/uploads/` 变更；对 diff 新增行先扫描敏感信息，发现时只报文件、行号和类型，不回显值。
4. 通过前置策略后，在一次性 checkout 中运行 `npm run check:cms`，覆盖标题/Decap 配置、文档、链接、图片和敏感信息检查。凭据环境变量不传给被审阅 checkout。
5. 摘要写入 GitHub Actions step summary，任何失败使 workflow 失败；脚本不发送 merge、push 或发布请求。

本机可按需运行：

```bash
npm run review:cms
npm run review:cms -- --pr 123
node scripts/review-cms-changes.mjs --output /path/to/summary.md
```

只读 GitHub Token 可从 `CODESOME_CMS_REVIEW_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN` 或本机 `gh` 登录态取得；脚本不写入 Token，也不打印 Token 值。默认安全边界是“自动发现、检查、生成摘要；人工确认合并和生产发布”。
