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

  function directHeadings(article) {
    return Array.from(article.children).filter(function (node) {
      return node.tagName === 'H1';
    });
  }

  function applyPageTitle() {
    var article = document.querySelector('.markdown-section');
    var title = sidebarTitle();

    if (!article || !title) {
      return;
    }

    var first = article.firstElementChild;
    var matchingHeading = directHeadings(article).find(function (node) {
      return node.textContent.trim() === title;
    });

    if (matchingHeading) {
      matchingHeading.classList.add('page-title');
      if (matchingHeading !== first) {
        article.insertBefore(matchingHeading, first);
      }
      return;
    }

    if (isHomeRoute() && first && first.tagName === 'H1' &&
        first.textContent.trim().indexOf('欢迎来到') === 0) {
      first.remove();
      first = article.firstElementChild;
    }

    var heading = document.createElement('h1');
    heading.className = 'page-title';
    heading.textContent = title;
    article.insertBefore(heading, first);
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
