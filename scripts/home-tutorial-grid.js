(function () {
  'use strict';

  var categoryNames = new Set([
    'claude code 配置教程',
    'codex 配置教程',
    'open code 配置教程',
    '常见 agent 配置教程'
  ]);

  function normalizeCategory(value) {
    return value.replace(/👇/g, '').trim().toLowerCase();
  }

  function strongLabel(node) {
    if (!node || node.tagName !== 'P' || node.children.length !== 1) {
      return null;
    }

    var child = node.firstElementChild;
    if (!child || child.tagName !== 'STRONG') {
      return null;
    }

    return child.textContent.trim();
  }

  function findTutorialHeading(article) {
    return Array.from(article.children).find(function (node) {
      return node.tagName === 'H2' &&
        node.textContent.trim() === '扣桑 AI 工作坊 常用教程';
    });
  }

  function collectGroups(heading) {
    var groups = [];
    var current = null;
    var node = heading.nextElementSibling;

    while (node && node.tagName !== 'H2') {
      var label = strongLabel(node);

      if (label) {
        if (!categoryNames.has(normalizeCategory(label))) {
          break;
        }

        current = { marker: node, label: label.replace(/👇/g, '').trim(), items: [] };
        groups.push(current);
      } else if (current) {
        current.items.push(node);
      }

      node = node.nextElementSibling;
    }

    return groups;
  }

  function createGroup(group, index) {
    var section = document.createElement('section');
    var title = document.createElement('h3');
    var items = document.createElement('div');
    var titleId = 'home-tutorial-category-' + index;

    section.className = 'home-tutorial-group';
    section.setAttribute('aria-labelledby', titleId);
    title.id = titleId;
    title.textContent = group.label;
    items.className = 'home-tutorial-group__items';

    group.items.forEach(function (node) {
      items.appendChild(node);
    });

    section.appendChild(title);
    section.appendChild(items);
    group.marker.remove();
    return section;
  }

  function applyTutorialGrid() {
    var article = document.querySelector('.markdown-section');
    if (!article || article.querySelector('.home-tutorial-grid')) {
      return;
    }

    var heading = findTutorialHeading(article);
    if (!heading) {
      return;
    }

    var groups = collectGroups(heading);
    if (groups.length !== categoryNames.size || groups.some(function (group) {
      return group.items.length === 0;
    })) {
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'home-tutorial-grid';

    groups.forEach(function (group, index) {
      grid.appendChild(createGroup(group, index + 1));
    });

    heading.insertAdjacentElement('afterend', grid);
  }

  function homeTutorialGridPlugin(hook) {
    hook.doneEach(function () {
      window.requestAnimationFrame(applyTutorialGrid);
    });
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = [].concat(
    homeTutorialGridPlugin,
    window.$docsify.plugins || []
  );
}());
