const Router = (() => {
  const views = () => document.querySelectorAll('.view');

  function show(viewId) {
    views().forEach(v => { v.classList.remove('view--active'); v.style.display = 'none'; });
    const target = document.getElementById(viewId);
    if (!target) return;
    target.style.display = 'flex';
    target.classList.add('view--active');
    window.scrollTo(0, 0);
  }

  function init() {
    views().forEach(v => {
      if (!v.classList.contains('view--active')) v.style.display = 'none';
      else v.style.display = 'flex';
    });
  }

  return { show, init };
})();
