# Resume source

`resume.html` is the source for `downloads/Rami-Daud-Resume.pdf` (US Letter, two pages).

Rebuild after editing:

```
python3 tools/resume/build-pdf.py "$PWD/tools/resume/resume.html" "$PWD/downloads/Rami-Daud-Resume.pdf"
```

Needs Python with Playwright and Chromium. Fonts (Instrument Serif, IBM Plex Sans, IBM Plex Mono) are in `fonts/` under the SIL Open Font License.

Keep it at two pages: cut words before shrinking type.
