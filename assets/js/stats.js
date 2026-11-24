/* Visit counting with GoatCounter (ramidaud.goatcounter.com): no cookies, no personal data.
   Load this before //gc.zgo.at/count.js. */
(function () {
  var embedded = /[?&]embed=1\b/.test(location.search) || window.self !== window.top;
  window.goatcounter = {
    /* The home page's frame on inner pages is not a visit. */
    no_onload: embedded,
    /* Home sheets live in the hash (#practice); count each as its own page, like /sheet/practice. */
    path: function (p) {
      var h = location.hash.replace(/^#/, "").split("/")[0];
      return (location.pathname === "/" || /\/index\.html$/.test(location.pathname)) && h ? "/sheet/" + h : p;
    }
  };
  var RD = window.RD || (window.RD = {});
  RD.track = function (name, title) {
    if (embedded) return;
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: title || name, event: true }); } catch (e) {}
  };
  if (embedded) return;
  /* A new sheet opened on the home page counts as a page view. */
  var last = null;
  window.addEventListener("hashchange", function () {
    var h = location.hash.replace(/^#/, "").split("/")[0];
    if (!h || h === last || !(window.goatcounter && window.goatcounter.count)) return;
    last = h;
    try { window.goatcounter.count({ path: "/sheet/" + h, title: "Sheet: " + h }); } catch (e) {}
  });
  /* Downloads, email and links out to other sites, counted as events. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^mailto:/i.test(href)) return RD.track("email-click", "Email link");
    if (/\.pdf(\?|#|$)/i.test(href)) return RD.track("download-" + href.split("/").pop().split(/[?#]/)[0], "Download");
    if (/^https?:\/\//i.test(href)) {
      try { var u = new URL(href); if (u.hostname.replace(/^www\./, "") !== location.hostname.replace(/^www\./, "")) RD.track("out-" + u.hostname.replace(/^www\./, ""), "Link out"); } catch (err) {}
    }
  }, true);
})();
