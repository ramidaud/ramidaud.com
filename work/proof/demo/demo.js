/* Proof web demo. Everything runs in the browser on a saved sample shoot (shoot.js).
   The style checks are real: they run Proof's own rule file (ucm-style.json) on whatever is typed. */
(function () {
  "use strict";
  var S = window.PROOF_SHOOT;
  var IMG = "../../../assets/proof-demo/";
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- state ----------
  var frames = [];               // flat list: {id, b, i, ...}
  S.bursts.forEach(function (bu, b) { bu.frames.forEach(function (f, i) { f.b = b; f.i = i; frames.push(f); }); });
  var st = {
    rating: {},   // id -> -1, 3, 4, 5
    text: {},     // id -> {cap, alt, kw[], v}
    edited: {},   // id -> true when a person changed the draft
    written: {},  // id -> snapshot string of what was written
    openBurst: null, view: "grid", cur: null, filter: "all",
    brief: { event: S.title, place: S.location, forWho: "", kent: true },
    said: {}
  };
  var rules = [];

  // ---------- style checks (Proof's rule file, run as-is) ----------
  fetch("ucm-style.json").then(function (r) { return r.json(); }).then(function (j) {
    rules = j.rules.map(function (r) {
      try { return { r: r, re: new RegExp(r.pattern, "gd" + (r.caseInsensitive ? "i" : "")) }; } catch (e) { return null; }
    }).filter(Boolean);
    if (st.view === "loupe") renderPanel();
  }).catch(function () { rules = []; });

  function check(text) {
    var hits = [];
    rules.forEach(function (x) {
      x.re.lastIndex = 0; var m;
      while ((m = x.re.exec(text))) {
        if (m[0] === "") { x.re.lastIndex++; continue; }
        var g = x.r.group || 0, idx = m.indices[g]; if (!idx) continue;
        var fix = null;
        if (typeof x.r.fix === "string") {
          fix = x.r.fix.replace(/\$(\d)/g, function (_, n) { return m[+n] || ""; });
          if (x.r.fixIfRepeated && /Kent State/.test(text.slice(0, idx[0]))) fix = x.r.fixIfRepeated;
        }
        hits.push({ id: x.r.id, msg: x.r.message, s: idx[0], e: idx[1], found: text.slice(idx[0], idx[1]), fix: fix });
      }
    });
    hits.sort(function (a, b) { return a.s - b.s; });
    return hits.filter(function (h, i) { return i === 0 || h.s >= hits[i - 1].e; });
  }

  // ---------- helpers ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fileName(f) { return S.name + "_RD-" + f.id.slice(3) + ".NEF"; }
  function r(f) { return st.rating[f.id] || 0; }
  function starText(v) { return v === -1 ? "Reject" : v ? "★★★★★".slice(0, v) : ""; }
  var MEANING = { "-1": ["Reject", "Left out of every check."], 0: ["Unrated", "3 = deliverable, 4 = best of the shoot, 5 = best of overall work."], 3: ["Deliverable", "Needs a caption, alt text, credit and keywords before it's ready."], 4: ["Best of the shoot", "Proof warns if more than about 10% of a shoot gets 4 stars."], 5: ["Best of overall work", "Feeds the portfolio collection."] };
  function hasDraft(f) { return !!st.text[f.id]; }
  function isWritten(f) { return !!st.written[f.id] && st.written[f.id] === snap(f); }
  function snap(f) { var t = st.text[f.id]; return t ? JSON.stringify([t.cap, t.alt, t.kw, r(f)]) : ""; }
  function isReady(f) { var t = st.text[f.id]; return r(f) >= 3 && isWritten(f) && t.cap.trim() && t.alt.trim() && !check(t.cap).length && !check(t.alt).length; }
  function deliverables() { return frames.filter(function (f) { return r(f) >= 3; }); }

  // ---------- filters and readiness ----------
  var FILTERS = [
    ["all", "All", function () { return true; }],
    ["unrated", "Unrated", function (f) { return !r(f); }],
    ["picks", "3★ and up", function (f) { return r(f) >= 3; }],
    ["rejected", "Rejected", function (f) { return r(f) === -1; }],
    ["needs", "Needs caption", function (f) { return r(f) >= 3 && !isWritten(f); }],
    ["written", "Written", function (f) { return isWritten(f); }]
  ];
  function renderFilters() {
    $("filters").innerHTML = FILTERS.map(function (x) {
      var n = frames.filter(x[2]).length;
      return '<button type="button" class="chip" data-f="' + x[0] + '" aria-pressed="' + (st.filter === x[0]) + '">' + x[1] + ' <span class="n">' + n + "</span></button>";
    }).join("");
    var d = deliverables(), ok = d.filter(isReady).length;
    $("ready").innerHTML = '<span class="meter"><i style="width:' + (d.length ? (100 * ok / d.length) : 0) + '%"></i></span>' + ok + " of " + d.length + " ready";
  }
  $("filters").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    st.filter = b.dataset.f; st.openBurst = null; showGrid();
  });

  // ---------- grid ----------
  function tileMeta(f) {
    var v = r(f), s = "";
    if (isWritten(f)) s = '<span class="state done"><span class="dot"></span>Written</span>';
    else if (hasDraft(f)) s = '<span class="state draft"><span class="dot"></span>' + (st.edited[f.id] ? "Edited" : "Draft") + "</span>";
    return '<span class="stars' + (v === -1 ? " rej" : "") + '">' + (starText(v) || "&nbsp;") + "</span>" + s;
  }
  function thumb(f, cls, label, extra) {
    return '<li class="tile ' + (cls || "") + (r(f) === -1 ? " rejected" : "") + '"><button type="button" data-id="' + f.id + '" aria-label="' + esc(label) + '">' +
      '<div class="thumb"><img src="' + IMG + f.id + '-t.jpg" alt="" loading="lazy" width="480" height="320">' + (extra || "") + "</div>" +
      '<div class="meta">' + tileMeta(f) + "</div></button></li>";
  }
  function renderGrid() {
    var html = "";
    if (st.filter !== "all") {
      var fn = FILTERS.filter(function (x) { return x[0] === st.filter; })[0][2];
      var list = frames.filter(fn);
      html = list.map(function (f) { return thumb(f, "", fileName(f) + ", open in full view"); }).join("");
      if (!list.length) html = '<li class="hint">Nothing here yet.</li>';
      $("gridHint").textContent = list.length + " frame" + (list.length === 1 ? "" : "s");
    } else {
      $("gridHint").textContent = "Frames shot within a second of each other stack into bursts. Open one and pick the best frame.";
      S.bursts.forEach(function (bu, b) {
        var lead = bu.frames[bu.best], n = bu.frames.length;
        if (n === 1) html += thumb(lead, "", fileName(lead) + ", open in full view");
        else {
          html += '<li class="tile stack"><button type="button" data-burst="' + b + '" aria-expanded="' + (st.openBurst === b) + '" aria-label="Burst of ' + n + ' frames, ' + (st.openBurst === b ? "close" : "open") + '">' +
            '<div class="thumb"><img src="' + IMG + lead.id + '-t.jpg" alt="" loading="lazy" width="480" height="320"><span class="badge">' + n + "</span></div>" +
            '<div class="meta">' + tileMeta(lead) + "</div></button></li>";
          if (st.openBurst === b) {
            html += '<li class="burst-open"><div class="bh"><span>Burst of ' + n + ' · ' + lead.time + '</span><span class="why">Suggested: ' + fileName(lead).slice(-11, -4) + ", " + bu.bestWhy + "</span></div><ul class=\"row\" role=\"list\">" +
              bu.frames.map(function (f, i) { return thumb(f, i === bu.best ? "best" : "", fileName(f) + (i === bu.best ? ", suggested best frame" : "") + ", open in full view"); }).join("") + "</ul></li>";
          }
        }
      });
    }
    $("grid").innerHTML = html;
  }
  $("grid").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.burst != null) {
      var k = +b.dataset.burst; st.openBurst = st.openBurst === k ? null : k; renderGrid();
      var again = $("grid").querySelector('[data-burst="' + k + '"]'); if (again) again.focus();
      if (st.openBurst != null) say("burst", "The amber ring is my pick: " + S.bursts[k].bestWhy + ". You decide, though. Open a frame and press 4 if it's the one.");
    } else if (b.dataset.id) openLoupe(frames.filter(function (f) { return f.id === b.dataset.id; })[0]);
  });

  function showGrid() {
    st.view = "grid"; document.body.classList.remove("in-loupe"); $("loupeView").hidden = true; $("gridView").hidden = false;
    renderFilters(); renderGrid();
    if (st.cur) { var el = $("grid").querySelector('[data-id="' + st.cur.id + '"]') || $("grid").querySelector('[data-burst="' + st.cur.b + '"]'); if (el) el.focus(); }
  }

  // ---------- loupe ----------
  function openLoupe(f) {
    st.cur = f; st.view = "loupe"; document.body.classList.add("in-loupe"); $("gridView").hidden = true; $("loupeView").hidden = false;
    renderLoupe(); window.scrollTo(0, 0);
  }
  function renderLoupe() {
    var f = st.cur, bu = S.bursts[f.b];
    var img = $("photo"); img.src = IMG + f.id + ".jpg"; img.width = f.w; img.height = f.h;
    img.alt = (st.text[f.id] && st.text[f.id].alt) || "Frame " + fileName(f) + " from the observatory shoot.";
    $("bestTag").hidden = !(bu.frames.length > 1 && f.i === bu.best);
    $("bestTag").textContent = "Suggested best · " + bu.bestWhy;
    $("strip").innerHTML = bu.frames.length > 1 ? bu.frames.map(function (x, i) {
      return '<button type="button" role="listitem" data-i="' + i + '" aria-current="' + (x === f) + '" aria-label="Frame ' + (i + 1) + " of " + bu.frames.length + (i === bu.best ? ", suggested best" : "") + '"><img src="' + IMG + x.id + '-t.jpg" alt="">' + (i === bu.best ? '<span class="bd"></span>' : "") + "</button>";
    }).join("") : "";
    renderRating(); renderPanel(); renderFilters();
  }
  $("strip").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { st.cur = S.bursts[st.cur.b].frames[+b.dataset.i]; renderLoupe(); } });
  function renderRating() {
    var v = r(st.cur);
    [].forEach.call($("rbar").querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(+b.dataset.r === v && v !== 0)); });
    var m = MEANING[v] || MEANING[0];
    $("rmean").innerHTML = esc(v > 0 ? starText(v) + "  " + m[0] : m[0]) + "<small>" + esc(m[1]) + "</small>";
  }
  function setRating(v) {
    var f = st.cur; if (!f) return;
    if (v === 0) delete st.rating[f.id]; else st.rating[f.id] = v;
    renderRating(); renderFilters();
    if (v >= 3 && !hasDraft(f)) draft(f);
    else renderPanel();
    if (v === 4) say("r4", "Best of the shoot. Proof keeps an eye on that: more than about 10% of a shoot at 4 stars gets a gentle warning.");
    if (v === -1) say("rej", "Rejected. It stays on the card, it just drops out of every check.");
  }
  $("rbar").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setRating(+b.dataset.r); });

  // ---------- drafts ----------
  var drafting = null;
  function draft(f, next) {
    var bu = S.bursts[f.b], old = st.text[f.id], v = next ? ((old ? old.v : 0) + 1) % bu.drafts.length : 0;
    var kw = S.baseKeywords.concat(bu.kw);
    if (!st.brief.kent) kw = kw.filter(function (k) { return !/Kent/.test(k); });
    var cap = bu.drafts[v];
    if (!st.brief.kent) cap = cap.replace(/ at the (KSU|Kent State University) Observatory/, " at an observatory");
    st.text[f.id] = { cap: cap, alt: bu.alt, kw: kw, v: v };
    delete st.edited[f.id];
    drafting = f.id; renderPanel();
    setTimeout(function () {
      drafting = null; if (st.cur === f) renderPanel(); renderFilters();
      if (f.b === 0 && v === 0) say("slips", "Two blue marks in that caption: the style guide caught \"KSU\" and \"Nov 18.\" Fix them with one click, or type your own words and watch the checks run.");
      else say("draft1", "Drafts are amber until you edit them or press Accept. Nothing writes before that.");
    }, reduce ? 0 : 650);
  }
  $("draftBtn").addEventListener("click", function () { draft(st.cur); });
  $("redraftBtn").addEventListener("click", function () { draft(st.cur, true); });

  function paintField(key) {
    var f = st.cur, t = st.text[f.id], ta = $(key), hl = $(key + "Hl"), wrap = $(key + "Wrap"), ul = $(key + "Hits");
    var text = t[key], hits = check(text), out = "", p = 0;
    hits.forEach(function (h) { out += esc(text.slice(p, h.s)) + "<mark>" + esc(text.slice(h.s, h.e)) + "</mark>"; p = h.e; });
    hl.innerHTML = out + esc(text.slice(p)) + "\n";
    hl.scrollTop = ta.scrollTop;
    wrap.className = "hl-wrap " + (isWritten(f) ? "ok" : st.edited[f.id] ? "" : "ai");
    ul.innerHTML = hits.map(function (h, i) {
      return "<li><span><b>" + esc(h.found.trim() || h.found) + "</b> · " + esc(h.msg) + "</span>" +
        (h.fix != null ? '<button type="button" class="chip fix" data-k="' + key + '" data-i="' + i + '">' + (h.fix.trim() ? "Use “" + esc(h.fix.trim()) + "”" : "Remove") + "</button>" : "") + "</li>";
    }).join("");
    ul._hits = hits;
    return hits.length;
  }
  function renderPanel() {
    var f = st.cur; if (!f) return;
    $("fname").textContent = fileName(f);
    $("exif").textContent = f.time + " · " + f.exp + " · " + f.f + " · ISO " + f.iso + " · " + f.mm;
    var t = st.text[f.id];
    $("noDraft").hidden = !!t; $("draftArea").hidden = !t;
    if (!t) return;
    var busy = drafting === f.id;
    $("seen").innerHTML = S.bursts[f.b].seen.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    if (document.activeElement !== $("cap")) $("cap").value = busy ? "Drafting on the Mac…" : t.cap;
    if (document.activeElement !== $("alt")) $("alt").value = busy ? "" : t.alt;
    $("cap").disabled = $("alt").disabled = busy;
    var n = busy ? 0 : paintField("cap") + paintField("alt");
    if (busy) { $("capHl").innerHTML = ""; $("altHl").innerHTML = ""; $("capHits").innerHTML = $("altHits").innerHTML = ""; $("capWrap").className = $("altWrap").className = "hl-wrap ai"; }
    var w = isWritten(f);
    var ce = $("capState"); ce.className = w ? "ok" : st.edited[f.id] ? "edit" : "ai";
    ce.textContent = busy ? "drafting" : w ? "written" : st.edited[f.id] ? "edited by you" : "AI draft · " + (t.v + 1) + " of " + S.bursts[f.b].drafts.length;
    $("kw").innerHTML = t.kw.map(function (k) { return "<li>" + esc(k) + "</li>"; }).join("");
    $("credit").textContent = S.credit; $("rights").textContent = st.brief.kent ? S.rights : "© 2026 Rami Daud";
    $("loc").textContent = st.brief.kent ? S.location : "Observatory";
    var ab = $("acceptBtn");
    ab.disabled = busy;
    ab.innerHTML = (w ? "Written" : n ? "Accept with " + n + " style note" + (n > 1 ? "s" : "") : "Accept and write") + ' <span class="mono">⌘S</span>';
    $("written").hidden = !w;
    if (w) { $("xmpName").textContent = fileName(f).replace(".NEF", ".xmp"); $("xmp").textContent = xmp(f); }
  }
  function onType(key) {
    var f = st.cur, t = st.text[f.id]; if (!t) return;
    t[key] = $(key).value; st.edited[f.id] = true;
    renderPanel(); renderFilters();
  }
  ["cap", "alt"].forEach(function (k) {
    $(k).addEventListener("input", function () { onType(k); });
    $(k).addEventListener("scroll", function () { $(k + "Hl").scrollTop = $(k).scrollTop; });
  });
  ["capHits", "altHits"].forEach(function (id) {
    $(id).addEventListener("click", function (e) {
      var b = e.target.closest(".fix"); if (!b) return;
      var key = b.dataset.k, h = $(id)._hits[+b.dataset.i], t = st.text[st.cur.id];
      t[key] = t[key].slice(0, h.s) + h.fix + t[key].slice(h.e); st.edited[st.cur.id] = true;
      $(key).value = t[key]; renderPanel(); renderFilters();
      var next = $(id).querySelector(".fix"); (next || $(key)).focus();
      say("fixed", "Fixed. The rules live in an editable file, so the photo team can update them without a new version of the app.");
    });
  });

  // ---------- write ----------
  function xmp(f) {
    var t = st.text[f.id], v = r(f);
    return [
      "XMP-dc:Description            " + t.cap,
      "XMP-iptcCore:AltTextAccessibility  " + t.alt,
      "XMP-dc:Subject                " + t.kw.join(", "),
      "XMP-xmp:Rating                " + (v || 0),
      "XMP-iptcCore:Location         " + (st.brief.kent ? S.location : "Observatory"),
      "XMP-dc:Creator                " + S.credit,
      "XMP-photoshop:Credit          " + S.credit,
      "XMP-dc:Rights                 " + (st.brief.kent ? S.rights : "© 2026 Rami Daud"),
      "",
      "crs:* (develop settings)      untouched",
      "Backup                        previous sidecar copied first"
    ].join("\n");
  }
  function write() {
    var f = st.cur; if (!f || !st.text[f.id] || drafting) return;
    var t = st.text[f.id]; t.cap = $("cap").value; t.alt = $("alt").value;
    st.written[f.id] = snap(f); st.edited[f.id] = true;
    renderPanel(); renderFilters();
    var d = deliverables(), ok = d.filter(isReady).length;
    if (!isReady(f) && r(f) < 3) say("w-unrated", "Written. It won't count toward readiness until it has 3 stars or more.", true);
    else if (!isReady(f)) say("w-notes", "Written, but the style notes keep it out of the ready count. The person decides; Proof just won't pretend it passed.", true);
    else if (!st.said.loop) { st.said.loop = 1; say("loop", 'That’s the loop: pick, rate, check, approve, write. ' + ok + " of " + d.length + ' deliverables ready. Keep going, or <a href="../">read why Proof works this way</a>.', true); }
  }
  $("acceptBtn").addEventListener("click", write);
  $("backBtn").addEventListener("click", showGrid);

  // ---------- keys ----------
  document.addEventListener("keydown", function (e) {
    if (!$("brief").hidden || !$("about").hidden) { if (e.key === "Escape") { closeBrief(); closeAbout(); } return; }
    var typing = /TEXTAREA|INPUT/.test(document.activeElement.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (st.view === "loupe") write(); return; }
    if (typing) { if (e.key === "Escape") document.activeElement.blur(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (st.view === "loupe") {
      var f = st.cur, idx = frames.indexOf(f);
      var map = { "3": 3, "4": 4, "5": 5, "0": 0, x: -1, X: -1 };
      if (e.key in map) { setRating(map[e.key]); e.preventDefault(); }
      else if (e.key === "ArrowRight" && idx < frames.length - 1) { st.cur = frames[idx + 1]; renderLoupe(); e.preventDefault(); }
      else if (e.key === "ArrowLeft" && idx > 0) { st.cur = frames[idx - 1]; renderLoupe(); e.preventDefault(); }
      else if (e.key === "ArrowDown" && f.b < S.bursts.length - 1) { var nb = S.bursts[f.b + 1]; st.cur = nb.frames[nb.best]; renderLoupe(); e.preventDefault(); }
      else if (e.key === "ArrowUp" && f.b > 0) { var pb = S.bursts[f.b - 1]; st.cur = pb.frames[pb.best]; renderLoupe(); e.preventDefault(); }
      else if (e.key === "Escape" || e.key === " ") { showGrid(); e.preventDefault(); }
    }
  });

  // ---------- Pixel ----------
  var bubble = $("bubble"), bubbleTimer;
  function say(key, html, force) {
    if (key && st.said[key] && !force) return;
    if (key) st.said[key] = 1;
    bubble.innerHTML = html; bubble.hidden = false;
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(function () { bubble.hidden = true; }, 9000);
  }
  var TIPS = {
    grid: ["Click a stack to open a burst. I mark the frame I'd pick and say why.", "Previews come from inside each raw file, so 400 frames scroll without waiting.", "Try the filters up top: Needs caption is where the work is."],
    loupe: ["3, 4 and 5 rate. X rejects. Arrow keys move through every frame.", "I only use names you give me in the brief. I never guess from faces.", "Type anything with “KSU” or “&” in it and watch the style guide catch it.", "Redraft gives you a different angle. You can always just write your own."]
  };
  var tipN = 0;
  var px = $("pixel"), dock = $("pixelDock"), eyes = px.querySelector(".eyes");
  document.addEventListener("pointermove", function (e) {
    var rc = px.getBoundingClientRect(), dx = e.clientX - (rc.left + rc.width / 2), dy = e.clientY - (rc.top + rc.height / 2), d = Math.hypot(dx, dy) || 1;
    eyes.style.setProperty("--lx", (dx / d * Math.min(5, d / 40)).toFixed(1) + "px");
    eyes.style.setProperty("--ly", (dy / d * Math.min(4, d / 50)).toFixed(1) + "px");
  });
  var drag = null;
  px.addEventListener("pointerdown", function (e) { var rc = dock.getBoundingClientRect(); drag = { x: e.clientX, y: e.clientY, r: rc.right, b: rc.bottom, moved: false }; px.setPointerCapture(e.pointerId); });
  px.addEventListener("pointermove", function (e) {
    if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (drag.moved) {
      dock.classList.add("moved");
      dock.style.right = Math.max(4, Math.min(innerWidth - 60, innerWidth - drag.r - dx)) + "px";
      dock.style.bottom = Math.max(4, Math.min(innerHeight - 70, innerHeight - drag.b - dy)) + "px";
    }
  });
  px.addEventListener("pointerup", function () { var moved = drag && drag.moved; drag = null; if (!moved) { var l = TIPS[st.view]; say(null, l[tipN++ % l.length]); } });
  px.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); var l = TIPS[st.view]; say(null, l[tipN++ % l.length]); } });

  // ---------- brief (scripted chat with Pixel) ----------
  var STEPS = [
    { q: "Hi, I'm Pixel. What was the shoot?", a: [["Observatory night", function () { st.brief.event = "Observatory night"; }]] },
    { q: "Where was it?", a: [["Kent State University Observatory", function () { st.brief.place = S.location; }]] },
    { q: "Who's it for?", a: [["Social team", 0], ["Photo archive", 0], ["Just me", 0]], set: "forWho" },
    { q: "Is this a Kent State shoot? Outside work turns off the university's name, style rules and copyright.", a: [["Yes, Kent State", function () { st.brief.kent = true; }], ["No, outside work", function () { st.brief.kent = false; }]] },
    { q: "Who's in the photos?", a: [["Leave everyone unnamed", 0]] }
  ];
  var stepN = 0;
  function chat(cls, text) { var li = document.createElement("li"); li.className = cls; li.textContent = text; $("chat").appendChild(li); $("chat").scrollTop = 1e6; }
  function nextStep() {
    var s = STEPS[stepN];
    if (!s) {
      chat("px", "Got it. No names, so captions stay nameless. I'll draft when you rate a frame 3 or higher.");
      $("replies").innerHTML = '<button type="button" class="chip" id="toGrid">Open the shoot</button>';
      $("toGrid").addEventListener("click", closeBrief); $("toGrid").focus();
      return;
    }
    setTimeout(function () {
      chat("px", s.q);
      $("replies").innerHTML = s.a.map(function (a, i) { return '<button type="button" class="chip" data-i="' + i + '">' + esc(a[0]) + "</button>"; }).join("");
      var first = $("replies").querySelector("button"); if (first) first.focus();
    }, reduce || stepN === 0 ? 0 : 350);
  }
  $("replies").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]"); if (!b) return;
    var s = STEPS[stepN], a = s.a[+b.dataset.i];
    chat("me", a[0]); if (typeof a[1] === "function") a[1](); if (s.set) st.brief[s.set] = a[0];
    $("replies").innerHTML = ""; stepN++; nextStep();
  });
  function closeBrief() {
    if ($("brief").hidden) return;
    $("brief").hidden = true;
    $("shootTitle").textContent = st.brief.kent ? "Observatory night" : "Observatory night (outside work)";
    showGrid(); $("stage").focus();
    setTimeout(function () { say("hello", "Ten bursts from Nov. 18. Open a stack, pick a frame, and rate it."); }, 400);
  }
  $("skipBrief").addEventListener("click", closeBrief);

  // ---------- about ----------
  function closeAbout() { if (!$("about").hidden) { $("about").hidden = true; $("aboutBtn").focus(); } }
  $("aboutBtn").addEventListener("click", function () { $("about").hidden = false; $("closeAbout").focus(); });
  $("closeAbout").addEventListener("click", closeAbout);
  $("about").addEventListener("click", function (e) { if (e.target === $("about")) closeAbout(); });

  // ---------- start ----------
  $("shootName").textContent = S.name + " · " + frames.length + " frames";
  renderFilters(); renderGrid(); nextStep();
})();
