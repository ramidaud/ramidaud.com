-- "Web Gallery" preset for the Metadata panel: the real fields next to the drafts.
return {
  id = "webGalleryTagset",
  title = "Web Gallery",
  items = {
    "com.adobe.filename",
    "com.adobe.dateCreated",
    "com.adobe.separator",
    { "com.ramidaud.webgallery.wgStatus", label = "Status" },
    "com.adobe.separator",
    { "com.adobe.title", label = "Title" },
    { "com.adobe.caption", label = "Caption" },
    { "com.ramidaud.webgallery.wgAlt", label = "Alt text" },
    "com.adobe.separator",
    { formatter = "com.adobe.label", label = "Drafts (not public until you approve)" },
    { "com.ramidaud.webgallery.wgDraftTitle", label = "Draft title" },
    { "com.ramidaud.webgallery.wgDraftCaption", label = "Draft caption", height_in_lines = 4 },
    { "com.ramidaud.webgallery.wgDraftAlt", label = "Draft alt text", height_in_lines = 2 },
    { "com.ramidaud.webgallery.wgDraftKeywords", label = "Draft keywords" },
    { "com.ramidaud.webgallery.wgDraftNotes", label = "Notes and sources", height_in_lines = 3 },
  },
}
