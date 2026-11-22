/* Midlife Survivors showpiece: real data, drawn live.
   Starts from the snapshot baked into the page (so it never shows an empty chart),
   then pulls the live sources and redraws:
     1. The game's own data files from the public repo (version + changelog, devlog posts, name filter)
     2. The daily play-stats report the game's Discord bot writes to the repo
     3. The public leaderboards in Supabase, read with the same publishable key the game ships
     4. The repo's latest commit time, from the GitHub API
   No raw run data is read. Leaderboard names are the ones players typed to appear on the public board. */
(function () {
  "use strict";
  var snapEl = document.getElementById("ms-snap");
  if (!snapEl) return;
  var S = JSON.parse(snapEl.textContent);
  var RAW = "https://raw.githubusercontent.com/ramidaud/midlife-survivors/main/";
  var SITE = "https://midlifesurvivors.com/";
  var SB = { url: "https://pgxmvhabcgxvdnjtiect.supabase.co", key: "sb_publishable_zkBwMyrwywrriq0lJWTXTg_pIos5d5s" };
  var FIRST_BUILD = new Date("2026-10-30T12:00:00-04:00");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var HEROES = {
    officeWorker: { cls: "office", name: "The 9-to-5er" },
    photographer: { cls: "soccer", name: "The Soccer Dad" },
    gradStudent: { cls: "grad", name: "The Grad Student at 45" },
    coldWarCowboy: { cls: "cowboy", name: "The Cold War Cowboy" }
  };
  var FOES = { "bill": "bill", "spam likely": "spam", "spam call": "spam", "calendar invite": "invite", "group chat": "chat", "reply-all": "replyall", "reply-all chain": "replyall", "reply all": "replyall",
    "snack attack": "donut", "late-night donut": "donut", "leaf pile": "leafpile", "gutter clog": "gutter", "the neighbor's lawn mower": "mower", "lawn mower": "mower",
    "property tax notice": "tax", "tax notice": "tax", "math homework": "homework", "back twinge": "back", "3 am thought": "3am", "bargain hunter": "haggler" };
  var PX = (document.querySelector('link[href$="ms.css"]') || { href: "" }).href.replace(/css\/ms\.css.*$/, "ms/px/");
  var BOSSES = [
    { age: 45, code: "HR", name: "The Performance Review" },
    { age: 48, code: "MGR", name: "Your New Boss (Age 26)" },
    { age: 52, code: "APR", name: "The 30-Year Mortgage" },
    { age: 56, code: "PARTY", name: "The Holiday Party or The Reorg (one per run)" },
    { age: 60, code: "Q3", name: "The Quarterly All-Hands" },
    { age: 63.5, code: "TIME", name: "The Gold Watch" },
    { age: 65, code: "RETIRE", name: "Your Retirement Party" }
  ];
  var ROOMS = [
    { age: 40, name: "Lobby, Bullpen" },
    { age: 45, name: "Parking Lot, Break Room" },
    { age: 50, name: "Server Room, Conference" },
    { age: 55, name: "Executive Wing" },
    { age: 60, name: "Wellness" }
  ];

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n(x) { return Math.round(x).toLocaleString("en-US"); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function md(d) { return MON[d.getMonth()] + " " + d.getDate(); }
  function parseDay(s) { // "Nov 16, 2026" or "2026-11-16"
    if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(s); return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function key(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function ago(t) {
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) { var h = Math.round(s / 3600); return h + (h === 1 ? " hour ago" : " hours ago"); }
    var dd = Math.round(s / 86400); return dd + (dd === 1 ? " day ago" : " days ago");
  }
  function svgEl(w, h, label) { return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(label) + '">'; }

  /* ---------- state ---------- */
  var st = {
    game: S.game, changelog: S.changelog, changelogCount: S.changelogCount, perDay: S.releasesPerDay,
    memos: S.memos, lb: S.leaderboard, report: parseReport(S.report), lastPush: null,
    src: { repo: "snapshot", report: "snapshot", board: "snapshot", commits: "snapshot" },
    t: { repo: Date.parse(S.takenAt), report: Date.parse(S.takenAt), board: Date.parse(S.leaderboard.asOf) },
    tab: "midlife", nameOk: null
  };

  function parseReport(md) {
    var r = { raw: md };
    var m;
    if ((m = /^#\s*(.+)$/m.exec(md))) r.title = m[1].trim();
    if ((m = /^\*\*(.+?)\*\*\s*(.*)$/m.exec(md))) r.headline = (m[1] + " " + m[2]).trim();
    if ((m = /All-time:\s*([\d,]+)\s*runs from\s*([\d,]+)\s*players,\s*([\d,]+)\s*retirements/i.exec(md))) { r.runs = +m[1].replace(/,/g, ""); r.players = +m[2].replace(/,/g, ""); r.retired = +m[3].replace(/,/g, ""); }
    if ((m = /all-time best\s*([\d,]+),\s*highest age\s*([\d.]+)/i.exec(md))) { r.best = +m[1].replace(/,/g, ""); r.bestAge = +m[2]; }
    if ((m = /^-\s*([\d,]+)\s*runs? from\s*([\d,]+)\s*players?/mi.exec(md))) { r.dayRuns = +m[1].replace(/,/g, ""); r.dayPlayers = +m[2].replace(/,/g, ""); }
    if ((m = /Median run\s*([\d.]+)\s*min/i.exec(md))) r.median = +m[1];
    if ((m = /median age\s*([\d.]+)/i.exec(md))) r.medianAge = +m[1];
    function block(name) {
      var i = md.indexOf("**" + name + "**"); if (i < 0) return [];
      var rest = md.slice(i).split("\n").slice(1), out = [];
      for (var k = 0; k < rest.length; k++) { var l = rest[k].trim(); if (!l) { if (out.length) break; continue; } if (l.indexOf("- ") !== 0) break; out.push(l.slice(2)); }
      return out;
    }
    r.killers = block("Top killers").map(function (l) {
      var mm = /^(.+?):\s*(\d+)\s*deaths?(?:,\s*average age\s*([\d.]+)|\s*at\s*([\d.]+))?/i.exec(l);
      return mm ? { name: mm[1].trim(), n: +mm[2], age: mm[3] || mm[4] || "" } : null;
    }).filter(Boolean).slice(0, 4);
    r.lag = block("Lag").map(function (l) {
      var mm = /^(.+?):\s*(\d+)\s*fps average,\s*(\d+)%/i.exec(l);
      return mm ? { dev: mm[1].trim(), fps: +mm[2], slow: +mm[3] } : null;
    }).filter(Boolean);
    return r;
  }

  /* ---------- tiles ---------- */
  function setTile(id, val, live, when) {
    var t = document.getElementById(id); if (!t) return;
    var v = $(".v", t), old = v.getAttribute("data-val");
    t.classList.toggle("long", String(val).replace(/<[^>]*>/g, "").length > 7);
    v.innerHTML = val; v.setAttribute("data-val", val);
    t.classList.toggle("is-live", !!live);
    var s = $(".s span", t); if (s && when) s.textContent = when;
    if (old && old !== val && !reduce) { t.classList.remove("flash"); void t.offsetWidth; t.classList.add("flash"); }
  }
  function countUp(el, to, fmt) {
    if (reduce || !("IntersectionObserver" in window)) { el.textContent = fmt(to); return; }
    var start = null, dur = 1100;
    function step(ts) { if (!start) start = ts; var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function tiles() {
    var g = st.game, r = st.report, days = Math.floor((Date.now() - FIRST_BUILD) / 864e5) + 1;
    var srcRepo = st.src.repo === "live" ? "Live from the game repo" : "Snapshot, " + md(new Date(st.t.repo));
    var srcRep = st.src.report === "live" ? "Live · play report, " + (r.title || "").replace(/^Play stats:\s*/i, "").replace(/\s*\(.*\)\s*$/, "") : "Snapshot report, " + md(new Date(st.t.report));
    setTile("t-builds", n(g.build), st.src.repo === "live", srcRepo);
    setTile("t-version", esc(g.display.replace(/^V\.\s*/, "V")) , st.src.repo === "live", srcRepo);
    $("#t-version .d").textContent = '"' + g.codename + '", updated ' + g.lastUpdated.replace(/, \d{4}$/, "");
    setTile("t-days", String(days), true, "Counted from Oct 30, 2026");
    setTile("t-memos", String(st.memos.length), st.src.repo === "live", st.src.repo === "live" ? "Live from the devlog" : srcRepo);
    if (r.runs) setTile("t-runs", n(r.runs), st.src.report === "live", srcRep);
    if (r.players) setTile("t-players", n(r.players), st.src.report === "live", srcRep);
    if (r.retired != null) setTile("t-retired", n(r.retired), st.src.report === "live", srcRep);
    if (r.best) { setTile("t-best", n(r.best), st.src.report === "live", srcRep); $("#t-best .d").textContent = "Highest age ever reached: " + r.bestAge; }
    var lp = $("#lastpush");
    if (lp) lp.textContent = st.lastPush ? "Last push to the game " + ago(st.lastPush) : "Last update " + g.lastUpdated;
    var chip = $("#hero-chip");
    if (chip) { chip.querySelector(".v").textContent = g.display + " · build " + n(g.build); chip.classList.toggle("is-live", st.src.repo === "live"); }
    var line = $("#live-line");
    if (line) {
      var anyLive = st.src.repo === "live" || st.src.board === "live" || st.src.report === "live";
      line.classList.toggle("is-live", anyLive);
      $("#live-status").textContent = anyLive ? "Live data · checked " + ago(st.checked || Date.now()) : "Showing the Nov 20 snapshot · live sources unreachable";
    }
    $$("[data-src]").forEach(function (el) { var k = el.getAttribute("data-src"); el.textContent = st.src[k] === "live" ? "live" : "Nov 20 snapshot"; });
  }

  /* ---------- tooltip ---------- */
  function tipFor(box) {
    var tip = $(".tip", box);
    if (!tip) { tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "status"); box.appendChild(tip); }
    return {
      show: function (html, x, y) { tip.innerHTML = html; tip.style.left = x + "px"; tip.style.top = y + "px"; tip.classList.add("on"); },
      hide: function () { tip.classList.remove("on"); }
    };
  }
  function bindHits(box, svg) {
    var tip = tipFor(box);
    $$("[data-tip]", svg).forEach(function (h) {
      function on() {
        var b = box.getBoundingClientRect(), r = h.getBoundingClientRect();
        var x = Math.min(Math.max(r.left + r.width / 2 - b.left, 110), b.width - 110);
        tip.show(h.getAttribute("data-tip"), x, r.top - b.top + (+h.getAttribute("data-dy") || 0));
        if (h.parentNode.classList) h.parentNode.classList.add("on");
      }
      function off() { tip.hide(); if (h.parentNode.classList) h.parentNode.classList.remove("on"); }
      h.addEventListener("mouseenter", on); h.addEventListener("mouseleave", off);
      h.addEventListener("focus", on); h.addEventListener("blur", off);
    });
  }
  function grid(max, x0, x1, T, ph) {
    var s = niceStep(max / 4), o = "";
    for (var v = 0; v <= max + 1e-9; v += s) { var y = T + ph - ph * v / max; o += '<line class="gl" x1="' + x0 + '" x2="' + x1 + '" y1="' + y + '" y2="' + y + '"/><text x="' + (x0 - 6) + '" y="' + (y + 3.5) + '" text-anchor="end">' + v + "</text>"; }
    return o;
  }
  function width(el) { return Math.max(280, Math.floor(el.getBoundingClientRect().width)); }
  function niceStep(v) { var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function niceMax(v) { var s = niceStep(Math.max(1, v) / 4); return Math.ceil(v / s) * s; }

  /* ---------- chart 1: releases per day ---------- */
  function cadence() {
    var box = $("#ch-cadence .plot"); if (!box) return;
    var keys = Object.keys(st.perDay).sort(); if (!keys.length) return;
    var a = parseDay(keys[0]), b = parseDay(keys[keys.length - 1]), days = [];
    for (var d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    var vals = days.map(function (d) { return st.perDay[key(d)] || 0; });
    var memoDays = {}; st.memos.forEach(function (m) { var k = (m.date || "").slice(0, 10); (memoDays[k] = memoDays[k] || []).push(m); });
    var W = width(box), H = 260, L = 34, R = 8, T = 26, B = 40, pw = W - L - R, ph = H - T - B;
    var max = niceMax(Math.max.apply(null, vals)), bw = pw / days.length, gap = Math.max(2, Math.min(6, bw * .22));
    var o = svgEl(W, H, "Bar chart of releases logged in the changelog per day, " + md(a) + " to " + md(b) + ". Peak " + Math.max.apply(null, vals) + " on one day.");
    o += grid(max, L, W - R, T, ph);
    var peak = vals.indexOf(Math.max.apply(null, vals)), every = Math.ceil(days.length / Math.max(4, Math.floor(pw / 58)));
    days.forEach(function (d, i) {
      var v = vals[i], h = v ? Math.max(2, ph * v / max) : 0, x = L + i * bw + gap / 2, w = bw - gap, y = T + ph - h, r = Math.min(4, w / 2, h);
      var mm = memoDays[key(d)] || [];
      var tipTxt = "<b>" + md(d) + "</b>" + v + (v === 1 ? " release" : " releases") + " logged" + (mm.length ? "<br>Memo: " + esc(mm.map(function (m) { return m.title; }).join(" / ")) : "");
      o += '<g><rect class="hit" x="' + (L + i * bw) + '" y="' + T + '" width="' + bw + '" height="' + (ph + 22) + '" data-tip="' + esc(tipTxt) + '" data-dy="' + (y - T) + '"/>';
      if (h) o += '<path class="bar" d="M' + x + "," + (T + ph) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (T + ph) + 'Z"/>';
      o += "</g>";
      if (mm.length) o += '<rect class="memo" x="' + (x + w / 2 - 4) + '" y="' + (T + ph + 6) + '" width="8" height="8" transform="rotate(45 ' + (x + w / 2) + " " + (T + ph + 10) + ')"/>';
      if ((days.length - 1 - i) % every === 0) o += '<text x="' + (x + w / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + md(d) + "</text>";
    });
    o += '<line class="base" x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '"/>';
    var px = L + peak * bw + bw / 2, py = T + ph - ph * vals[peak] / max;
    o += '<text class="callout" x="' + Math.min(px + 8, W - 150) + '" y="' + (py - 8) + '">' + md(days[peak]) + ": " + vals[peak] + " in one day</text></svg>";
    box.innerHTML = o; bindHits(box, $("svg", box));
    var total = vals.reduce(function (s, v) { return s + v; }, 0);
    $("#cad-sum").textContent = n(total) + " releases logged across " + days.length + " days, an average of " + (total / days.length).toFixed(1) + " a day.";
    $("#cad-table").innerHTML = "<tr><th>Day</th><th>Releases</th><th>Memo published</th></tr>" + days.map(function (d, i) { var mm = memoDays[key(d)] || []; return "<tr><td>" + md(d) + '</td><td class="n">' + vals[i] + "</td><td>" + esc(mm.map(function (m) { return m.title; }).join(" / ")) + "</td></tr>"; }).join("");
  }

  /* ---------- chart 2: where runs end ---------- */
  function runs() {
    var box = $("#ch-runs .plot"); if (!box) return;
    var hist = st.lb.ageHist, bins = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85];
    var vals = bins.map(function (b) { return hist[b] || 0; }), total = vals.reduce(function (s, v) { return s + v; }, 0);
    var W = width(box), rows = W < 560 ? 3 : 2, H = 270 + rows * 15, L = 34, R = 10, T = 28 + rows * 15, B = 30, pw = W - L - R, ph = H - T - B;
    var A0 = 40, A1 = 90, sx = function (a) { return L + (a - A0) / (A1 - A0) * pw; };
    var max = niceMax(Math.max.apply(null, vals));
    var o = svgEl(W, H, "Histogram of the age reached on " + total + " Midlife leaderboard entries, in five-year bins, with the ages where each boss arrives.");
    o += '<rect class="zone" x="' + sx(65) + '" y="' + T + '" width="' + (sx(80) - sx(65)) + '" height="' + ph + '"/>';
    o += '<text x="' + (sx(65) + 6) + '" y="' + (T + 13) + '">Overtime</text>';
    o += grid(max, L, W - R, T, ph);
    bins.forEach(function (b0, i) {
      var v = vals[i], x = sx(b0) + 1, w = sx(b0 + 5) - sx(b0) - 2, h = v ? Math.max(2, ph * v / max) : 0, y = T + ph - h, r = Math.min(4, w / 2, h);
      var lab = b0 === 85 ? "85 and up" : b0 + " to " + (b0 + 4.9);
      o += '<g><rect class="hit" x="' + sx(b0) + '" y="' + T + '" width="' + (sx(b0 + 5) - sx(b0)) + '" height="' + ph + '" data-dy="' + (y - T) + '" data-tip="' + esc("<b>Age " + lab + "</b>" + v + " entries, " + Math.round(v / total * 100) + "% of the board") + '"/>';
      if (h) o += '<path class="bar' + (b0 >= 65 ? " dim" : "") + '" d="M' + x + "," + (T + ph) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (T + ph) + 'Z"/>';
      o += "</g>";
    });
    BOSSES.forEach(function (bo, i) {
      var x = sx(bo.age), row = i % rows, ty = 14 + row * 15;
      o += '<line class="bossline" x1="' + x + '" x2="' + x + '" y1="' + (ty + 4) + '" y2="' + (T + ph) + '"/>';
      o += '<text class="bosscode" x="' + x + '" y="' + ty + '" text-anchor="middle" data-tip="' + esc("<b>Age " + bo.age + "</b>" + bo.name) + '" data-dy="0">' + bo.code + "</text>";
    });
    for (var a = 40; a <= 90; a += 5) o += '<text x="' + sx(a) + '" y="' + (H - 8) + '" text-anchor="middle">' + a + "</text>";
    o += '<line class="base" x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '"/></svg>';
    box.innerHTML = o; bindHits(box, $("svg", box));
    var past65 = vals.slice(5).reduce(function (s, v) { return s + v; }, 0);
    $("#runs-sum").textContent = total + " entries on the Midlife board. " + Math.round(past65 / total * 100) + "% made it past 65 into Overtime, and " + ((hist[80] || 0) + (hist[85] || 0)) + " got to 80 or beyond.";
    $("#runs-table").innerHTML = "<tr><th>Age reached</th><th>Entries</th><th>Share</th></tr>" + bins.map(function (b0, i) { return "<tr><td>" + (b0 === 85 ? "85 and up" : b0 + " to " + (b0 + 4.9)) + '</td><td class="n">' + vals[i] + '</td><td class="n">' + Math.round(vals[i] / total * 100) + "%</td></tr>"; }).join("");
  }

  /* ---------- the road: rooms above, bosses below, one age axis ---------- */
  function road() {
    var box = $("#ruler"); if (!box) return;
    var W = width(box), H = 170, L = 16, R = 16, pw = W - L - R, A0 = 40, A1 = 80;
    var sx = function (a) { return L + (a - A0) / (A1 - A0) * pw; }, mid = 86;
    var o = svgEl(W, H, "A timeline from age 40 to 80. Rooms open at 40, 45, 50, 55 and 60. Bosses arrive at 45, 48, 52, 56, 60, 63.5 and 65. Overtime runs from 65 to 80.");
    o += '<rect x="' + sx(65) + '" y="' + (mid - 6) + '" width="' + (sx(80) - sx(65)) + '" height="12" fill="color-mix(in srgb, var(--gold) 30%, transparent)"/>';
    o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + mid + '" y2="' + mid + '" stroke="var(--ink)" stroke-width="2"/>';
    for (var a = A0; a <= A1; a += 5) o += '<line x1="' + sx(a) + '" x2="' + sx(a) + '" y1="' + (mid - 5) + '" y2="' + (mid + 5) + '" stroke="var(--ink)"/>';
    var labels = "";
    ROOMS.forEach(function (rm, i) {
      var x = sx(rm.age), y = 18 + (i % 2) * 16;
      o += '<line x1="' + x + '" x2="' + x + '" y1="' + (y + 4) + '" y2="' + (mid - 6) + '" stroke="var(--line)" stroke-width="1"/>';
      labels += '<text class="halo" x="' + (x + 4) + '" y="' + y + '" style="fill:var(--line)">' + (W < 640 ? rm.age : rm.name) + "</text>";
    });
    BOSSES.forEach(function (bo, i) {
      var x = sx(bo.age), y = mid + 36 + (i % 3) * 15;
      o += '<circle cx="' + x + '" cy="' + mid + '" r="5" fill="var(--red)" stroke="var(--card)" stroke-width="2"/>';
      o += '<line x1="' + x + '" x2="' + x + '" y1="' + (mid + 6) + '" y2="' + (y - 10) + '" stroke="var(--red)" stroke-width="1"/>';
      o += '<text x="' + x + '" y="' + y + '" text-anchor="middle" style="fill:var(--ink)">' + bo.code + "</text>";
    });
    o += labels + '<text x="' + sx(72.5) + '" y="' + (mid - 12) + '" text-anchor="middle">Overtime</text>';
    o += '<text x="' + L + '" y="' + (H - 2) + '">40</text><text x="' + sx(65) + '" y="' + (H - 2) + '" text-anchor="middle">65</text><text x="' + (W - R) + '" y="' + (H - 2) + '" text-anchor="end">80</text></svg>';
    box.innerHTML = o;
  }

  /* ---------- cast pick share ---------- */
  function picks() {
    var c = st.lb.characters, tot = 0, k;
    for (k in c) tot += c[k];
    $$(".cast article").forEach(function (art) {
      var id = art.getAttribute("data-char"), v = c[id] || 0, pct = tot ? v / tot * 100 : 0;
      $(".pick .row b", art).textContent = Math.round(pct) + "%";
      $(".pick .row span", art).textContent = v + " of " + tot + " board entries";
      $(".pick .fill", art).style.width = pct.toFixed(1) + "%";
    });
    $("#pick-table").innerHTML = "<tr><th>Hero</th><th>Entries</th><th>Share</th></tr>" + Object.keys(HEROES).map(function (id) { var v = c[id] || 0; return "<tr><td>" + HEROES[id].name + '</td><td class="n">' + v + '</td><td class="n">' + Math.round(v / tot * 100) + "%</td></tr>"; }).join("");
  }

  /* ---------- leaderboard ---------- */
  var seen = {};
  function board() {
    var list = $("#board-list"); if (!list) return;
    var rows = (st.lb.top[st.tab] || []).slice(0, 10);
    var firstPaint = !seen[st.tab];
    list.innerHTML = rows.map(function (r, i) {
      var h = HEROES[r.character] || HEROES.officeWorker, id = st.tab + ":" + r.name.toLowerCase() + ":" + r.score;
      var isNew = !firstPaint && !seen[st.tab][id];
      return '<li' + (isNew ? ' class="new"' : "") + '><span class="r">' + (i + 1) + '</span><span class="spr ' + h.cls + '" role="img" aria-label="' + esc(h.name) + '"></span><span class="nm">' + esc(r.name) + '</span><span class="ag">age ' + (+r.age).toFixed(1) + '</span><span class="sc">' + n(r.score) + "</span></li>";
    }).join("") || '<li><span></span><span></span><span class="nm">No scores yet.</span></li>';
    seen[st.tab] = {}; rows.forEach(function (r) { seen[st.tab][st.tab + ":" + r.name.toLowerCase() + ":" + r.score] = 1; });
    $("#board-when").textContent = (st.src.board === "live" ? "Live · refreshed " : "Snapshot · ") + ago(st.t.board);
    $("#board-count").textContent = n(st.lb.counts[st.tab] || 0) + " entries · " + (st.tab === "midlife" ? "ages 40 to 65" : "ages 40 to 100");
  }
  $$(".board .tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      st.tab = b.getAttribute("data-tab");
      $$(".board .tabs button").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); x.tabIndex = x === b ? 0 : -1; });
      board();
    });
    b.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var all = $$(".board .tabs button"), i = all.indexOf(b), nx = all[(i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
      nx.focus(); nx.click();
    });
  });

  /* ---------- playtest floor ---------- */
  function floor() {
    var r = st.report, el = $("#floor"); if (!el) return;
    $("#floor-title").textContent = r.title || "Play stats";
    $("#floor-head").textContent = r.headline || "";
    $("#f-runs").textContent = r.dayRuns != null ? r.dayRuns : "-";
    $("#f-players").textContent = r.dayPlayers != null ? r.dayPlayers : "-";
    $("#f-median").textContent = r.median != null ? r.median + "m" : "-";
    $("#f-killers").innerHTML = (r.killers || []).map(function (k) {
      var f = FOES[k.name.toLowerCase()];
      return "<li>" + (f ? '<span class="foe" style="background-image:url(' + PX + "enemy-" + f + '.png)" role="img" aria-label="' + esc(k.name) + '"></span>' : '<span class="ph" aria-hidden="true">?</span>') + "<span>" + esc(k.name) + (k.age ? ' <small style="color:#b8ae96">age ' + esc(k.age) + "</small>" : "") + "</span><b>" + k.n + "</b></li>";
    }).join("") || "<li><span></span><span>No deaths logged.</span></li>";
    $("#f-fps").innerHTML = (r.lag || []).map(function (l) {
      return "<li><span>" + esc(l.dev) + "</span><b>" + l.fps + ' fps</b><span class="t" aria-hidden="true"><i style="width:' + Math.min(100, l.fps / 120 * 100) + '%"></i></span></li>';
    }).join("") || "<li><span>No frame-rate data.</span></li>";
    $("#floor-src").textContent = st.src.report === "live" ? "Live from the bot's report in the game repo, read " + ago(st.t.report) + "." : "From the Nov 20 report. The live copy could not be reached.";
  }

  /* ---------- changelog ---------- */
  function changelog() {
    var el = $("#log"); if (!el) return;
    el.innerHTML = st.changelog.slice(0, 6).map(function (c) {
      return '<li><div><span class="ver">' + esc(c.ver) + '</span><span class="dt">' + esc(c.date) + (c.title ? " · " + esc(c.title) : "") + '</span></div><div><p class="ttl">' + esc(c.teaser || c.title) + "</p>" + "<ul>" + (c.highlights || []).slice(0, 3).map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul></div></li>";
    }).join("");
    $("#log-count").textContent = n(st.changelogCount) + " entries since Oct 30. Newest first.";
  }

  /* ---------- memos ---------- */
  function memos() {
    var el = $("#memos"); if (!el) return;
    var list = st.memos.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 6);
    el.innerHTML = list.map(function (m) {
      var d = parseDay(m.date);
      return '<a class="memo" href="' + SITE + "devlog/?post=" + encodeURIComponent(m.slug) + '" target="_blank" rel="noopener"><span class="cv"><img src="' + SITE + "devlog/" + esc(m.cover) + '" data-alt="' + RAW + "devlog/" + esc(m.cover) + '" alt="" loading="lazy" width="640" height="360" onerror="if(this.dataset.alt){this.src=this.dataset.alt;this.removeAttribute(\'data-alt\')}else{this.style.visibility=\'hidden\'}"></span><span class="bd"><span class="mt">' + (d ? md(d) : "") + " · " + esc(m.version || "") + '</span><span class="tt">' + esc(m.title) + '</span><span class="ts">' + esc(m.teaser || "") + '</span><span class="sr"> (opens in a new window)</span></span></a>';
    }).join("");
    $("#memo-count").textContent = st.memos.length + " published memos. The six newest are here.";
  }

  function renderAll() { tiles(); cadence(); runs(); road(); picks(); board(); floor(); changelog(); memos(); }

  /* ---------- live sources ---------- */
  function repoJS(path, pick) {
    return fetch(RAW + path + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) { var w = {}; new Function("window", txt)(w); return pick(w); });
  }
  function loadRepo() {
    return Promise.all([
      repoJS("src/data/version.js", function (w) { return w.GAME_VERSION; }),
      repoJS("devlog/posts.js", function (w) { return w.DEVLOG_POSTS; })
    ]).then(function (res) {
      var G = res[0], P = res[1];
      if (!G || !G.changelog) throw new Error("no version");
      st.game = { version: G.version, display: G.displayVersion, lastUpdated: G.lastUpdated, codename: G.codename, build: G.build };
      var pd = {}; G.changelog.forEach(function (c) { var d = parseDay(c.date); if (d) { var k = key(d); pd[k] = (pd[k] || 0) + 1; } });
      st.perDay = pd; st.changelog = G.changelog.slice(0, 8); st.changelogCount = G.changelog.length;
      if (P && P.length) st.memos = P.filter(function (p) { return !p.draft; }).map(function (p) { return { slug: p.slug, date: p.date, title: p.title, version: p.version, cover: p.cover, teaser: p.teaser }; });
      st.src.repo = "live"; st.t.repo = Date.now();
    }).catch(function () { st.src.repo = "error"; });
  }
  function loadReport() {
    return fetch(RAW + "reports/discord-stats.md?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (md) { var p = parseReport(md); if (!p.runs) throw new Error("unparsed"); st.report = p; st.src.report = "live"; st.t.report = Date.now(); })
      .catch(function () { st.src.report = "error"; });
  }
  function loadFilter() {
    return repoJS("src/data/name-filter.js", function (w) { return w.nameOk; }).then(function (f) { if (typeof f === "function") st.nameOk = f; }).catch(function () {});
  }
  function loadBoard() {
    var h = { apikey: SB.key }, q = "?select=name,score,age,character,created_at&order=score.desc&limit=1000";
    return Promise.all(["scores_midlife", "scores"].map(function (t) {
      return fetch(SB.url + "/rest/v1/" + t + q, { headers: h, cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    })).then(function (res) {
      var mid = res[0], full = res[1], ok = st.nameOk || function () { return true; };
      function top(rows) {
        var best = {};
        rows.forEach(function (r) { var nm = String(r.name || "").trim(); if (!nm || !ok(nm)) return; var k = nm.toLowerCase(); if (!best[k] || r.score > best[k].score) best[k] = { name: nm, score: r.score, age: +r.age, character: r.character }; });
        return Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 10);
      }
      var hist = {}; mid.forEach(function (r) { var a = +r.age; if (!(a >= 40)) return; var b = Math.min(85, Math.floor(a / 5) * 5); hist[b] = (hist[b] || 0) + 1; });
      var chars = {}; mid.concat(full).forEach(function (r) { if (r.character) chars[r.character] = (chars[r.character] || 0) + 1; });
      st.lb = { asOf: new Date().toISOString(), counts: { midlife: mid.length, full: full.length }, top: { midlife: top(mid), full: top(full) }, ageHist: hist, characters: chars };
      st.src.board = "live"; st.t.board = Date.now();
    }).catch(function () { if (st.src.board !== "live") st.src.board = "error"; });
  }
  function loadCommits() {
    return fetch("https://api.github.com/repos/ramidaud/midlife-survivors/commits?per_page=1", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { var d = j && j[0] && j[0].commit && (j[0].commit.committer || j[0].commit.author).date; if (d) { st.lastPush = Date.parse(d); st.src.commits = "live"; } })
      .catch(function () { st.src.commits = "error"; });
  }

  var busy = false;
  function refreshAll() {
    if (busy) return; busy = true;
    var btn = $("#refresh"); if (btn) btn.textContent = "Checking";
    loadFilter().then(function () { return Promise.all([loadRepo(), loadReport(), loadBoard(), loadCommits()]); }).then(function () {
      st.checked = Date.now(); renderAll(); busy = false; if (btn) btn.textContent = "Refresh";
    });
  }

  /* ---------- go ---------- */
  renderAll();
  // Count the big numbers up once, the first time the dashboard is seen.
  var tilesEl = $(".tiles");
  if (tilesEl && "IntersectionObserver" in window && !reduce) {
    var io0 = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; io0.disconnect();
      $$(".tile .v", tilesEl).forEach(function (v) {
        var raw = v.textContent, num = +raw.replace(/,/g, "");
        if (!isNaN(num) && num > 0) countUp(v, num, function (x) { return n(x); });
      });
    }, { threshold: .35 });
    io0.observe(tilesEl);
  }
  refreshAll();
  var btn = $("#refresh"); if (btn) btn.addEventListener("click", refreshAll);
  // The leaderboard is the part that actually moves: check it every minute while the page is visible.
  // Stop refreshing once the page is gone (the home sheet swaps pages without reloading).
  var msRoot = $(".ms"), timers = [];
  function every(ms, fn) { var id = setInterval(function () { if (!document.contains(msRoot)) { timers.forEach(clearInterval); return; } fn(); }, ms); timers.push(id); }
  every(60000, function () { if (document.visibilityState === "visible") loadBoard().then(function () { st.checked = Date.now(); board(); runs(); picks(); tiles(); }); });
  every(30000, function () { tiles(); board(); });

  // Redraw charts at their real width so the text stays readable.
  var lastW = 0;
  if ("ResizeObserver" in window) new ResizeObserver(function (e) { var w = Math.round(e[0].contentRect.width); if (Math.abs(w - lastW) > 24) { lastW = w; cadence(); runs(); road(); } }).observe($(".ms"));

  // Gentle reveal on scroll.
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    $$(".ms [data-rv]").forEach(function (el) { io.observe(el); });
  } else $$(".ms [data-rv]").forEach(function (el) { el.classList.add("in"); });
})();
