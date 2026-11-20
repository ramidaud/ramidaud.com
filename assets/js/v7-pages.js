/* Inner pages inside the Version 7 sheet: theme toggle (same "rd-theme" key and button as the home page),
   copy buttons on prompt blocks, the contents list that follows the reader, and the footer year. */
(function () {
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

  document.querySelectorAll(".copy-block").forEach(function (block) {
    var pre = block.querySelector("pre");
    if (!pre || !navigator.clipboard) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "copy-btn"; b.textContent = "Copy";
    b.addEventListener("click", function () {
      navigator.clipboard.writeText(pre.textContent.trim()).then(function () { b.textContent = "Copied"; }, function () { b.textContent = "Select and copy"; });
      setTimeout(function () { b.textContent = "Copy"; }, 1600);
    });
    block.appendChild(b);
  });

  var toc = document.querySelectorAll('.toc a[href^="#"]');
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
  }

  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

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
