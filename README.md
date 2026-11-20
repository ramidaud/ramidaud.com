# ramidaud.com

Personal site for Rami Daud. Plain HTML, CSS and JS, hosted on GitHub Pages.

## Home page: Version 7, the drawing set

- `index.html` is the whole drawing set: the camera, its eight parts and every sheet (AI in Practice, Projects, Writing, Photography, About, Record, Bill of materials). Sheets open by hash, for example `#cosmos` for Framing the Cosmos (Sheet 03A).
- Its styles and scripts live inside `index.html`. The 3D camera uses three.js r128 from cdnjs; the Midlife Survivors models are in `assets/models/`.
- `versions/v7.html` now forwards to the home page, keeping any `#sheet`. Versions 3 to 6 stay in `versions/` as an archive and are no longer linked.

## Framing the Cosmos

- Series hub: Sheet 03A on the home page. `framing-the-cosmos/` forwards there.
- Each story is its own page at `framing-the-cosmos/ftc-00N-slug/`, wearing the Version 7 sheet:
  - `assets/css/v7-shell.css`: the frame, menu, Detail A and sheet list, copied from `index.html`. If the home page's tokens or frame change, change them here too.
  - `assets/css/ftc.css` and `assets/js/ftc.js`: what every story shares (sheet head, reading column, figures, title block, series list, theme toggle).
  - One small stylesheet next to each story for its own art direction.
  - Media in `assets/ftc/`.

## Older inner pages

`writing/`, `guides/`, `cv/`, `contact/` and `work/` still use the earlier design: `assets/css/e1.css`, `assets/css/e1-pages.css` and `assets/js/e1.js`.

## Content rules

- Writing index: `assets/data/writing.json` feeds the Writing page.
- `assets/img/photos/` web exports only: sRGB, 2400 px long edge, about 300 to 500 KB.
- Full-resolution files, drafts and Resolve exports live in `../ramidaud-source/`, never in this repo.
- Video: short reels under about 10 MB can be self-hosted (as in `assets/astro/` and `assets/ftc/`); anything longer goes on Vimeo.
- All external links open in a new window, with a hidden "(opens in a new window)" note for screen readers. No em dashes.

Preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000
