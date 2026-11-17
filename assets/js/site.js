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

// Copy buttons on prompt blocks
document.querySelectorAll('.copy-block').forEach(block => {
  const pre = block.querySelector('pre'); if (!pre || !navigator.clipboard) return;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'copy-btn'; btn.textContent = 'Copy';
  btn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(pre.textContent.trim());
    btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });
  block.appendChild(btn);
});

// Highlight the current section in a guide's table of contents
const tocLinks = document.querySelectorAll('.toc a[href^="#"]');
if (tocLinks.length && 'IntersectionObserver' in window) {
  const map = new Map([...tocLinks].map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        tocLinks.forEach(a => a.removeAttribute('aria-current'));
        map.get(e.target.id)?.setAttribute('aria-current', 'true');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
}
