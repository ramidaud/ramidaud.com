/* Framing the Cosmos story pages: theme toggle, using the same "rd-theme" key and button as Version 7. */
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var btn = document.querySelector(".tbtn");
  if (!btn) return;
  function isDark() { return root.getAttribute("data-theme") === "dark"; }
  function label() {
    btn.textContent = isDark() ? "Light" : "Dark";
    btn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
  }
  label();
  btn.addEventListener("click", function () {
    if (isDark()) root.removeAttribute("data-theme"); else root.setAttribute("data-theme", "dark");
    try { localStorage.setItem("rd-theme", isDark() ? "dark" : "light"); } catch (e) {}
    label();
  });

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
