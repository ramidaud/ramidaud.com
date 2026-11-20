/* Framing the Cosmos: shared behavior. Theme toggle, using the same "rd-theme" key as the rest of the site. */
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  function isDark() { return root.getAttribute("data-theme") === "dark"; }
  var btn = document.querySelector(".theme-btn");
  if (!btn) return;
  function label() {
    btn.setAttribute("aria-pressed", isDark() ? "true" : "false");
  }
  label();
  btn.addEventListener("click", function () {
    if (isDark()) root.removeAttribute("data-theme"); else root.setAttribute("data-theme", "dark");
    try { localStorage.setItem("rd-theme", isDark() ? "dark" : "light"); } catch (e) {}
    label();
  });
})();
