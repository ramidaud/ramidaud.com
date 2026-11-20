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
})();
