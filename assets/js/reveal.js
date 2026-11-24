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
  /* Safety net: if nothing has revealed after 2.5 s (an observer that never fires on some device), show everything. */
  setTimeout(function () {
    if (!document.querySelector(".rv-i.rv-on")) document.documentElement.classList.remove("rv");
  }, 2500);
})();

/* Red side rules (pull quotes, notes, now/next lines) swell once as they come into view. Styles: .mark-in */
(function () {
  if (!("IntersectionObserver" in window) || window.RD_SHELL) return;   // inside the sheet, motion.js does this
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("mark-in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.6 });
  Array.prototype.forEach.call(document.querySelectorAll(".pull, .note, .ai-role, .nownext, .pj .shows, .ftc-essays blockquote"), function (el) { io.observe(el); });
})();
