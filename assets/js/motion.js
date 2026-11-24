/* Scroll-triggered entrances for the drawing set.
   Each [data-fx] element plays its entrance when it reaches the view, not when the sheet opens.
   Skipped entirely for reduced motion or browsers without IntersectionObserver: everything shows finished. */
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var root = document.documentElement;
  root.classList.add("fxio");
  var opened = 0;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var t = e.target;
      if (performance.now() - opened > 700) t.classList.add("late");
      t.classList.add("seen");
      io.unobserve(t);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
  function arm(sheet) {
    opened = performance.now();
    Array.prototype.forEach.call(sheet.querySelectorAll("[data-fx], [data-reveal]"), function (el) {
      el.classList.remove("seen", "late");
      io.observe(el);
    });
  }
  var mo = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      var s = m.target, on = s.classList.contains("in");
      if (on && !s._armed) { s._armed = true; arm(s); }
      if (!on) s._armed = false;
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".sheet"), function (s) {
    mo.observe(s, { attributes: true, attributeFilter: ["class"] });
    if (s.classList.contains("in")) { s._armed = true; arm(s); }
  });
})();
