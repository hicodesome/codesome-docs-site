---
name: release-codesome-doc-site
description: 发布、部署和核验 Codesome 正式文档站。修改 hicodesome/codesome-docs-site 中任何站点文件，或用户提到“文档站”“线上文档站”“公开站点”“生产站点”“上线”“发布”“部署”“核验 doc.codesome.ai”时使用。自动执行内容检查、精确 GitHub 推送、龙虾 ff-only 部署、PM2 重启与保存、远端 SHA/工作树/本机端口/公网文件回读，并要求页面行为验收；不得把生产核验交给用户。
---

# 发布 Codesome 文档站

把所有文档站称呼解释为同一个正式生产目标：

| 项目 | 固定值 |
|---|---|
| 正式仓库 | GitHub `hicodesome/codesome-docs-site` |
| 本地 remote | `origin=https://github.com/hicodesome/codesome-docs-site.git` |
| 生产主机 | SSH `longxia` |
| 生产目录 | `/home/ubuntu/doc-main` |
| 生产服务 | PM2 `doc-site-3009`，端口 `3009` |
| 公网站点 | `https://doc.codesome.ai/` |

不要建立第二个编辑或发布真源，不要直接编辑生产目录。自动化脚本位于
`scripts/doc-site-production.sh`。

## 执行修改

1. 读取项目规则、任务过程记录和当前 Git 状态，区分本任务文件与并行现场。
2. 修改内容；模型、套餐、分组、倍率、价格、额度、版本和站点行为等动态事实，先按当天后台、正式资料或用户明确口径复核。
3. 对新增或改名文章同步检查 `_sidebar.md`、首页入口、内部链接、图片和 `docs/CONTENT_BASELINE.md`。
4. 修改 `styles/*.css`、浏览器端 `scripts/*.js` 或 `assets/*.{js,css}` 时，同步修改 `index.html` 中对应的 `?v=` 缓存版本。脚本会阻止资源变了而引用版本未变的发布。
5. 运行 `npm run check`、相关语法检查和 `git diff --check`；修复失败项，不得跳过门禁。
6. 精确暂存本任务文件，审查 staged diff 后提交。不要使用 `git add .`，不要把 core、日志、凭据或并行改动纳入提交。

## 发布生产

提交完成后运行：

```bash
.agents/skills/release-codesome-doc-site/scripts/doc-site-production.sh deploy \
  --sha "$(git rev-parse HEAD)"
```

脚本按固定顺序执行：

1. fetch GitHub 并确认本地 `main`、canonical remote、提交关系和已跟踪工作树干净。
2. 运行完整站点检查及静态资源缓存版本门禁。
3. 将当前 HEAD 推送到 GitHub `origin/main`，再回读确认 SHA。
4. 在 `longxia` fetch，确认同一 remote、`main` 和可快进关系，只运行 `git pull --ff-only`。
5. 若生产端只有未暂存的 tracked 修改，且每个文件与目标提交逐字节一致，脚本先保存二进制 patch，再自动收敛；任何不一致、staged 或 untracked 现场都立即阻断。
6. 重启 `doc-site-3009`，运行 `pm2 save`，验证 PM2 online 和 `127.0.0.1:3009`。
7. 回读 GitHub、生产 HEAD、`origin/main` 和所有本次变化的公开文件，逐文件比较 SHA-256，并验证公网首页。

禁止用 `merge`、`reset`、强推、远端直接覆盖或复制文件代替该流程。

## 定向验收

部署后对关键文字增加定向回读：

```bash
.agents/skills/release-codesome-doc-site/scripts/doc-site-production.sh verify \
  --sha "$(git rev-parse HEAD)" \
  --file '目标文章.md' \
  --expect '目标文章.md::必须出现的文字'
```

如果修改导航、路由、交互、响应式布局、浏览器脚本或样式，再使用真实浏览器验证受影响页面；检查桌面和移动视口、控制台错误、目标交互和无重叠。HTTP 200 不能替代内容或行为验收，因为 Docsify SPA 可能对不存在的路径返回首页。

## 完成判据

只有以下项目全部 PASS，才能报告“已上线”或“已完成”：

- 本地目标 commit 已推送至 GitHub `hicodesome/codesome-docs-site@main`。
- 龙虾 HEAD 与 `origin/main` 均等于该 commit，且生产工作树干净。
- PM2 `doc-site-3009` 为 `online`，进程列表已保存，本机 `3009` 可访问。
- `https://doc.codesome.ai/` 可访问，变化的公开文件与目标 commit 字节一致。
- 目标页面的关键内容、导航、路由和受影响交互已从公网回读。
- 过程记录和交接文档写入实际 SHA、验证证据和剩余风险。

权限、网络或生产异常造成任一门禁失败时，明确报告阻塞与现场；不得声称完成，也不得要求用户代替 Agent 做常规人工核验。
