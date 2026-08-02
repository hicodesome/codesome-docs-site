# 文档站真实浏览器验收

正式 `deploy` 在既有 Git、curl、字节比对、生产运行时和公网文件验收之后，使用 Chrome DRM 容器中的真实 Google Chrome 全量渲染 Docsify 页面。它检查：

- 首页侧栏包含目标文章标题，且首页没有 `console error`；
- 首页 Markdown 请求必须收到 `HTTP 200`，且首页恰好有一个由标题注入器产生、实际可见的正式 H1；
- 侧栏目标链接能进入目标文章路由；
- 文章 Markdown 请求必须为 `HTTP 200`，标题管线必须实际处理当前文章；
- 直接读取文章 Markdown 响应时，必须已经包含登记标题且恰好一个 H1；
- 文章区域必须有且仅有一个由标题注入器产生、实际可见的正式 H1；检查统计全部后代 `h1`，并检查祖先样式、`display`、`visibility`、`opacity`、尺寸，不会被嵌套 HTML H1、Setext H1 或 CSS 隐藏绕过；同时检查关键正文文字和正文图片 `naturalWidth > 0`；
- 文章页没有 `console error`；桌面和移动视口都必须渲染出可见的首页和文章标题。

发布门禁会对标题元数据中的全部公开文章逐篇执行上述检查；Chrome DRM、SSH 或 CDP 不可达时发布失败，不能把 `SKIP` 当成通过。

## 命令

发布技能入口：

```bash
.agents/skills/release-codesome-doc-site/scripts/doc-site-production.sh deploy \
  --sha "$(git rev-parse HEAD)" \
  --file 'assets/cdc-title-injector.js' \
  --expect 'assets/cdc-title-injector.js::Docsify.get'
```

直接运行站点验收脚本时，使用 `--all` 验证全部文章；也可用 `--article`、`--title` 和 `--expect` 指定单篇文章。默认单篇目标是含图片的 V3 Grok Build 教程，便于检查图片加载链路。

Chrome DRM 前置由 `chrome-drm-fetch` 技能定义：本机需要能通过 `ssh lzc-joe` 访问懒猫盒子，且容器中存在名称匹配 `chrome-drm-chrome` 的运行容器。登录态不是本验收的前置条件；脚本只访问公开站点，不复制或读取 Cookie、token、密码或 Profile。

## 证据与退出码

证据写入 `var/doc-site-browser-verify/`，包含逐次运行的 JSON 摘要、首页/文章 HTML 和 PNG 截图；`var/` 已加入 Git 忽略。输出逐项 `PASS`/`FAIL`，并打印证据摘要路径。

- `0`：浏览器断言全部通过；
- `1`：页面可访问，但断言失败，例如侧栏链接被改坏；
- `2`：参数错误；
- `3`：Chrome DRM 容器、SSH 或 CDP 不可达，明确输出 `SKIP`；发布流程会将其视为失败，不视为通过。

可以用 `npm run test:browser` 运行不依赖 Chrome 的断言回归测试。测试覆盖伪造 H1、文章请求 `404`、fallback 标题和重复 H1 等反例。故意把侧栏目标链接改为不存在的路由时，浏览器验收会以 `1` 退出，不能生成“完成”结论。

## CI 前置集成门禁

`npm run check` 还会运行 `npm run check:rendered-titles:browser`。该命令启动临时本地站点，用 Playwright Chromium 真实加载 `index.html` 和 Docsify，并在桌面、移动两个视口逐篇切换全部公开文章路由。它会在带有旧搜索缓存的浏览器上下文中验证 Markdown `200`、侧栏链接、唯一且实际可见的 `manifest-injector` H1、标题管线状态、无 fallback、无 console/network error 和图片加载。

`npm run check:article-titles` 在浏览器验收前检查 29 篇文章的源文件、登记标题和侧栏入口，并要求源文件本身已经是唯一 canonical H1；`npm run check:runtime` 另外检查生产服务返回的每篇 Markdown 与 canonical 源文件逐字节一致，以及 `index.html` 和 Markdown 使用重新校验的缓存策略。这样客户端脚本失效、缓存旧版本或 CMS 写入正文时，不能只靠页面 fallback 把问题隐藏过去。

CI 先执行 `npx playwright install --with-deps chromium`，再运行 `npm run check:ci`。该 CI 契约不依赖私有的 `hicodesome-docs-source`，但仍包含标题元数据、真实 Docsify Chromium、链接、图片、敏感信息和文章备份清单校验；浏览器无法安装、无法启动或任一文章断言失败，均以非零状态结束。正式发布 preflight 另外运行完整 `npm run check`，并在有 `CDC_SOURCE` 的受控工作区校验固定 CDC tag 和来源哈希，不能把源校验静默跳过。

## 发布链路门禁

GitHub `hicodesome/codesome-docs-site` 的 `main` 已启用 `contract` required status check、线性历史和管理员保护。正式发布技能会先把目标提交推到 `release-gate`，等待该提交的 CI 成功，再快进推送 `main`；直接推送没有该提交成功检查的版本会被 GitHub 拒绝。
