(function () {
  'use strict';

  var restoreFrame = 0;
  var homeNavigationPending = false;
  var homeNavigationTimer = 0;
  var preservedScrollTop = 0;

  function getSidebar() {
    return document.querySelector('.sidebar');
  }

  function setScrollTop(top) {
    var sidebar = getSidebar();

    if (!sidebar) {
      preservedScrollTop = 0;
      return;
    }

    sidebar.scrollTop = top;
    preservedScrollTop = top;
  }

  function resetForHome() {
    homeNavigationPending = true;
    setScrollTop(0);

    clearTimeout(homeNavigationTimer);
    if (window.location.hash === '#/' || window.location.hash === '#' || !window.location.hash) {
      homeNavigationTimer = setTimeout(function () {
        homeNavigationPending = false;
      }, 250);
    }
  }

  function preserveOnPageScroll(event) {
    if (event.target !== document && event.target !== window) {
      return;
    }

    var sidebar = getSidebar();

    if (!sidebar || homeNavigationPending) {
      return;
    }

    preservedScrollTop = sidebar.scrollTop;
    if (restoreFrame) {
      cancelAnimationFrame(restoreFrame);
    }

    restoreFrame = requestAnimationFrame(function () {
      restoreFrame = 0;
      if (!homeNavigationPending) {
        setScrollTop(preservedScrollTop);
      }
    });
  }

  function sidebarScrollPlugin(hook) {
    hook.doneEach(function () {
      if (homeNavigationPending) {
        setScrollTop(0);
        homeNavigationPending = false;
        clearTimeout(homeNavigationTimer);
      }
    });
  }

  window.addEventListener('scroll', preserveOnPageScroll, true);

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = [].concat(
    sidebarScrollPlugin,
    window.$docsify.plugins || []
  );

  window.__codesomeSidebarScroll = {
    resetForHome: resetForHome
  };
}());
