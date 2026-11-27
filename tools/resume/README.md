# Resume source

`resume.html` is the source for `downloads/Rami-Daud-Resume.pdf` (US Letter, two pages).

Rebuild after editing:

```
python3 tools/resume/build-pdf.py "$PWD/tools/resume/resume.html" "$PWD/downloads/Rami-Daud-Resume.pdf"
```

Needs Python with Playwright and Chromium. One-time setup on a new Mac, from the repo root:

```
python3 -m venv ~/.venvs/resume
```
```
~/.venvs/resume/bin/pip install playwright
```
```
~/.venvs/resume/bin/python -m playwright install chromium
```

Then build with the venv's Python instead of `python3`:

```
~/.venvs/resume/bin/python tools/resume/build-pdf.py "$PWD/tools/resume/resume.html" "$PWD/downloads/Rami-Daud-Resume.pdf"
```

Check the result is still two pages before committing. Fonts (Instrument Serif, IBM Plex Sans, IBM Plex Mono) are in `fonts/` under the SIL Open Font License.

Keep it at two pages: cut words before shrinking type.
