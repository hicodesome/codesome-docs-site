// 当前人工确认的站点内容基准。
// 这些文章不参与 CDC 正文和图片同步；其他文章继续以 CDC 为准。
export const LATEST_BASELINE_VERSION = '2026-08-02';

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
    site: '01-V3计划-OpenCode配置.md',
    title: 'V3 OpenCode 配置指南'
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
    site: '01-二合一计划-OpenCode配置.md',
    title: '二合一 OpenCode 配置指南'
  },
  {
    site: '02-ClaudeCode上下文压缩配置.md',
    title: 'Claude Code 上下文自动压缩配置'
  },
  {
    site: '03-Agentic入门宝典.md',
    title: 'codesome｜Agentic 入门宝典'
  },
  {
    site: '01-V3计划-GrokBuild安装配置.md',
    title: 'V3 Grok Build 安装与配置指南'
  },
  {
    site: '01-OpenClaw配置教程.md',
    title: 'OpenClaw 最新配置教程'
  },
  {
    site: '01-二合一计划-Hermes配置-AI自动版.md',
    title: '【最新】hermes配置教程'
  },
  {
    site: '01-二合一计划-Hermes配置-Mac手动版.md',
    title: '【最新】Hermes 二合一配置教程'
  },
  {
    site: '01-第三方客户端接入配置.md',
    title: '第三方客户端接入 Codesome 配置指南'
  },
  {
    site: '02-使用问题速查.md',
    title: 'codesome｜使用问题速查'
  },
  {
    site: '03-Token降费执行手册.md',
    title: '这样做，可以省下大半 Token 账单：长上下文降费执行手册'
  },
  {
    site: '05-AI编程课红包福利.md',
    title: 'AI 编程课红包福利'
  },
  {
    site: '01-CCSwitch配置Claude桌面端.md',
    title: 'CC Switch 配置 Claude 桌面端教程'
  },
  {
    site: '02-Codex桌面版断连和502排查.md',
    title: 'Codex 桌面版持续 Reconnecting + 502 报错排查'
  },
  {
    site: '01-官方地址.md',
    title: '官方地址是多少'
  },
  {
    site: '03-牛马神器-CC绘制PPT.md',
    title: 'No.1 牛马神器： 让 cc 帮你绘制你的牛马 PPT（宜：述职汇报、产品方案、市场洞察、需求调研等）'
  },
  {
    site: '05-兑换码兑换指南.md',
    title: 'cc兑换码兑换指南'
  },
  {
    site: '04-小白课程录播合集.md',
    title: 'codesome claude code小白课程录播'
  },
  {
    site: '03-Agentway学习平台介绍.md',
    title: '从用 Agent 到造 Agent：Agentway 帮你完成一次真正的 Agent 工程师进化'
  },
  {
    site: '02-平台服务紧张应对方案.md',
    title: '关于 Codesome 平台 Claude Code 服务紧张及应对方案的公告'
  },
  {
    site: '03-对话管理CC中转站.md',
    title: '懒人党福音最简单：通过对话来管理你的 cc 中转站'
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
  },
  {
    site: '01-PIAgent模型配置示例.md',
    title: 'PIAgent 模型配置示例'
  },
  {
    site: '02-分组是什么怎么选怎么切换.md',
    title: '分组是什么、怎么选、怎么切换？'
  },
  {
    site: '02-月卡按量二合一怎么选.md',
    title: '月卡、按量和二合一怎么选（购买前选购指南）'
  },
  {
    site: '02-V3-V5余额额度用量查询.md',
    title: '如何查询我的余额和用量（网页与 API）'
  }
];

export const SITE_ONLY_SITES = new Set(
  SITE_ONLY_ARTICLES.map(article => article.site)
);
