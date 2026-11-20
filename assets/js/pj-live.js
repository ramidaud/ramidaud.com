/* Projects sheet: keep the Midlife Survivors card current.
   Reads the same public sources as the showpiece, only once the card is on screen.
   If a source can't be reached, the numbers typed into the page stay and the note says so. */
(function () {
  "use strict";
  var box = document.getElementById("pjLive"), note = document.getElementById("pjLiveNote");
  if (!box || !window.fetch) return;
  var RAW = "https://raw.githubusercontent.com/ramidaud/midlife-survivors/main/";
  var done = false;
  function txt(path) { return fetch(RAW + path + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }); }
  function js(path, pick) { return txt(path).then(function (s) { var w = {}; new Function("window", s)(w); return pick(w); }); }
  function set(k, v) { var el = box.querySelector('[data-k="' + k + '"]'); if (el && v != null) el.textContent = v; }
  function fmt(x) { return Number(x).toLocaleString("en-US"); }
  function load() {
    if (done) return; done = true;
    var live = 0;
    Promise.all([
      js("src/data/version.js", function (w) { return w.GAME_VERSION; }).then(function (G) { if (G && G.build) { set("build", fmt(G.build)); live++; } }).catch(function () {}),
      txt("reports/discord-stats.md").then(function (md) {
        var m = /All-time:\s*([\d,]+)\s*runs from\s*([\d,]+)\s*players/i.exec(md);
        if (m) { set("runs", m[1]); set("players", m[2]); live++; }
      }).catch(function () {}),
      js("devlog/posts.js", function (w) { return w.DEVLOG_POSTS; }).then(function (P) {
        var pub = (P || []).filter(function (p) { return !p.draft; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
        var a = document.querySelector('#pj-game [data-k="memo"]');
        if (pub && a) {
          var no = parseInt(pub.slug, 10);
          a.firstChild.textContent = (no ? "Memo " + no + ": " : "") + pub.title;
          a.href = "https://midlifesurvivors.com/devlog/?post=" + encodeURIComponent(pub.slug);
          live++;
        }
      }).catch(function () {})
    ]).then(function () {
      if (note) note.textContent = live ? "Live from the game" : "Numbers as of Nov 20";
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); load(); } });
    io.observe(box);
  } else load();
})();
