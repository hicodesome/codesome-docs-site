(function () {
  'use strict';

  var defaultHomepage = '03-Agentic入门宝典.md';
  var markdownCache = new Map();
  var renderSerial = 0;
  var resetTimer = 0;

  function homepage() {
    return window.$docsify && window.$docsify.homepage
      ? window.$docsify.homepage
      : defaultHomepage;
  }

  function decode(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return '';
    }
  }

  function normalizeRoute(value) {
    var route = value || '';
    var hashIndex = route.indexOf('#');

    if (hashIndex !== -1) {
      route = route.slice(hashIndex + 1);
    }

    route = route.split(/[?#]/)[0].replace(/^\/+/, '');
    route = decode(route);

    if (!route) {
      return homepage();
    }

    if (route.split('/').indexOf('..') !== -1) {
      return '';
    }

    if (!/\.md$/i.test(route)) {
      route = route + '.md';
    }

    return route;
  }

  function currentRoute() {
    return normalizeRoute(window.location.hash || '');
  }

  function routeFromHref(href) {
    if (!href) {
      return '';
    }

    if (href.charAt(0) === '#') {
      return normalizeRoute(href);
    }

    try {
      return normalizeRoute(new URL(href, document.baseURI).hash);
    } catch (error) {
      return '';
    }
  }

  function sidebarTitle(route) {
    var links = Array.prototype.slice.call(document.querySelectorAll('.sidebar-nav a'));
    var activeLink = document.querySelector('.sidebar-nav li.active > a');

    if (activeLink && routeFromHref(activeLink.getAttribute('href')) === route) {
      return activeLink.textContent.trim();
    }

    var matchingLink = links.find(function (link) {
      return routeFromHref(link.getAttribute('href')) === route;
    });

    return matchingLink ? matchingLink.textContent.trim() : '';
  }

  function sourceUrl(route) {
    return new URL(route, document.baseURI).href;
  }

  function loadMarkdown(route) {
    if (markdownCache.has(route)) {
      return Promise.resolve(markdownCache.get(route));
    }

    return fetch(sourceUrl(route), {
      credentials: 'same-origin'
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('Markdown request failed: ' + response.status);
      }

      return response.text();
    }).then(function (markdown) {
      if (!markdown.trim()) {
        throw new Error('Markdown is empty');
      }

      markdownCache.set(route, markdown);
      return markdown;
    });
  }

  function hasLeadingTitle(markdown, title) {
    var source = markdown.charAt(0) === '\uFEFF' ? markdown.slice(1) : markdown;
    var firstLine = source.split(/\r?\n/).find(function (line) {
      return line.trim();
    });
    var heading = firstLine && firstLine.match(/^ {0,3}#\s+(.+?)\s*$/);

    return Boolean(heading && heading[1].trim() === title);
  }

  function markdownWithTitle(markdown, title) {
    if (hasLeadingTitle(markdown, title)) {
      return markdown;
    }

    return '# ' + title + '\n\n' + markdown;
  }

  function setButtonState(button, state) {
    var labels = {
      ready: '复制整页',
      success: '已复制',
      error: '复制失败'
    };

    button.dataset.state = state;
    button.querySelector('.article-copy-label').textContent = labels[state];
    button.setAttribute('aria-label', labels[state] + ' Markdown');
    button.title = labels[state] + ' Markdown';
  }

  function fallbackCopy(text) {
    if (!text || !document.body) {
      return false;
    }

    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.left = '-1000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }

    textarea.remove();
    return copied;
  }

  function copyText(text) {
    if (!text) {
      return Promise.reject(new Error('Markdown is empty'));
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).catch(function () {
        if (fallbackCopy(text)) {
          return undefined;
        }

        throw new Error('Clipboard API and fallback copy failed');
      });
    }

    return fallbackCopy(text)
      ? Promise.resolve()
      : Promise.reject(new Error('Clipboard is unavailable'));
  }

  function isCurrent(button, route) {
    return button.isConnected && currentRoute() === route;
  }

  function bindCopyButton(button, route, markdown) {
    button.__codesomeMarkdown = markdown;
    button.__codesomeRoute = route;
    button.addEventListener('click', function () {
      if (button.disabled || !isCurrent(button, route)) {
        return;
      }

      button.disabled = true;
      copyText(markdown).then(function () {
        if (!isCurrent(button, route)) {
          return;
        }

        window.clearTimeout(resetTimer);
        setButtonState(button, 'success');
        resetTimer = window.setTimeout(function () {
          if (button.isConnected) {
            setButtonState(button, 'ready');
            button.disabled = false;
          }
        }, 1400);
      }).catch(function () {
        if (!isCurrent(button, route)) {
          return;
        }

        setButtonState(button, 'error');
        button.disabled = false;
      });
    });
  }

  function mountButton(route, markdown, serial) {
    if (serial !== renderSerial || currentRoute() !== route) {
      return;
    }

    var article = document.querySelector('.markdown-section');
    var title = sidebarTitle(route);

    if (!article || article.querySelector('.not-found') || !title ||
        article.querySelector('.article-copy-toolbar')) {
      return;
    }

    var toolbar = document.createElement('div');
    toolbar.className = 'article-copy-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', '文章操作');

    var button = document.createElement('button');
    button.className = 'article-copy-button';
    button.type = 'button';
    button.innerHTML = '<span class="article-copy-icon" aria-hidden="true"></span>' +
      '<span class="article-copy-label">复制整页</span>';
    button.setAttribute('aria-label', '复制整页 Markdown');
    button.title = '复制整页 Markdown';
    toolbar.appendChild(button);
    article.insertBefore(toolbar, article.firstElementChild);
    bindCopyButton(button, route, markdownWithTitle(markdown, title));
  }

  function removeButtons() {
    Array.prototype.slice.call(document.querySelectorAll('.article-copy-toolbar'))
      .forEach(function (toolbar) { toolbar.remove(); });
  }

  function prepareCurrentArticle() {
    var serial = ++renderSerial;
    var route = currentRoute();

    removeButtons();
    if (!route) {
      return;
    }

    window.setTimeout(function () {
      loadMarkdown(route)
        .then(function (markdown) { mountButton(route, markdown, serial); })
        .catch(function () { /* Keep 404 and request failures free of actions. */ });
    }, 0);
  }

  function copyPageMarkdownPlugin(hook) {
    hook.doneEach(prepareCurrentArticle);
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = [].concat(
    copyPageMarkdownPlugin,
    window.$docsify.plugins || []
  );
}());
