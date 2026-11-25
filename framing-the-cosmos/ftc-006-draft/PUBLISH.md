# FTC-006 publish checklist

The page is built and hidden (`noindex`, not linked from the home page, Writing list or Sheet 03A). FTC-005 already links to it on this branch, so merge this branch only on publish day.

## When the essay arrives

- [ ] Replace the three `.todo` blocks in `index.html` with the essay (first half, second half, closing).
- [ ] Add the pull quote once the speaker is confirmed (template in the second `.todo` block).
- [ ] Delete the `.todo` rules at the bottom of `ftc-006.css`.
- [ ] Replace every `[Title]` / `[Title to come]` in `index.html` (title, og:title, JSON-LD headline, h1, series list) and in the FTC-005 page (series list and "Where to next"). Italicize one phrase in the h1 with `<em>` if the title has one.
- [ ] Confirm the meta description (draft is in place).
- [ ] Confirm the credit line wording and TJ's name in the Fig. 1 caption.
- [ ] Confirm naming Abe (he is named in the Fig. 1 caption track).

## Publish day

- [ ] `git mv framing-the-cosmos/ftc-006-draft framing-the-cosmos/ftc-006-<slug>` and replace `ftc-006-draft` everywhere (`grep -rl ftc-006-draft . | xargs sed -i 's/ftc-006-draft/ftc-006-<slug>/g'`).
- [ ] Remove the `noindex` line and the DRAFT comment from the head.
- [ ] Fill `Published [date]` in the title block; add `article:published_time` and `datePublished` / `uploadDate`.
- [ ] Add the entry to `assets/data/writing.json` and rebuild with `tools/build-writing.py`; update the home page "Latest" spots and covers (add a cover image to `assets/ftc/covers/`).
- [ ] Optional: add FTC-006 to the series lists on FTC-001 to FTC-004.
- [ ] Delete this file, merge, then check posters, captions and dark mode on a phone.
- [ ] Next day: Substack with "Originally published at ramidaud.com". Then the Instagram reels (part 2 first), with "about 24,500 video frames" in the captions.
