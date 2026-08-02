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
    state.failures.push({ reason: 'page-title fallback was required', title: title });
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[Codesome title pipeline] page-title fallback was required for: ' + title);
    }
  }

  function demoteHeading(node) {
    var replacement = document.createElement('h2');
    Array.from(node.attributes).forEach(function (attribute) {
      replacement.setAttribute(attribute.name, attribute.value);
    });
    while (node.firstChild) {
      replacement.appendChild(node.firstChild);
    }
    node.parentNode.replaceChild(replacement, node);
  }

  function reportDomRepair(title, count) {
    var state = pipelineState();
    state.status = 'failed';
    state.domRepairs = (state.domRepairs || 0) + count;
    state.failures = state.failures || [];
    state.failures.push({
      reason: 'extra DOM H1 headings were demoted',
      title: title,
      count: count
    });
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[Codesome title pipeline] demoted ' + count + ' extra DOM H1 heading(s): ' + title);
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
        extraHeadings.forEach(demoteHeading);
        reportDomRepair(title, extraHeadings.length);
      }
      matchingHeading.classList.add('page-title');
      matchingHeading.setAttribute('data-codesome-title-source', 'manifest-injector');
      markDom(title, 'manifest-injector');
      var first = article.firstElementChild;
      if (matchingHeading !== first) {
        article.insertBefore(matchingHeading, first);
      }
      return;
    }

    reportFallback(title);

    if (isHomeRoute() && first && first.tagName === 'H1' &&
        first.textContent.trim().indexOf('欢迎来到') === 0) {
      first.remove();
      first = article.firstElementChild;
    }

    articleHeadings(article).forEach(demoteHeading);
    first = article.firstElementChild;

    var heading = document.createElement('h1');
    heading.className = 'page-title';
    heading.setAttribute('data-codesome-title-source', 'page-title-fallback');
    heading.textContent = title;
    article.insertBefore(heading, first);
    markDom(title, 'page-title-fallback');
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
