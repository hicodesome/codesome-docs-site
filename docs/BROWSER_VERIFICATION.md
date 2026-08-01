# 文档站真实浏览器验收

`verify --browser` 在既有 Git、curl、字节比对、生产运行时和公网文件验收之后，使用 Chrome DRM 容器中的真实 Google Chrome 渲染 Docsify 页面。它检查：

- 首页侧栏包含目标文章标题，且首页没有 `console error`；
- 侧栏目标链接能进入目标文章路由；
- 文章 H1、关键正文文字和正文图片 `naturalWidth > 0`；
- 文章页没有 `console error`。

## 命令

发布技能入口：

```bash
.agents/skills/release-codesome-doc-site/scripts/doc-site-production.sh verify \
  --sha "$(git rev-parse HEAD)" \
  --browser \
  --file '01-V3计划-GrokBuild安装配置.md' \
  --expect '01-V3计划-GrokBuild安装配置.md::V3 Grok Build 安装与配置指南'
```

直接运行站点验收脚本时，可用 `--article`、`--title` 和 `--expect` 指定目标文章。默认目标是含图片的 V3 Grok Build 教程，便于检查图片加载链路。

Chrome DRM 前置由 `chrome-drm-fetch` 技能定义：本机需要能通过 `ssh lzc-joe` 访问懒猫盒子，且容器中存在名称匹配 `chrome-drm-chrome` 的运行容器。登录态不是本验收的前置条件；脚本只访问公开站点，不复制或读取 Cookie、token、密码或 Profile。

## 证据与退出码

证据写入 `var/doc-site-browser-verify/`，包含逐次运行的 JSON 摘要、首页/文章 HTML 和 PNG 截图；`var/` 已加入 Git 忽略。输出逐项 `PASS`/`FAIL`，并打印证据摘要路径。

- `0`：浏览器断言全部通过；
- `1`：页面可访问，但断言失败，例如侧栏链接被改坏；
- `2`：参数错误；
- `3`：Chrome DRM 容器、SSH 或 CDP 不可达，明确输出 `SKIP`，不视为通过。

可以用 `npm run test:browser` 运行不依赖 Chrome 的断言回归测试。故意把侧栏目标链接改为不存在的路由时，浏览器验收会以 `1` 退出，不能生成“完成”结论。
