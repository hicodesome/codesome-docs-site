(function () {
  'use strict';

  var HOME_GRID_HEADING = '配置教程（第 4 步）';

  function findHeading(article, title) {
    return Array.from(article.children).find(function (node) {
      return node.tagName === 'H2' && node.textContent.trim() === title;
    });
  }

  function collectGroups(article, heading) {
    var groups = [];
    var node = heading.nextElementSibling;

    while (node && node.tagName !== 'H2') {
      if (node.tagName === 'H3') {
        var label = node.textContent.trim();
        var items = [];
        var cursor = node.nextElementSibling;

        while (cursor && cursor.tagName !== 'H3' && cursor.tagName !== 'H2') {
          items.push(cursor);
          cursor = cursor.nextElementSibling;
        }

        if (!label || items.length === 0) {
          return null;
        }

        groups.push({ label: label, marker: node, items: items });
        node = cursor;
        continue;
      }

      node = node.nextElementSibling;
    }

    return groups;
  }

  function createLinkRow(cells) {
    var condition = cells[0].textContent.trim();
    var link = cells[1].querySelector('a');

    if (!condition || !link) {
      return null;
    }

    var row = document.createElement('p');
    row.className = 'home-tutorial-group__row';

    var conditionEl = document.createElement('span');
    conditionEl.className = 'home-tutorial-group__cond';
    conditionEl.textContent = condition;

    row.appendChild(conditionEl);
    row.appendChild(link);
    return row;
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
      if (node.tagName === 'TABLE') {
        Array.from(node.querySelectorAll('tr')).forEach(function (row) {
          var rowEl = createLinkRow(Array.from(row.children));
          if (rowEl) {
            items.appendChild(rowEl);
          }
        });
        node.remove();
      } else {
        items.appendChild(node);
      }
    });

    section.appendChild(title);
    section.appendChild(items);
    return section;
  }

  function applyTutorialGrid() {
    var article = document.querySelector('.markdown-section');

    if (!article || article.querySelector('.home-tutorial-grid')) {
      return;
    }

    article.classList.remove('has-home-tutorial-grid');

    var heading = findHeading(article, HOME_GRID_HEADING);
    var groups = heading && collectGroups(article, heading);

    if (!groups || groups.length < 2) {
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'home-tutorial-grid';

    groups.forEach(function (group, index) {
      grid.appendChild(createGroup(group, index + 1));
      group.marker.remove();
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
