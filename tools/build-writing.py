"""Render the Writing sheet (Sheet 04) on the home page from assets/data/writing.json,
so the sheet and every other list agree. Run after editing the JSON:  python3 tools/build-writing.py"""
import json, html, re
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(ROOT + "/assets/data/writing.json"))
items = sorted([i for i in d["items"] if not i.get("draft")], key=lambda i: i["date"], reverse=True)
T = d["threads"]
MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
def when(i):
    if i.get("display"): return i["display"]
    y, m, dd = i["date"].split("-"); return f"{MON[int(m)-1]} {int(dd)}, {y}"
def a(url, text):
    e = html.escape(text, quote=False)
    if url.startswith("http"): return f'<a href="{html.escape(url)}" target="_blank" rel="noopener">{e}<span class="sr"> (opens in a new window)</span></a>'
    return f'<a href="{html.escape(url)}">{e}</a>'
def row(i, hidden=False):
    wm = html.escape(i["type"]) + ("" if i["venue"] == i["type"] else " · " + html.escape(i["venue"]))
    wm += "".join(" · " + a(x["url"], x["venue"]) for x in i.get("also", []))
    dek = f'<span class="dek">{html.escape(i["dek"], quote=False)}</span>' if i.get("dek") else ""
    lab = T[i["thread"]]["label"]
    return f'<li data-thread="{i["thread"]}"{" hidden" if hidden else ""}><time class="mono" datetime="{i["date"]}">{when(i)}</time><span class="wt">{a(i["url"], i["title"])}{dek}<span class="wm">{wm}</span></span><span class="wth">{html.escape(lab)}</span></li>'
dev = [i for i in items if i["thread"] == "midlife-survivors"]
rest = [i for i in items if i["thread"] != "midlife-survivors"]
out = []
roll_done = False
for i in rest:
    if dev and not roll_done and i["date"] < dev[0]["date"]:
        out.append(f'<li data-thread="ms-roll" class="roll"><time class="mono" datetime="{dev[0]["date"]}">{when(dev[0])}</time><span class="wt">{a("https://midlifesurvivors.com/devlog/", "Midlife Survivors devlog")}<span class="dek">{len(dev)} entries since Oct 30, 2026. Latest: {html.escape(dev[0]["title"], quote=False)}</span><span class="wm"><button type="button" class="showdev" data-f="midlife-survivors">Show all {len(dev)} entries</button></span></span><span class="wth">Midlife Survivors</span></li>')
        out += [row(x, True) for x in dev]; roll_done = True
    out.append(row(i))
counts = {}
for i in items: counts[i["thread"]] = counts.get(i["thread"], 0) + 1
chips = f'<button type="button" class="chip" data-f="all" aria-pressed="true">All <span>{len(items)}</span></button>' + "".join(
    f'<button type="button" class="chip" data-f="{k}" aria-pressed="false">{html.escape(T[k]["label"])} <span>{counts[k]}</span></button>' for k in T if counts.get(k))
t = open(ROOT + "/index.html").read()
t = re.sub(r'(<ol class="wlist" id="wlist">).*?(</ol>)', lambda m: m.group(1) + "".join(out) + m.group(2), t, count=1, flags=re.S)
t = re.sub(r'(<div class="chips" role="group" aria-label="Filter by thread">).*?(</div>)', lambda m: m.group(1) + chips + m.group(2), t, count=1, flags=re.S)
t = re.sub(r'<p>\d+ pieces across Substack', f'<p>{len(items)} pieces across Substack', t, count=1)
open(ROOT + "/index.html", "w").write(t)
print(len(items), counts)
