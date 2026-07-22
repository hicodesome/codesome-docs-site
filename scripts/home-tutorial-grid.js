(function () {
  'use strict';

  var categoryLabels = {
    claude: 'claude code 配置教程👇',
    codex: 'codex 配置教程👇',
    opencode: 'open code 配置教程👇',
    agents: '常见 Agent 配置教程👇',
    clients: '第三方客户端接入👇',
    learning: 'AI 学习资源👇'
  };

  function normalizeText(value) {
    return value
      .replace(/👇/g, '')
      .replace(/\uFE0F/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function directChildren(article) {
    return Array.from(article.children);
  }

  function strongLabel(node) {
    if (!node || node.tagName !== 'P') {
      return null;
    }

    var meaningfulNodes = Array.from(node.childNodes).filter(function (child) {
      return child.nodeType === Node.ELEMENT_NODE ||
        (child.nodeType === Node.TEXT_NODE && child.textContent.trim());
    });

    if (meaningfulNodes.length !== 1 ||
        meaningfulNodes[0].nodeType !== Node.ELEMENT_NODE ||
        meaningfulNodes[0].tagName !== 'STRONG') {
      return null;
    }

    return meaningfulNodes[0].textContent.trim();
  }

  function findHeading(article, title) {
    return directChildren(article).find(function (node) {
      return node.tagName === 'H2' && node.textContent.trim() === title;
    });
  }

  function findStrongMarker(article, title) {
    return directChildren(article).find(function (node) {
      var label = strongLabel(node);
      return label && normalizeText(label) === normalizeText(title);
    });
  }

  function findParagraph(article, predicate) {
    return directChildren(article).find(function (node) {
      return node.tagName === 'P' && predicate(normalizeText(node.textContent));
    });
  }

  function nodesBetween(start, end, includeStart) {
    var nodes = [];
    var node = includeStart ? start : start.nextElementSibling;

    while (node && node !== end) {
      nodes.push(node);
      node = node.nextElementSibling;
    }

    return node === end ? nodes : [];
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
    return section;
  }

  function collectGroups(article) {
    var claude = findStrongMarker(article, categoryLabels.claude);
    var codex = findStrongMarker(article, categoryLabels.codex);
    var opencode = findStrongMarker(article, categoryLabels.opencode);
    var agents = findStrongMarker(article, categoryLabels.agents);
    var manager = findStrongMarker(article, '扣桑AI管家服务👇');
    var thirdParty = findParagraph(article, function (text) {
      return text.indexOf('cherry studio') === 0;
    });
    var learning = findParagraph(article, function (text) {
      return text.indexOf('ai 编程课学习') === 0;
    });
    var learningEnd = learning && Array.from(article.children)
      .slice(Array.from(article.children).indexOf(learning) + 1)
      .find(function (node) {
        return node.tagName === 'H2';
      });

    if (!claude || !codex || !opencode || !agents || !thirdParty ||
        !manager || !learning || !learningEnd) {
      return null;
    }

    var groups = [
      {
        label: categoryLabels.claude,
        marker: claude,
        items: nodesBetween(claude, codex, false)
      },
      {
        label: categoryLabels.codex,
        marker: codex,
        items: nodesBetween(codex, opencode, false)
      },
      {
        label: categoryLabels.opencode,
        marker: opencode,
        items: nodesBetween(opencode, agents, false)
      },
      {
        label: categoryLabels.agents,
        marker: agents,
        items: nodesBetween(agents, thirdParty, false)
      },
      {
        label: categoryLabels.clients,
        items: nodesBetween(thirdParty, manager, true)
      },
      {
        label: categoryLabels.learning,
        items: nodesBetween(learning, learningEnd, true)
      }
    ];

    if (groups.some(function (group) {
      return group.items.length === 0;
    })) {
      return null;
    }

    return groups;
  }

  function applyTutorialGrid() {
    var article = document.querySelector('.markdown-section');

    if (!article) {
      return;
    }

    if (article.querySelector('.home-tutorial-grid')) {
      return;
    }

    article.classList.remove('has-home-tutorial-grid');

    var heading = findHeading(article, '扣桑 AI 工作坊 常用教程');
    var groups = heading && collectGroups(article);

    if (!heading || !groups || groups.length !== 6) {
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'home-tutorial-grid';

    groups.forEach(function (group, index) {
      grid.appendChild(createGroup(group, index + 1));
      if (group.marker) {
        group.marker.remove();
      }
    });

    article.classList.add('has-home-tutorial-grid');
    heading.insertAdjacentElement('afterend', grid);
  }

  function homeTutorialGridPlugin(hook) {
    hook.doneEach(applyTutorialGrid);
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = [].concat(
    homeTutorialGridPlugin,
    window.$docsify.plugins || []
  );
}());
