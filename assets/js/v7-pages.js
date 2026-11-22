/* Inner pages inside the Version 7 sheet: theme toggle (same "rd-theme" key and button as the home page),
   copy buttons on prompt blocks, the contents list that follows the reader, and the footer year. */
/* Content enhancers, shared with the home page: when an inner page is opened inside the home sheet,
   index.html calls window.rdEnhance(section) on the new content. Returns a cleanup function. */
window.rdEnhance = function (scope) {
  var undo = [];
  scope.querySelectorAll(".copy-block").forEach(function (block) {
    var pre = block.querySelector("pre");
    if (!pre || !navigator.clipboard || block.querySelector(".copy-btn")) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "copy-btn"; b.textContent = "Copy";
    b.addEventListener("click", function () {
      navigator.clipboard.writeText(pre.textContent.trim()).then(function () { b.textContent = "Copied"; }, function () { b.textContent = "Select and copy"; });
      setTimeout(function () { b.textContent = "Copy"; }, 1600);
    });
    block.appendChild(b);
  });

  var toc = scope.querySelectorAll('.toc a[href^="#"]');
  if (toc.length && "IntersectionObserver" in window) {
    var map = {};
    toc.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        toc.forEach(function (a) { a.removeAttribute("aria-current"); });
        var a = map[e.target.id]; if (a) a.setAttribute("aria-current", "true");
      });
    }, { root: document.querySelector(".panel"), rootMargin: "-20% 0px -70% 0px" });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    undo.push(function () { io.disconnect(); });
  }

  scope.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  Array.prototype.forEach.call(scope.querySelectorAll("table"), function (tb) {
    var box = tb.parentElement;
    if (!box || box.scrollWidth <= box.clientWidth + 2 || getComputedStyle(box).overflowX === "visible") return;
    if (box.previousElementSibling && box.previousElementSibling.classList.contains("scroll-cue")) return;
    var cue = document.createElement("p"); cue.className = "scroll-cue"; cue.textContent = "Swipe the table sideways to see every column";
    box.parentElement.insertBefore(cue, box);
  });
  return function () { undo.forEach(function (f) { f(); }); };
};
if (window.RD_SHELL) { /* inside the home sheet: the home page owns the theme button, Detail A and the sheet tabs */ }
else (function () {
  var root = document.documentElement;
  root.classList.add("js");

  var btn = document.querySelector(".tbtn");
  function isDark() { return root.getAttribute("data-theme") === "dark"; }
  function label() {
    if (!btn) return;
    btn.textContent = isDark() ? "Light" : "Dark";
    btn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
  }
  label();
  if (btn) btn.addEventListener("click", function () {
    if (isDark()) root.removeAttribute("data-theme"); else root.setAttribute("data-theme", "dark");
    try { localStorage.setItem("rd-theme", isDark() ? "dark" : "light"); } catch (e) {}
    label();
  });

  var panelEl = document.querySelector(".panel");
  if (panelEl) window.rdEnhance(panelEl);

  /* Phones: Detail A grows on tap and shrinks when you're done with it */
  var slot = document.querySelector(".camslot"), panel = document.querySelector(".panel");
  if (slot && panel) {
    var grow = document.createElement("button"), from = 0;
    grow.type = "button"; grow.className = "grow";
    grow.setAttribute("aria-expanded", "false"); grow.setAttribute("aria-label", "Enlarge the camera");
    slot.appendChild(grow);
    var setBig = function (on) {
      if (document.body.classList.contains("cam-big") === on) return;
      document.body.classList.toggle("cam-big", on);
      grow.setAttribute("aria-expanded", on ? "true" : "false");
      grow.setAttribute("aria-label", on ? "Shrink the camera" : "Enlarge the camera");
      if (on) from = panel.scrollTop;
    };
    grow.addEventListener("click", function () { setBig(!document.body.classList.contains("cam-big")); });
    panel.addEventListener("scroll", function () { if (Math.abs(panel.scrollTop - from) > 60) setBig(false); }, { passive: true });
  }
})();

/* Phones: show the current sheet tab and fade the tab row until its end. */
if (!window.RD_SHELL) (function () {
  var sl = document.querySelector(".sheets");
  if (sl) {
    var mark = function () { sl.classList.toggle("at-end", sl.scrollLeft + sl.clientWidth >= sl.scrollWidth - 4); };
    var place = function () {
      var cur = sl.querySelector('a[aria-current="true"], a[aria-current="page"]');
      if (cur && sl.scrollWidth > sl.clientWidth) sl.scrollLeft = Math.max(0, cur.getBoundingClientRect().left - sl.getBoundingClientRect().left + sl.scrollLeft - 8);
      mark();
    };
    // Place it now, and again once fonts and images have settled the widths.
    place(); window.addEventListener("load", place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    sl.addEventListener("scroll", mark, { passive: true });
  }
})();

/* Live Detail A camera, shared with the home page */
if (!window.RD_SHELL) (function () {
  var me = document.currentScript && document.currentScript.src; if (!me) return;
  var s = document.createElement("script"); s.src = me.replace(/[^/]+\.js(\?.*)?$/, "detail-live.js"); document.body.appendChild(s);
})();
