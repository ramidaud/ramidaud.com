/* Inner pages: content rises in and photos develop as each block reaches the view.
   Skipped for reduced motion and for browsers without IntersectionObserver. */
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var main = document.querySelector("main") || document.body;
  var SEL = "h1, h2, h3, p, figure, ul, ol, dl, blockquote, table, aside, video, .two > div, .run-col, .run-lesson, .summary";
  var SKIP = "nav, header, footer, .menu, .shell-menu, .frame, .titleblock, .tb, .skip";
  var all = Array.prototype.slice.call(main.querySelectorAll(SEL)).filter(function (el) {
    if (el.closest(SKIP)) return false;
    if (el.closest(".run-cols") && !el.classList.contains("run-col") && el.closest(".run-col")) return false;
    return true;
  });
  var set = new Set(all);
  var items = all.filter(function (el) { for (var n = el.parentElement; n && n !== main; n = n.parentElement) if (set.has(n)) return false; return true; });
  if (!items.length) return;
  document.documentElement.classList.add("rv");
  var io = new IntersectionObserver(function (es) {
    var k = 0;
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.style.transitionDelay = Math.min(k++, 6) * 70 + "ms";
      e.target.classList.add("rv-on"); io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
  items.forEach(function (el) { el.classList.add("rv-i"); io.observe(el); });
})();
