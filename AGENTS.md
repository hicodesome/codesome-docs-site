# Codesome Docs Site Rules

## Project Identity

- 本仓库是 GitHub `hicodesome/codesome-docs-site`，是 Codesome 唯一正式文档站仓库。
- “文档站”“线上文档站”“公开站点”“生产站点”“正在使用的站点”均指 `https://doc.codesome.ai/`。
- 正式生产固定为 SSH `longxia`、`/home/ubuntu/doc-main`、PM2 `doc-site-3009`、端口 `3009`。

## Required Release Skill

- 修改本仓库任何站点文件，或执行上线、发布、部署、生产核验时，必须读取并使用 `.agents/skills/release-codesome-doc-site/SKILL.md`。
- Agent 必须自动完成 GitHub 推送、龙虾 `ff-only` 部署、PM2 重启与保存、公网文件和页面行为回读；不得把常规生产核验交给用户。
- 未满足技能中的全部完成判据，不得报告“已上线”或“已完成”。

## Development

- 站点为 Docsify 静态站；本地预览使用 `npm run dev`，完整内容检查使用 `npm run check`。
- 新增或改名文章时同步检查 `_sidebar.md`、首页入口、内部链接、图片和 `docs/CONTENT_BASELINE.md`。
- 修改浏览器 CSS/JS 时必须同步更新 `index.html` 对应资源的 `?v=` 缓存版本。
- 模型、套餐、分组、倍率、价格、额度、版本和站点行为属于动态事实，发布前按当天后台、正式资料或用户明确口径复核。

## Git And Production Safety

- `origin` 必须是 `https://github.com/hicodesome/hicodesome-docs-site.git`，正式分支为 `main`。
- 精确暂存本任务文件，不使用 `git add .`，不提交 core、日志、凭据或其他任务现场。
- 禁止直接编辑、复制覆盖或在生产目录提交内容；服务器只允许从 GitHub `origin/main` 执行 `git pull --ff-only`。
- 生产目录出现 staged、untracked 或与目标 commit 不一致的 dirty 内容时立即阻断，不使用 merge、reset 或强推绕过。

## Runtime

- PM2 首次启动：`pm2 start ecosystem.config.js`。
- 发布重启：`pm2 restart doc-site-3009 --update-env && pm2 save`。
- Caddy 将 `doc.codesome.ai` 反向代理到 `127.0.0.1:3009`；HTTP 200 不能替代正文、导航、路由和交互回读。
