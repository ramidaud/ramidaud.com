-- Web Gallery fields, shown in the Metadata panel (choose the "Web Gallery" preset).
-- Drafts live here until a person approves them. Smart collections can filter on Gallery status.
return {
  metadataFieldsForPhotos = {
    {
      id = "wgStatus", title = "Gallery status", dataType = "enum", searchable = true, browsable = true,
      -- Blank means not started. No nil entry: older Lightroom versions reject it.
      values = {
        { value = "sent", title = "Sent for drafts" },
        { value = "drafted", title = "Draft waiting for review" },
        { value = "approved", title = "Approved" },
        { value = "rejected", title = "Not for the web" },
      },
    },
    { id = "wgDraftTitle", title = "Draft title", dataType = "string", searchable = true },
    { id = "wgDraftCaption", title = "Draft caption", dataType = "string", searchable = true },
    { id = "wgDraftAlt", title = "Draft alt text", dataType = "string", searchable = true },
    { id = "wgDraftKeywords", title = "Draft keywords", dataType = "string", searchable = true },
    { id = "wgDraftNotes", title = "Draft notes", dataType = "string", searchable = true },
    { id = "wgAlt", title = "Alt text (approved)", dataType = "string", searchable = true },
  },
  schemaVersion = 1,
}
