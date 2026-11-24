---
name: web-gallery
description: Draft captions, keywords and alt text for a "Publish to Web Gallery" batch from Lightroom Classic, and build web galleries from its published folders. Use when someone asks to draft captions for a Web Gallery batch (a _drafts folder with manifest.json), or to build, update or check a gallery folder with gallery.json.
---

# Web Gallery: drafts for a person to approve, then galleries

The photographer decides what is true and what goes out. You draft, check and format.
Nothing you write reaches their catalog until they press Approve in Lightroom.

## A. Drafting a batch (`<gallery folder>/_drafts/<batch>/`)

1. Read `manifest.json`. Each photo has `id`, `uuid`, `proof` (a 1200 px JPEG), `fileName`, `folder`,
   `captureDate`, `title`, `headline`, `caption`, `keywords`, `city`, `state`, `country`, `camera`.
2. Look at every proof. Then gather facts from what the photographer already recorded:
   folder names (they often hold the event and date), file names, existing keywords, the date.
   If the folder or keywords point to a public page about the same event (for example a NASA
   Image of the Day), read it and cite it in `notes`.
3. Write `drafts.json` next to the manifest:
   ```json
   { "batch": "<batch>", "drafts": [
     { "uuid": "...", "id": "123", "title": "...", "caption": "...", "alt": "...",
       "keywords": ["...", "..."], "notes": "Sources and anything uncertain." } ] }
   ```
   - **Caption:** one or two sentences, newsroom style: who or what, where, when. Facts only from
     the photographer's metadata or a cited source.
   - **Title:** short, plain.
   - **Alt text:** one sentence describing what a sighted reader sees. No "image of."
   - **Keywords:** 4 to 8, the words people would search for.
   - **Never name a person** unless the name is already in their metadata or a cited source.
     Write a role instead ("an engineer").
   - **Anything you can't confirm gets `[?]`** right after it. Lightroom refuses to approve a draft
     with `[?]` until a person resolves it.
4. Tell the photographer how many drafts you wrote, how many carry `[?]`, and which sources you used.
   Then: in Lightroom, **Library > Plug-in Extras > Web Gallery: Load caption drafts**, pick this
   `drafts.json`, review in the Metadata panel's **Web Gallery** preset, and **Approve**.

## B. Building a gallery (`<gallery folder>/<collection>/gallery.json`)

1. Read `gallery.json`. Each photo has `file`, `title`, `caption`, `alt`, `date`, `keywords`, `credit`.
   Confirm every file exists.
2. List photos missing `alt`; draft alt text for them as in A and say it needs approval in Lightroom.
3. Make an 800 px thumbnail per photo, keep the 2400 px original, and build the page in the gallery's
   order with the caption under each photo, `alt` on each image, and the credit line.
4. Label anything you drafted as drafted with AI.
