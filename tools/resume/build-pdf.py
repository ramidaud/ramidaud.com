import sys
from playwright.sync_api import sync_playwright
src, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto("file://" + src); pg.wait_for_timeout(800)
    pg.pdf(path=out, format="Letter", print_background=True, margin={"top":"0","bottom":"0","left":"0","right":"0"})
    b.close()
