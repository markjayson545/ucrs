// The screenshots are all readable in HTML. Tabs show one at a time when JS runs.
(() => {
  const gallery = document.querySelector('[data-showcase]');
  const tabList = gallery.querySelector('[role="tablist"]');
  const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

  function showWorkspace(index, animate = false) {
    tabs.forEach((tab, position) => {
      const selected = index === position;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    if (animate) {
      panels[index].dispatchEvent(new Event('portal:feedback', { bubbles: true }));
    }
  }

  tabs.forEach((tab, index) => {
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => showWorkspace(index, true));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      showWorkspace(next, true);
      tabs[next].focus();
    });
  });

  showWorkspace(0);
  tabList.hidden = false;
})();
