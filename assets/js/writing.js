// Writing index. Reads assets/data/writing.json and renders featured cards,
// thread filters and a year-grouped list. Add new pieces to the JSON only.
(async function () {
  const root = document.querySelector('[data-index]');
  if (!root) return;
  const base = document.documentElement.dataset.base || '../';
  const res = await fetch(base + 'assets/data/writing.json');
  const data = await res.json();
  const items = data.items.filter(i => !i.draft);
  const threads = data.threads;

  const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const href = u => /^https?:/.test(u) ? u : base + u;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Featured
  const featured = items.filter(i => i.featured);
  document.querySelector('[data-featured]').innerHTML = featured.map(i => `
    <article class="card">
      <p class="label">${esc(threads[i.thread]?.label || '')} · ${esc(i.type)}</p>
      <h3><a href="${href(i.url)}">${esc(i.title)}</a></h3>
      ${i.dek ? `<p>${esc(i.dek)}</p>` : ''}
      <p class="meta">${esc(i.venue)} · ${fmt(i.date)}, ${i.date.slice(0, 4)}</p>
    </article>`).join('');

  // Filters
  const counts = {};
  items.forEach(i => { counts[i.thread] = (counts[i.thread] || 0) + 1; });
  const keys = ['all', ...Object.keys(threads).filter(k => counts[k])];
  const filters = document.querySelector('[data-filters]');
  filters.innerHTML = keys.map(k => `<button type="button" class="chip" data-thread="${k}" aria-pressed="false">${k === 'all' ? 'All' : esc(threads[k].label)} <span>${k === 'all' ? items.length : counts[k]}</span></button>`).join('');

  function render(thread) {
    const list = thread === 'all' ? items : items.filter(i => i.thread === thread);
    filters.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.thread === thread)));
    document.querySelector('[data-blurb]').textContent = thread === 'all' ? '' : threads[thread].blurb;
    document.querySelector('[data-count]').textContent = `(${list.length})`;
    const byYear = {};
    list.forEach(i => { (byYear[i.date.slice(0, 4)] ||= []).push(i); });
    root.innerHTML = Object.keys(byYear).sort().reverse().map(y => `
      <h3 class="year">${y}</h3>
      <ol class="writing-list">${byYear[y].sort((a, b) => b.date.localeCompare(a.date)).map(i => `
        <li>
          <time datetime="${i.date}">${fmt(i.date)}</time>
          <div>
            <a class="title" href="${href(i.url)}">${esc(i.title)}</a>
            <span class="meta">${esc(threads[i.thread]?.label || '')} · ${esc(i.venue)}${(i.also || []).map(a => ` · <a href="${href(a.url)}">also on ${esc(a.venue)}</a>`).join('')}</span>
          </div>
        </li>`).join('')}</ol>`).join('');
  }

  filters.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    history.replaceState(null, '', b.dataset.thread === 'all' ? location.pathname : '#' + b.dataset.thread);
    render(b.dataset.thread);
  });
  const start = location.hash.slice(1);
  render(keys.includes(start) ? start : 'all');
})();
