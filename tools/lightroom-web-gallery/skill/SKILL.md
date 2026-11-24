---
name: web-gallery
description: Turn a folder made by the "Publish to Web Gallery" Lightroom Classic plugin into a web gallery, checking captions and alt text first. Use when someone shares or connects a gallery folder with a gallery.json, or asks to build, update or check a photo gallery published from Lightroom.
---

# Web gallery from Lightroom

The photographer decides what is in the gallery and what each caption says. Your job is to check,
format and build. Never invent facts about a photo.

## 1. Read the folder
- Open `gallery.json`. Each item has `file`, `title`, `caption`, `alt`, `date`, `keywords`, `credit`.
- Confirm every `file` exists next to it. Report missing files by name.

## 2. Check before building
Make a short table for the photographer:
- **Missing alt text:** list the files. Draft alt text for each from the image itself and its caption,
  one plain sentence, no "image of." Mark every draft **Draft, needs approval**. Do not publish drafts.
- **Captions that name people:** list them so the photographer can confirm names and permission.
- **Dates or places the caption and keywords disagree on:** flag, don't fix.

Wait for approval of the drafts. Approved alt text goes back into Lightroom by the photographer
(Metadata panel), then they publish again. Do not write to the catalog yourself.

## 3. Build
- Make two web sizes per photo: the 2400 px original and an 800 px thumbnail.
- Write the page from `gallery.json`: title, caption under each photo, `alt` from the file,
  credit line, and the date.
- Keep the gallery's order (oldest first) unless the photographer asks for another.
- Strip nothing the photographer kept; add nothing they didn't write, except approved alt text.

## 4. Report
Say how many photos went in, how many were held for alt text, and what the photographer still
needs to approve. Label any text you drafted as drafted with AI.
