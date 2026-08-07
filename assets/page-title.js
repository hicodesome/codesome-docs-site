(function () {
  'use strict';

  var homeTitle = 'codesome｜Agentic 入门宝典';

  function isHomeRoute() {
    return !window.location.hash || window.location.hash === '#/';
  }

  function articleFileFromRoute() {
    var hash = String(window.location && window.location.hash || '');
    var route = hash.replace(/^#\/?/, '').split(/[?#]/)[0];

    if (!route) {
      return window.$docsify && window.$docsify.homepage || '';
    }

    route = '/' + route;
    var aliases = window.$docsify && window.$docsify.alias || {};
    var previousRoute = '';
    var aliasKeys = Object.keys(aliases);
    while (route && route !== previousRoute && aliasKeys.length) {
      previousRoute = route;
      for (var index = 0; index < aliasKeys.length; index += 1) {
        var aliasKey = aliasKeys[index];
        var aliasPattern;
        try {
          aliasPattern = new RegExp('^' + aliasKey + '$');
        } catch (e) {
          continue;
        }
        if (aliasPattern.test(route)) {
          route = route.replace(aliasPattern, aliases[aliasKey]);
          break;
        }
      }
    }

    route = route.replace(/^\/+/, '');
    try {
      route = decodeURIComponent(route);
    } catch (e) { /* Keep the encoded route when decoding fails. */ }
    return /\.md$/i.test(route) ? route : route + '.md';
  }

  function fileNameFromHref(href) {
    var route = String(href || '');
    var hashIndex = route.indexOf('#');
    if (hashIndex !== -1) {
      route = route.slice(hashIndex + 1);
    }
    route = route.split(/[?#]/)[0].replace(/^\/+/, '');
    try {
      route = decodeURIComponent(route);
    } catch (e) { /* Keep the encoded route when decoding fails. */ }
    return /\.md$/i.test(route) ? route : route + '.md';
  }

  function sidebarTitle() {
    if (isHomeRoute()) {
      var homeLink = document.querySelector('.sidebar-nav a[href="#/"]');
      return homeLink ? homeLink.textContent.trim() : homeTitle;
    }

    var activeLink = document.querySelector('.sidebar-nav li.active > a');
    if (activeLink) {
      return activeLink.textContent.trim();
    }

    var articleFile = articleFileFromRoute();
    var canonicalLink = Array.from(document.querySelectorAll('.sidebar-nav a')).find(function (link) {
      return fileNameFromHref(link.getAttribute('href')) === articleFile;
    });
    return canonicalLink ? canonicalLink.textContent.trim() : null;
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
      var contentChildren = Array.from(article.children).filter(function (node) {
        return !node.classList.contains('article-copy-toolbar');
      });
      if (contentChildren[0] !== matchingHeading) {
        reportDomViolation(title, 'registered DOM H1 is not the first article content element');
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
