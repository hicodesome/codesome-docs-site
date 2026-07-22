/**
 * CDC Title Injector
 *
 * Wraps Docsify.get to inject a H1 heading from the CDC article manifest
 * when a markdown file has no H1 of its own. This ensures the Docsify
 * search plugin (depth:1) picks up the correct article title instead of
 * falling back to the URL-encoded file path.
 *
 * Must be loaded AFTER docsify.min.js (Docsify.get must exist) and
 * BEFORE search.min.js (which calls Docsify.get during init).
 *
 * Also clears stale search-index caches to force a fresh rebuild on
 * the first load after deployment.
 */
(function () {
  'use strict';

  /* ── CDC article title map: filename → display title ────────────────
   * Generated from scripts/cdc-manifest.mjs (cdc-snapshot-2026-07-14).
   * Every article that appears on the site is listed so that search
   * results show the proper title even when the markdown omits H1.
   */
  var CDC_TITLES = {
    '01-CCSwitch配置Claude桌面端.md': 'CC Switch 配置 Claude 桌面端教程',
    '01-GrokBuildCLI配置教程.md': 'Grok Build CLI + Codesome API 配置教程',
    '01-OpenClaw配置教程.md': 'OpenClaw 最新配置教程',
    '01-V3计划-ClaudeCode安装配置.md': 'V3 Claude Code 安装与配置指南',
    '01-V3计划-Codex安装配置.md': 'V3 Codex 安装与配置指南',
    '01-V3计划-OpenCode配置.md': 'V3 如何配置 OpenCode',
    '01-二合一计划-ClaudeCode安装配置.md': '二合一 Claude Code 安装与配置指南',
    '01-二合一计划-Codex安装配置.md': '二合一 Codex 安装与配置指南',
    '01-二合一计划-OpenCode配置.md': '二合一月卡如何配置 OpenCode',
    '01-二合一计划-Hermes配置-Mac手动版.md': '【最新】Hermes 二合一配置教程',
    '01-二合一计划-Hermes配置-AI自动版.md': '【最新】hermes配置教程',
    '01-官方地址.md': '官方地址是多少',
    '01-第三方客户端接入配置.md': '第三方客户端接入 Codesome 配置指南',
    '02-ClaudeCode上下文压缩配置.md': 'Claude Code 上下文自动压缩配置',
    '02-Codex桌面版断连和502排查.md': 'Codex 桌面版持续 Reconnecting + 502 报错排查',
    '02-使用问题速查.md': 'codesome｜使用问题速查',
    '02-平台服务紧张应对方案.md': '关于 Codesome 平台 Claude Code 服务紧张及应对方案的公告',
    '03-Agentic入门宝典.md': 'codesome｜Agentic 入门宝典',
    '03-Agentway学习平台介绍.md': '从用 Agent 到造 Agent：Agentway 帮你完成一次真正的 Agent 工程师进化',
    '03-Token降费执行手册.md': '这样做，可以省下大半 Token 账单：长上下文降费执行手册',
    '03-对话管理CC中转站.md': '懒人党福音最简单：通过对话来管理你的 cc 中转站',
    '03-牛马神器-CC绘制PPT.md': 'No.1 牛马神器： 让 cc 帮你绘制你的牛马 PPT（宜：述职汇报、产品方案、市场洞察、需求调研等）',
    '04-小白课程录播合集.md': 'codesome claude code小白课程录播',
    '05-AI编程课红包福利.md': 'AI 编程课红包福利',
    '05-兑换码兑换指南.md': 'cc兑换码兑换指南'
  };

  /* ── 1. Clear stale search-index caches ─────────────────────────────
   * Old namespaces (article-title-v1, no-namespace) hold URL-encoded
   * path fallbacks.  We remove them so the search plugin builds a fresh
   * index with correct CDC titles injected below.
   */
  var STALE_KEYS = [
    'docsify.search.index',
    'docsify.search.expires',
    'docsify.search.index/article-title-v1',
    'docsify.search.expires/article-title-v1'
  ];
  STALE_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });

  /* ── 2. Wrap Docsify.get ────────────────────────────────────────────
   * Intercept every Docsify fetch.  When the fetched file matches a CDC
   * article and its raw content contains no H1, prepend the proper title
   * as a level-1 heading.
   *
   * The search plugin runs in a later lifecycle and calls Docsify.get
   * during its init; by the time it runs, this wrapper is in place, so
   * genIndex sees the corrected content with a real H1.
   */
  if (typeof Docsify === 'undefined' || typeof Docsify.get !== 'function') {
    // Safety: Docsify hasn't loaded yet (shouldn't happen if script order is correct).
    return;
  }

  var origGet = Docsify.get;

  Docsify.get = function (url, hasBar, headers) {
    // Determine the file name from the URL, decoding percent-encoded
    // Chinese characters so it matches CDC_TITLES keys.
    var fileName;
    try {
      fileName = decodeURIComponent(url).split('?')[0].split('/').pop();
    } catch (e) {
      fileName = '';
    }
    var cdcTitle = CDC_TITLES[fileName];

    // If no CDC title exists for this file, pass through unchanged.
    if (!cdcTitle) {
      return origGet(url, hasBar, headers);
    }

    // Fetch the raw content and inject H1 if H1 is absent.
    var result = origGet(url, hasBar, headers);
    var origThen = result.then;

    result.then = function (success, error) {
      return origThen.call(result, function (content, opt) {
        // /^# /m matches H1 at the start of any line.
        if (content && typeof content === 'string' && !/^# /m.test(content)) {
          return success('# ' + cdcTitle + '\n\n' + content, opt);
        }
        return success(content, opt);
      }, error);
    };

    return result;
  };
})();
