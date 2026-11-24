--[[ Publish to Web Gallery
     A Lightroom Classic publish service with a caption loop.
     1. Send selected photos for caption drafts (small proofs + what Lightroom knows).
     2. An assistant writes drafts.json. Load it: drafts land in Web Gallery fields, not your captions.
     3. Review, edit, Approve. Only then do drafts become your real caption, title and keywords.
     4. Publish. Photos without a caption are held back.
     By Rami Daud. Built with Claude. MIT license. ]]
return {
  LrSdkVersion = 10.0,
  LrSdkMinimumVersion = 6.0,
  LrToolkitIdentifier = "com.ramidaud.webgallery",
  LrPluginName = "Publish to Web Gallery",
  LrPluginInfoUrl = "https://ramidaud.com/work/lightroom-archive/",
  LrExportServiceProvider = { title = "Web Gallery", file = "WebGalleryServiceProvider.lua" },
  LrMetadataProvider = "WebGalleryMetadata.lua",
  LrMetadataTagsetFactory = "WebGalleryTagset.lua",
  LrLibraryMenuItems = {
    { title = "Web Gallery: Send selected for caption drafts...", file = "SendForDrafts.lua" },
    { title = "Web Gallery: Load caption drafts...", file = "LoadDrafts.lua" },
    { title = "Web Gallery: Approve drafts for selected photos", file = "ApproveDrafts.lua" },
  },
  VERSION = { major = 0, minor = 2, revision = 1, build = 4 },
}
