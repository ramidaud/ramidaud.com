# Publish to Web Gallery

A Lightroom Classic publish service for photographers who keep their captions in Lightroom.
Each published collection becomes a folder of web-sized JPEGs and one `gallery.json` file
(title, caption, alt text, date, keywords, credit). A website, or an AI assistant, reads that file.

**A person signs off on every photo.** A photo with no caption is held back and stays in
"Modified Photos to Re-Publish" until someone writes one. Alt text can be required too.

No internet connection, no account, no live link into your catalog.

Version 0.1.1 · By Rami Daud · Built with Claude · MIT license

## Install (about 2 minutes)

1. Unzip `WebGallery.lrplugin` somewhere you'll keep it (for example Documents/Lightroom Plugins).
2. In Lightroom Classic: **File → Plug-in Manager → Add**, choose `WebGallery.lrplugin`, then **Done**.

## Set it up

1. In the Library module, find **Web Gallery** in the **Publish Services** panel (bottom left) and click **Set Up...**
2. **Web gallery:** choose the folder your galleries go in (for example Desktop/ramidaud-web). Leave "Hold back photos without a caption" on.
3. **Image Sizing:** Resize to Fit, Long Edge, 2400 pixels. **File Settings:** quality 80.
4. **Metadata:** All Except Camera Raw Info, with **Remove Person Info** and **Remove Location Info** checked.
5. **Save.**

## Publish a gallery

1. Right-click **Web Gallery → Create Published Smart Collection** (or a plain published collection and drag photos in).
2. Name it the way the gallery should read, for example **NASA**. The folder will be `nasa`.
3. Click **Publish**. If anything is held back, Lightroom says which photos need a caption.

Change a caption, title or keyword later and the photo moves to "Modified Photos to Re-Publish."
Remove a photo from the collection and it leaves the folder at the next publish.

## What's in a gallery folder

```
nasa/
  gallery.json                     every photo, oldest first
  20170821134512-48211.jpg         the photo
  20170821134512-48211.json        its title, caption, alt text, date, keywords
```

## Using it with Claude

The `web-gallery` skill in this folder tells Claude how to read a gallery folder, flag photos that
are missing alt text, draft alt text for a person to approve, and build a web page from
`gallery.json`. Claude never writes back into your catalog.
