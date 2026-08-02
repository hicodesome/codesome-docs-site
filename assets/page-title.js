(function () {
  'use strict';

  var homeTitle = 'codesome｜Agentic 入门宝典';

  function isHomeRoute() {
    return !window.location.hash || window.location.hash === '#/';
  }

  function sidebarTitle() {
    if (isHomeRoute()) {
      var homeLink = document.querySelector('.sidebar-nav a[href="#/"]');
      return homeLink ? homeLink.textContent.trim() : homeTitle;
    }

    var activeLink = document.querySelector('.sidebar-nav li.active > a');
    return activeLink ? activeLink.textContent.trim() : null;
  }

  function articleHeadings(article) {
    return Array.from(article.querySelectorAll('h1'));
  }

  function pipelineState() {
    window.CODESOME_TITLE_PIPELINE = window.CODESOME_TITLE_PIPELINE || {
      version: 'missing',
      status: 'missing',
      processed: {},
      failures: [],
      dom: {}
    };
    window.CODESOME_TITLE_PIPELINE.dom = window.CODESOME_TITLE_PIPELINE.dom || {};
    return window.CODESOME_TITLE_PIPELINE;
  }

  function markDom(title, source) {
    var state = pipelineState();
    state.dom[window.location.hash || '#/'] = {
      title: title,
      source: source
    };
  }

  function reportFallback(title) {
    var state = pipelineState();
    state.status = 'failed';
    state.domFallbacks = (state.domFallbacks || 0) + 1;
    state.failures = state.failures || [];
    state.failures.push({ reason: 'registered DOM H1 is missing', title: title });
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[Codesome title pipeline] registered DOM H1 is missing: ' + title);
    }
  }

  function reportDomViolation(title, reason, count) {
    var state = pipelineState();
    state.status = 'failed';
    state.domViolations = (state.domViolations || 0) + 1;
    state.failures = state.failures || [];
    state.failures.push({
      reason: reason,
      title: title,
      count: count || 0
    });
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[Codesome title pipeline] ' + reason + ': ' + title);
    }
  }

  function applyPageTitle() {
    var article = document.querySelector('.markdown-section');
    var title = sidebarTitle();

    if (!article || !title) {
      return;
    }

    var headings = articleHeadings(article);
    var matchingHeading = headings.find(function (node) {
      return node.textContent.trim() === title;
    });

    if (matchingHeading) {
      var extraHeadings = headings.filter(function (node) { return node !== matchingHeading; });
      if (extraHeadings.length) {
        reportDomViolation(title, 'extra DOM H1 headings violate the article contract', extraHeadings.length);
        return;
      }
      if (matchingHeading !== article.firstElementChild) {
        reportDomViolation(title, 'registered DOM H1 is not the first article element');
        return;
      }
      matchingHeading.classList.add('page-title');
      matchingHeading.setAttribute('data-codesome-title-source', 'manifest-injector');
      markDom(title, 'manifest-injector');
      return;
    }

    reportFallback(title);
  }

  function pageTitlePlugin(hook) {
    hook.doneEach(function () {
      applyPageTitle();
      window.setTimeout(applyPageTitle, 0);
    });
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = [].concat(
    pageTitlePlugin,
    window.$docsify.plugins || []
  );
}());
