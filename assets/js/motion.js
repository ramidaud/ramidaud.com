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
  /* Safety net: if a sheet is open but nothing in it has revealed after 2.5 s, show everything. */
  setTimeout(function () {
    var open = document.querySelector(".sheet.in");
    if (open && open.querySelector("[data-fx]") && !open.querySelector("[data-fx].seen")) root.classList.remove("fxio");
  }, 2500);
})();

/* Shared helpers */
var RD = window.RD || (window.RD = {});
RD.scroller = function (el) {
  for (var n = el.parentElement; n; n = n.parentElement) {
    var oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1) return n;
  }
  return document.scrollingElement || document.documentElement;
};
RD.view = function (sc) {
  if (sc === document.scrollingElement || sc === document.documentElement) return { top: 0, h: window.innerHeight };
  var r = sc.getBoundingClientRect(); return { top: r.top, h: sc.clientHeight };
};
RD.reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
RD.onScroll = function (fn) {
  var queued = false;
  function tick() { queued = false; fn(); }
  function q() { if (!queued) { queued = true; requestAnimationFrame(tick); } }
  window.addEventListener("scroll", q, { passive: true, capture: true });
  window.addEventListener("resize", q, { passive: true });
  window.addEventListener("hashchange", function () { setTimeout(q, 80); });
  q(); return q;
};

/* Pinned flight plan: scroll through the four steps; the metadata changes with each one. */
(function () {
  var VIEWS = ["empty", "draft", "approved", "approved"];
  var STATES = ["In the catalog · no metadata", "Claude’s draft", "Checked by a person", "Approved · written to Lightroom"];
  Array.prototype.forEach.call(document.querySelectorAll(".flight"), function (sec) {
    var pin = sec.querySelector(".flight-pin"), demo = sec.querySelector(".flight-demo");
    var cap = demo.querySelector(".gate-cap"), state = demo.querySelector(".fs-state");
    var items = sec.querySelectorAll(".flight-steps li"), cur = -1, sized = 0;
    var dec = document.createElement("textarea");
    function size() {
      if (!pin.offsetHeight) return false;
      var sc = RD.scroller(sec), vh = RD.view(sc).h, w = window.innerWidth;
      var per = Math.round(vh * (w < 900 ? 0.42 : 0.5));
      var keep = cur; pin.style.minHeight = ""; cur = -1; set(3);
      var tall = pin.offsetHeight; pin.style.minHeight = tall + "px";
      cur = -1; set(keep < 0 ? 0 : keep);
      sec.style.height = (tall + per * 4) + "px";
      sized = w; return true;
    }
    function set(i) {
      if (i === cur) return; cur = i;
      demo.setAttribute("data-view", VIEWS[i]); demo.setAttribute("data-step", String(i));
      dec.innerHTML = cap.getAttribute("data-" + VIEWS[i]); cap.textContent = dec.value;
      state.textContent = STATES[i];
      Array.prototype.forEach.call(items, function (li, k) {
        li.classList.toggle("now", k === i); li.classList.toggle("done", k < i);
        li.querySelector("button").setAttribute("aria-current", k === i ? "step" : "false");
      });
    }
    function update() {
      if (!pin.offsetHeight) return;
      if (sized !== window.innerWidth) size();
      var travel = sec.offsetHeight - pin.offsetHeight; if (travel <= 0) return;
      var p = (pin.getBoundingClientRect().top - sec.getBoundingClientRect().top) / travel;
      p = Math.max(0, Math.min(1, p));
      pin.style.setProperty("--p", p.toFixed(3));
      set(Math.min(3, Math.floor(p * 4 * 0.999 + 0.0001)));
    }
    Array.prototype.forEach.call(items, function (li, k) {
      li.querySelector("button").addEventListener("click", function () {
        var sc = RD.scroller(sec), v = RD.view(sc), travel = sec.offsetHeight - pin.offsetHeight;
        var top = sc.scrollTop + (sec.getBoundingClientRect().top - v.top) + travel * (k + 0.5) / 4;
        sc.scrollTo({ top: top, behavior: RD.reduce ? "auto" : "smooth" });
      });
    });
    pin.style.setProperty("--p", "0");
    var bar = sec.querySelector(".flight-bar i"); bar.style.transform = "scaleX(var(--p))";
    set(0);
    RD.onScroll(update);
  });
})();

/* Splat orbit: scrolling past the card turns the camera, frame by frame. Frames load only when the card is near. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll(".orbit"), function (fig) {
    var cv = fig.querySelector("canvas"), ctx = cv.getContext("2d");
    var n = +fig.getAttribute("data-frames"), src = fig.getAttribute("data-src");
    var imgs = [], shown = -1, started = false, first = null;
    function url(i) { return src.replace("{n}", (i < 10 ? "0" : "") + i); }
    function draw(i) {
      for (var d = 0; d < n; d++) {
        var a = imgs[i - d], b = imgs[i + d];
        if (a && a.complete && a.naturalWidth) { i = i - d; break; }
        if (b && b.complete && b.naturalWidth) { i = i + d; break; }
      }
      var im = imgs[i]; if (!im || !im.complete || !im.naturalWidth || i === shown) return;
      ctx.drawImage(im, 0, 0, cv.width, cv.height); shown = i;
    }
    function load() {
      if (started) return; started = true;
      var order = [];
      for (var step = 16; step >= 1; step = step / 2) for (var i = 0; i < n; i += step) if (order.indexOf(i) < 0) order.push(i);
      order.forEach(function (i) { var im = new Image(); im.decoding = "async"; im.onload = function () { if (shown < 0 || Math.abs(i - target) < Math.abs(shown - target)) { shown = -1; draw(target); } }; im.src = url(i); imgs[i] = im; });
    }
    var target = RD.reduce ? Math.floor(n / 2) : 0;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) load(); }, { rootMargin: "150% 0px" }).observe(fig);
    } else load();
    if (RD.reduce) return;
    var last = null;
    RD.onScroll(function () {
      if (!fig.offsetHeight) return;
      var v = RD.view(RD.scroller(fig)), r = fig.getBoundingClientRect();
      var p = (v.top + v.h - r.top) / (v.h + r.height); p = Math.max(0, Math.min(1, p));
      target = Math.round(p * (n - 1));
      if (last !== null && last !== target) fig.classList.add("moved");
      last = target; draw(target);
    });
  });
})();
