// 当前人工确认的站点内容基准。
// 这些文章不参与 CDC 正文和图片同步；其他文章继续以 CDC 为准。
export const LATEST_BASELINE_VERSION = '2026-07-23';

export const LATEST_BASELINE_ARTICLES = [
  {
    site: '01-V3计划-ClaudeCode安装配置.md',
    title: 'V3 Claude Code 安装与配置指南'
  },
  {
    site: '01-V3计划-Codex安装配置.md',
    title: 'V3 Codex 安装与配置指南'
  },
  {
    site: '01-二合一计划-ClaudeCode安装配置.md',
    title: '二合一 Claude Code 安装与配置指南'
  },
  {
    site: '01-二合一计划-Codex安装配置.md',
    title: '二合一 Codex 安装与配置指南'
  },
  {
    site: '02-ClaudeCode上下文压缩配置.md',
    title: 'Claude Code 上下文自动压缩配置'
  },
  {
    site: '03-Agentic入门宝典.md',
    title: 'codesome｜Agentic 入门宝典'
  }
];

export const LATEST_BASELINE_SITES = new Set(
  LATEST_BASELINE_ARTICLES.map(article => article.site)
);

// 站点独有人工文章：不来自 CDC 快照，也不参与 CDC 正文和图片同步。
export const SITE_ONLY_ARTICLES = [
  {
    site: '03-GPTImage2终端生图备忘录.md',
    title: 'GPT Image 2 终端生图备忘录'
  }
];

export const SITE_ONLY_SITES = new Set(
  SITE_ONLY_ARTICLES.map(article => article.site)
);
