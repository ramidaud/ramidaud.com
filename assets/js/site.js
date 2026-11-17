// Small enhancements only. The site works without JavaScript.
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

// Home page: three most recent pieces from the writing index
(async function () {
  const list = document.querySelector('[data-latest-writing]');
  if (!list) return;
  try {
    const data = await fetch('assets/data/writing.json').then(r => r.json());
    const latest = data.items.filter(i => !i.draft).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    list.innerHTML = latest.map(i => `
      <li>
        <p class="meta">${data.threads[i.thread]?.label || ''} · ${new Date(i.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        <a href="${i.url}">${i.title}</a>
      </li>`).join('');
  } catch (e) { list.remove(); }
})();
