/* Inner pages: swap the Detail A still for the live camera from the home page, so the drawing keeps
   its slow motion and can be turned and clicked the same way everywhere on the site.
   The still stays underneath until the live drawing has loaded, and stays put if WebGL isn't available. */
(function () {
  "use strict";
  var view = document.querySelector(".camslot .dv-view");
  if (!view || view.classList.contains("live")) return;
  try { var c = document.createElement("canvas"); if (!(c.getContext("webgl") || c.getContext("experimental-webgl"))) return; } catch (e) { return; }
  var me = document.currentScript && document.currentScript.src;
  var base = me ? me.replace(/assets\/js\/detail-live\.js.*$/, "") : "/";
  var MAP = { "01": "archive", "02": "guide", "03": "cosmos", "04": "photo", "05": "field", "06": "game", "07": "splat", "08": "about" };
  var ids = Array.prototype.map.call(document.querySelectorAll(".dv-legend i"), function (i) { return MAP[i.textContent.trim()]; }).filter(Boolean);
  var nums = Array.prototype.map.call(document.querySelectorAll(".dv-legend i"), function (i) { return i.textContent.trim(); });

  var box = document.createElement("div");
  box.className = "dv-view live";
  Array.prototype.forEach.call(view.querySelectorAll("img"), function (img) { box.appendChild(img); });
  var frame = document.createElement("iframe");
  frame.src = base + "?embed=1&parts=" + (ids.join(",") || "cosmos,game");
  frame.title = "3D drawing of the camera" + (nums.length ? ", part " + nums.join(" and ") + " highlighted" : "") + ". Drag to turn it; click a part to open it.";
  frame.setAttribute("loading", "eager");
  frame.addEventListener("load", function () { setTimeout(function () { box.classList.add("ready"); }, 250); });
  box.appendChild(frame);
  var back = document.createElement("a");
  back.className = "back";
  back.href = view.getAttribute("href") || base + "#camera";
  back.textContent = "Back to the camera";
  box.appendChild(back);
  view.parentNode.replaceChild(box, view);
})();
