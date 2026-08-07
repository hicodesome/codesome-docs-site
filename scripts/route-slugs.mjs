/**
 * 全站短英文路由映射（唯一真源）。
 *
 * 站点所有公开入口（侧栏、首页教程网格、正文互链）默认使用短英文 slug；
 * 旧中文文件名路由由 Docsify alias 保留兼容（见 assets/route-slugs.js）。
 * 首页文章（03-Agentic入门宝典.md）固定使用 `/`，不占用 slug。
 */
export const HOME_ARTICLE = '03-Agentic入门宝典.md';

export const ROUTE_SLUGS = Object.freeze({
  '01-CCSwitch配置Claude桌面端.md': 'ccswitch-claude',
  '01-OpenClaw配置教程.md': 'openclaw',
  '01-PIAgent模型配置示例.md': 'piagent',
  '01-V3计划-ClaudeCode安装配置.md': 'v3-claude',
  '01-V3计划-Codex安装配置.md': 'v3-codex',
  '01-V3计划-GrokBuild安装配置.md': 'v3-grok',
  '01-V3计划-OpenCode配置.md': 'v3-opencode',
  '01-二合一计划-ClaudeCode安装配置.md': 'combined-claude',
  '01-二合一计划-Codex安装配置.md': 'combined-codex',
  '01-二合一计划-Hermes配置-Mac手动版.md': 'hermes',
  '01-二合一计划-OpenCode配置.md': 'combined-opencode',
  '01-如何创建API并选择分组.md': 'create-api',
  '01-官方地址.md': 'official-address',
  '01-牛马AI配置教程.md': 'newmax',
  '01-第三方客户端接入配置.md': 'third-party-clients',
  '02-ClaudeCode上下文压缩配置.md': 'claude-context-compact',
  '02-Codex桌面版断连和502排查.md': 'codex-reconnect-502',
  '02-V3-V5余额额度用量查询.md': 'balance-usage',
  '02-使用问题速查.md': 'usage-faq',
  '02-分组是什么怎么选怎么切换.md': 'groups',
  '02-平台服务紧张应对方案.md': 'service-announcement',
  '02-月卡按量二合一怎么选.md': 'billing-plans',
  '03-Agentway学习平台介绍.md': 'agentway',
  '03-GPTImage2终端生图备忘录.md': 'gpt-image-2',
  '03-Token降费执行手册.md': 'token-cost',
  '03-对话管理CC中转站.md': 'cc-conversation',
  '03-牛马神器-CC绘制PPT.md': 'cc-ppt',
  '04-小白课程录播合集.md': 'beginner-courses',
  '05-AI编程课红包福利.md': 'ai-course-reward',
  '05-兑换码兑换指南.md': 'redeem-code'
});

export const SLUG_TO_SITE = Object.freeze(
  Object.fromEntries(Object.entries(ROUTE_SLUGS).map(([site, slug]) => [slug, site]))
);

export function routeSlugFor(site) {
  return ROUTE_SLUGS[site] || null;
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 把链接目标解析为正式文章文件名：
 * - `/` → 首页文章
 * - `v3-codex` / `v3-codex.md` → slug 对应的文章
 * - `01-V3计划-Codex安装配置` / `01-V3计划-Codex安装配置.md` → 旧文件名路由
 * 未知目标返回 null。
 */
export function resolveRouteTarget(target) {
  if (!target) return null;
  const value = String(target);
  if (value === '/') return HOME_ARTICLE;
  const bare = value.replace(/^\/+/, '');
  if (bare === HOME_ARTICLE || bare === HOME_ARTICLE.replace(/\.md$/, '')) return HOME_ARTICLE;
  const slugKey = bare.replace(/\.md$/i, '');
  if (SLUG_TO_SITE[slugKey]) return SLUG_TO_SITE[slugKey];
  if (ROUTE_SLUGS[bare]) return bare;
  if (ROUTE_SLUGS[bare + '.md']) return bare + '.md';
  return null;
}

/**
 * 生成 Docsify alias 映射：短 slug（可带 .md）与旧中文文件名（可带 .md）
 * 都指向正式文章文件。键会被 Docsify 编译为 `^key$` 正则，因此需要转义。
 */
export function buildDocsifyAlias() {
  const alias = {};
  for (const [site, slug] of Object.entries(ROUTE_SLUGS)) {
    const fileBase = site.replace(/\.md$/i, '');
    alias[`/${escapeRegex(slug)}(?:\\.md)?`] = `/${site}`;
    alias[`/${escapeRegex(fileBase)}(?:\\.md)?`] = `/${site}`;
  }
  return alias;
}
