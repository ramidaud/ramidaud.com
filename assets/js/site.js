// Small enhancements only. The site works without JavaScript.
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
