// Writing index as a mission log. Reads assets/data/writing.json.
// Add new pieces to the JSON only; this page and the home page update themselves.
(function () {
  const root = document.querySelector('[data-index]');
  if (!root) return;
  const base = root.dataset.base || '../';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const href = u => /^https?:/.test(u) ? u : base + u;
  const stamp = d => d.replaceAll('-', ' ');

  fetch(base + 'assets/data/writing.json').then(r => r.json()).then(data => {
    const items = data.items.filter(i => !i.draft).sort((a, b) => b.date.localeCompare(a.date));
    const threads = data.threads;

    // Start here
    const starts = document.querySelector('[data-featured]');
    starts.innerHTML = items.filter(i => i.featured).map(i => `
      <a class="index-card" href="${href(i.url)}">
        <span class="label">Start here · ${esc(i.type)} · ${esc(threads[i.thread]?.label)}</span>
        <span class="t">${esc(i.title)}</span>
        ${i.dek ? `<span class="d">${esc(i.dek)}</span>` : ''}
      </a>`).join('');

    // Header counts
    document.querySelectorAll('[data-total]').forEach(el => { el.textContent = items.length; });
    const last = document.querySelector('[data-last]');
    if (last && items[0]) last.textContent = new Date(items[0].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

    // Filters
    const counts = {};
    items.forEach(i => { counts[i.thread] = (counts[i.thread] || 0) + 1; });
    const keys = ['all', ...Object.keys(threads).filter(k => counts[k])];
    const filters = document.querySelector('[data-filters]');
    filters.innerHTML = keys.map(k => `<button type="button" class="chip-btn" data-thread="${k}" aria-pressed="false">${k === 'all' ? 'All' : esc(threads[k].label)}<span>${k === 'all' ? items.length : counts[k]}</span></button>`).join('');

    function render(thread) {
      const list = thread === 'all' ? items : items.filter(i => i.thread === thread);
      filters.querySelectorAll('.chip-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.thread === thread)));
      document.querySelector('[data-blurb]').textContent = thread === 'all' ? '' : threads[thread].blurb;
      const byYear = {};
      list.forEach(i => { (byYear[i.date.slice(0, 4)] ||= []).push(i); });
      root.innerHTML = Object.keys(byYear).sort().reverse().map(y => `
        <h3 class="year">${y}</h3>
        <ol class="logrows">${byYear[y].map(i => `
          <li>
            <span class="stamp">${stamp(i.date)}</span>
            <span class="chan">${esc(i.type)}${(i.tags || []).find(t => /^\d+$/.test(t)) ? ' ' + (i.tags.find(t => /^\d+$/.test(t))) : ''}</span>
            <a class="title" href="${href(i.url)}">${esc(i.title)}</a>
            <span class="where">${esc(i.venue)}${(i.also || []).map(a => ` · <a href="${href(a.url)}">${esc(a.venue)}</a>`).join('')}</span>
          </li>`).join('')}</ol>`).join('');
    }

    filters.addEventListener('click', e => {
      const b = e.target.closest('.chip-btn'); if (!b) return;
      history.replaceState(null, '', b.dataset.thread === 'all' ? location.pathname : '#' + b.dataset.thread);
      render(b.dataset.thread);
    });
    const start = location.hash.slice(1);
    render(keys.includes(start) ? start : 'all');
  }).catch(() => {});
})();
